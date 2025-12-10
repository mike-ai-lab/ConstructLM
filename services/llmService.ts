
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel } from "./modelRegistry";
import { streamGemini } from "./geminiService";

// --- System Prompt Construction ---
// Shared across all providers to ensure consistent citation behavior
export const constructSystemPrompt = (files: ProcessedFile[]) => {
  const activeFiles = files.filter(f => f.status === 'ready');
  
  const fileContexts = activeFiles
    .map(f => `=== FILE START: "${f.name}" (${f.type.toUpperCase()}) ===\n${f.content}\n=== FILE END: "${f.name}" ===`)
    .join('\n\n');

  const contextNote = activeFiles.length > 0 
    ? `You have access to ${activeFiles.length} specific file(s) for this query.`
    : "You have access to all project files.";

  return `
You are ConstructLM, an advanced AI assistant for construction documentation.
${contextNote}

INSTRUCTIONS:
1. Answer strictly based on the provided FILE CONTEXTS.
2. CITATIONS ARE MANDATORY. When you use information from a file, you MUST cite it using the strict 3-part format below.
   
   Format: {{citation:FileName.ext|Location Info|Verbatim Quote or Evidence}}
   
   Examples:
   - "The beam depth is 600mm {{citation:Structural_Drawings.pdf|Page 5|Beam Schedule B1 lists depth as 600}}"
   - "The function uses a recursive loop {{citation:utils.ts|Line 45|const recursiveLoop = (n) => ...}}"
   - "The cost of steel is $1200/ton {{citation:BOQ_Final.xlsx|Sheet: Pricing, Row 45|Structural Steel | 1200 | USD}}"

3. CRITICAL RULES FOR CITATIONS:
   - Part 1: Filename (must match exactly).
   - Part 2: Location. 
     - For PDF: Use "Page X". 
     - For Excel: Use "Sheet: [Name], Row [Number]".
     - For Text/Code/Markdown: Use "Line X".
   - Part 3: EVIDENCE. Copy the exact text or data row from the file.

4. If a user asks about a specific file (e.g., "What's in the BOQ?"), summarize that specific file's content.
5. If the information is not in the provided files, state: "I couldn't find that information in the active documents."
6. Use Markdown for formatting your response (bold, lists, headers).

CONTEXT:
${fileContexts}
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

    const systemPrompt = constructSystemPrompt(activeFiles);

    // Dispatch to provider
    try {
        if (model.provider === 'google') {
            return await streamGemini(model.id, apiKey, history, newMessage, systemPrompt, onStream);
        } else if (model.provider === 'openai' || model.provider === 'groq') {
            return await streamOpenAICompatible(model, apiKey, history, newMessage, systemPrompt, onStream);
        } else {
            throw new Error(`Provider ${model.provider} not implemented yet.`);
        }
    } catch (error: any) {
        // --- Smart Error Translation ---
        // This block catches the technical error and rethrows a user-friendly one
        const errMsg = error.message || "";
        
        // Groq / Rate Limits / Context Limits
        if (errMsg.includes("413") || errMsg.includes("too large") || errMsg.includes("TPM") || errMsg.includes("tokens")) {
            throw new Error(
                `**Capacity Limit Reached:** The free version of **${model.name}** cannot read this much text at once (limit is roughly 15-20 pages).\n\n` +
                `**Recommendation:** \n` +
                `1. Switch to **Gemini 2.5 Flash** (High Capacity) in the menu above.\n` +
                `2. Or, try selecting fewer files by typing "@" to chat with just one document.`
            );
        }
        
        // Auth Errors
        if (errMsg.includes("401") || errMsg.includes("key")) {
             throw new Error(`**Authentication Error:** The API Key for ${model.name} appears to be invalid. Please check your Settings.`);
        }

        throw error;
    }
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
