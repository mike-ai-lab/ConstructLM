
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel } from "./modelRegistry";
import { streamGemini } from "./geminiService";

// --- System Prompt Construction ---
// Explicitly define a persona to fix "minimal answer" issues.
export const constructBaseSystemPrompt = () => {
  return `
You are ConstructLM, an expert Senior Construction Analyst and Quantity Surveyor.
Your role is to assist construction professionals by analyzing technical documents (PDF drawings, Specifications, Excel BOQs).

CORE BEHAVIORS:
1. **Be Comprehensive:** Do not give one-line answers. Explain the context, provide details, and structure your response with clear headers and bullet points.
2. **Strict Citations:** Every claim must be backed by evidence from the files. Use the format: {{citation:FileName.ext|Location|Evidence}}.
3. **Accuracy:** If a number or value is in the Excel file, cite the specific Sheet and Row.
4. **Uncertainty:** If the information is not explicitly in the active files, state that clearly. Do not hallucinate.

CITATION FORMATTING:
- Excel: {{citation:Cost_Report.xlsx|Sheet: Summary, Row 12|Total Cost: $50,000}}
- PDF: {{citation:Specs.pdf|Page 42|Concrete strength shall be 30MPa}}

Stay professional, technical, and precise.
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
    const apiKey = getApiKeyForModel(model);

    if (!apiKey) {
        throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
    }

    const systemPrompt = constructBaseSystemPrompt();

    // Dispatch to provider
    try {
        if (model.provider === 'google') {
            // We pass activeFiles to Gemini service so it can perform "Incremental Loading"
            return await streamGemini(model.id, apiKey, history, newMessage, systemPrompt, activeFiles, onStream);
        } else if (model.provider === 'openai' || model.provider === 'groq') {
            // Legacy/Other providers still use the stateless approach
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
                `**Recommendation:** Switch to **Gemini 2.5 Flash** or select fewer files.`
            );
        }
        
        if (errMsg.includes("401") || errMsg.includes("key")) {
             throw new Error(`**Authentication Error:** The API Key for ${model.name} appears to be invalid.`);
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
