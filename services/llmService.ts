
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel } from "./modelRegistry";
import { sendMessageToGemini } from "./geminiService";
import { streamLocalModel } from "./localModelService";
import { ragService } from "./ragService";

// --- System Prompt Construction ---
export const constructBaseSystemPrompt = (hasFiles: boolean = false) => {
  const basePersona = `
You are ConstructLM, an intelligent AI assistant with expertise in construction, engineering, and general knowledge.
You are helpful, knowledgeable, and provide clear, comprehensive responses.

RESPONSE STYLE:
- **Clear & Helpful:** Provide thorough, well-structured responses with context and examples
- **Professional Tone:** Friendly yet professional, precise and informative
- **Structured Format:** Use headers, bullet points, and clear formatting when appropriate
`;

  if (hasFiles) {
    return basePersona + `

FILE ANALYSIS MODE:
- **Always Cite:** Every factual claim MUST be backed by evidence from the provided files using proper citation format
- **Citation Format:** Use EXACTLY this format: {{citation:FileName|Location|Quote}}
  - FileName: The exact file name (e.g., test-boq.csv, Specifications.pdf)
  - Location: Sheet name and row for Excel, or Page number for PDF (e.g., "Sheet: BOQ_Items, Row 7" or "Page 42")
  - Quote: The actual text/value from the source - MUST be 3-10 words of actual text from the document (e.g., "Painting with emulsion paint" or "Total built-up: 87,210m²")
- **CRITICAL:** The Quote field must NEVER be empty. Always include actual text from the source document.
- **No Hallucination:** If information is not in the files, explicitly state "This information is not available in the provided files."
- **Cite Everything:** Every specific number, value, item name, or technical specification from the files must have a citation with actual quoted text

EXAMPLE CORRECT CITATION:
{{citation:project-summary.pdf|Page 5|Total built-up area: 87,210m²}}

EXAMPLE WRONG CITATION (DO NOT DO THIS):
{{citation:project-summary.pdf|Page 5|}}
`;
  } else {
    return basePersona + `

GENERAL CONVERSATION MODE:
- Answer questions using your knowledge base
- Provide helpful information and explanations
- Be conversational and engaging
- If asked about specific documents, suggest uploading them for detailed analysis
`;
  }
};

// --- Generic Message Handler ---
export const sendMessageToLLM = async (
  modelId: string,
  history: Message[],
  newMessage: string,
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
): Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> => {
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

    const systemPrompt = constructBaseSystemPrompt(activeFiles.length > 0) + ragContext;

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
            if (activeFiles.length > 0) {
                const fileContext = activeFiles
                    .map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`)
                    .join('\n\n');
                
                messages[messages.length - 1].content += `\n\n${fileContext}`;
            }
            
            await streamLocalModel(localModel.modelName, messages, onStream);
            return {};
        } else if (model.provider === 'google') {
            // Google Gemini
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            await sendMessageToGemini(newMessage, activeFiles, activeFiles, onStream);
            return {};
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
    if (files.length === 0) {
        return baseSystemPrompt;
    }
    
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
): Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> => {
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
        let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

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
                        // Capture usage stats if available
                        if (json.usage) {
                            usage.inputTokens = json.usage.prompt_tokens || 0;
                            usage.outputTokens = json.usage.completion_tokens || 0;
                            usage.totalTokens = json.usage.total_tokens || 0;
                        }
                        // Some APIs send it in x_groq
                        if (json.x_groq?.usage) {
                            usage.inputTokens = json.x_groq.usage.prompt_tokens || 0;
                            usage.outputTokens = json.x_groq.usage.completion_tokens || 0;
                            usage.totalTokens = json.x_groq.usage.total_tokens || 0;
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }
        }
        return usage;
    } catch (error) {
        console.error(`[${model.provider}] Error:`, error);
        throw error;
    }
};
