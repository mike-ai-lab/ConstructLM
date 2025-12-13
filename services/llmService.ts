
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel } from "./modelRegistry";
import { streamGemini } from "./geminiService";
import { streamLocalModel } from "./localModelService";
import { ragService } from "./ragService";

// --- System Prompt Construction ---
// Explicitly define a persona to fix "minimal answer" issues.
export const constructBaseSystemPrompt = () => {
  return `
You are ConstructLM, a Senior Construction Analyst and Quantity Surveyor with 15+ years of experience.
Your expertise spans project costing, material management, technical specifications, and construction planning.

RESPONSE STYLE:
- **Comprehensive & Detailed:** Provide thorough analysis with context, reasoning, and examples. Use headers, bullet points, and structured formatting.
- **Professional Tone:** Technical, precise, and authoritative. Avoid vague or minimal answers.
- **Always Cite:** Every factual claim MUST be backed by evidence from the provided files using proper citation format.

CITATION REQUIREMENTS:
1. **Format:** Use EXACTLY this format: {{citation:FileName|Location|Quote}}
   - FileName: The exact file name (e.g., test-boq.csv, Specifications.pdf)
   - Location: Sheet name and row for Excel, or Page number for PDF (e.g., "Sheet: BOQ_Items, Row 7" or "Page 42")
   - Quote: The actual text/value from the source (e.g., "Painting with emulsion paint" or "Concrete strength: 30MPa")

2. **Excel Citations:** {{citation:test-boq.csv|Sheet: BOQ_Items, Row 7|Painting with emulsion paint}}
3. **PDF Citations:** {{citation:Specifications.pdf|Page 42|Concrete strength shall be 30MPa}}

4. **Placement:** Place citations immediately after the relevant claim or data point.
5. **Frequency:** Cite every specific number, value, item name, or technical specification from the files.
6. **No Hallucination:** If information is not in the files, explicitly state "This information is not available in the provided files."

RESPONSE STRUCTURE:
- Start with a clear overview or summary
- Use ### Headers for major sections
- Use **bold** for key terms and **bullet points** for lists
- Include detailed explanations and reasoning
- End with a summary or recommendations if applicable

CRITICAL: Do NOT skip citations. Every data point from the files must have a citation.
`;
};

// --- Generic Message Handler ---
export const sendMessageToLLM = async (
  modelId: string,
  history: Message[],
  newMessage: string,
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
    const model = getModel(modelId);

    // Try to get relevant context from RAG if available
    let ragContext = '';
    try {
        const ragResults = await ragService.searchRelevantChunks(newMessage, 5);
        if (ragResults.length > 0) {
            ragContext = '\n\nRELEVANT CONTEXT FROM DOCUMENTS:\n' + 
                ragResults.map((result, i) => 
                    `[${i + 1}] From ${result.chunk.fileName}: ${result.chunk.content}`
                ).join('\n\n');
        }
    } catch (error) {
        console.log('[RAG] Search failed, continuing without RAG context:', error);
    }

    const systemPrompt = constructBaseSystemPrompt() + ragContext;

    // Dispatch to provider
    try {
        if (model.provider === 'local') {
            // Local model via Ollama
            const localModel = model as any;
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
                    .filter(m => !m.isStreaming && m.id !== 'intro' && m.role !== 'model')
                    .map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: newMessage }
            ];
            
            // Add file context for local models
            const fileContext = activeFiles
                .map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`)
                .join('\n\n');
            
            if (fileContext) {
                messages[messages.length - 1].content += `\n\n${fileContext}`;
            }
            
            return await streamLocalModel(localModel.modelName, messages, onStream);
        } else if (model.provider === 'google') {
            // Google Gemini
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            return await streamGemini(model.id, apiKey, history, newMessage, systemPrompt, activeFiles, onStream);
        } else if (model.provider === 'openai' || model.provider === 'groq') {
            // OpenAI or Groq
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            const fullContextPrompt = constructStatelessPrompt(activeFiles, systemPrompt);
            return await streamOpenAICompatible(model, apiKey, history, newMessage, fullContextPrompt, onStream);
        } else {
            throw new Error(`Provider ${model.provider} not implemented yet.`);
        }
    } catch (error: any) {
        const errMsg = error.message || "";
        
        if (errMsg.includes("413") || errMsg.includes("too large") || errMsg.includes("TPM") || errMsg.includes("tokens")) {
            throw new Error(
                `**Capacity Limit Reached:** The free version of **${model.name}** cannot read this much text at once.\n\n` +
                `**Recommendation:** Switch to a local model or **Gemini 2.5 Flash** or select fewer files.`
            );
        }
        
        if (errMsg.includes("401") || errMsg.includes("key")) {
             throw new Error(`**Authentication Error:** The API Key for ${model.name} appears to be invalid.`);
        }

        if (errMsg.includes("Connection refused") || errMsg.includes("localhost")) {
            throw new Error(
                `**Local Model Error:** Ollama is not running.\n\n` +
                `Make sure Ollama is installed and running on http://localhost:11434`
            );
        }

        throw error;
    }
};

// Fallback for non-Gemini models (Stateless)
const constructStatelessPrompt = (files: ProcessedFile[], baseSystemPrompt: string) => {
    const activeContext = files
        .map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`)
        .join('\n\n');
        
    return `${baseSystemPrompt}\n\nACTIVE FILE CONTEXT:\n${activeContext}`;
};

// --- OpenAI / Groq Generic Streamer ---
const streamOpenAICompatible = async (
    model: ModelConfig,
    apiKey: string,
    history: Message[],
    newMessage: string,
    systemPrompt: string,
    onStream: (chunk: string) => void
) => {
    // Standard stateless reconstruction of history
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history
            .filter(m => !m.isStreaming && m.id !== 'intro' && m.role !== 'model') 
            .map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: newMessage }
    ];

    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    if (model.provider === 'groq') {
        baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: messages,
                stream: true,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`API Error ${response.status}: ${err.error?.message || response.statusText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            onStream(content);
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[${model.provider}] Error:`, error);
        throw error;
    }
};
