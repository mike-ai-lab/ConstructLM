
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel, setRateLimitCooldown } from "./modelRegistry";
import { sendMessageToGemini } from "./geminiService";
import { streamLocalModel } from "./localModelService";
import { ragService } from "./ragService";

// --- System Prompt Construction ---
export const constructBaseSystemPrompt = (hasFiles: boolean = false) => {
  if (hasFiles) {
    return `You are ConstructLM, an intelligent AI assistant with expertise in construction, engineering, and technical documentation analysis.

🚨 CRITICAL CITATION REQUIREMENT 🚨
YOU MUST PROVIDE CITATIONS FOR EVERY SINGLE FACT, NUMBER, OR DATA POINT FROM THE DOCUMENTS.
NO EXCEPTIONS. EVERY STATEMENT ABOUT THE DOCUMENT CONTENT MUST HAVE A CITATION.

CITATION FORMAT (ABSOLUTELY MANDATORY):
- Use EXACTLY this format: {{citation:FileName|Location|Quote}}
- FileName: Exact file name (e.g., cutlist2.csv, spec.pdf)
- Location: 
  * For CSV/Excel: "Sheet: SheetName, Row X" (e.g., "Sheet: Parts List, Row 5")
  * For PDF: "Page X" (e.g., "Page 12")
- Quote: 3-10 words COPIED EXACTLY from the document (NEVER leave this empty)

CITATION PLACEMENT - INLINE AFTER EVERY FACT:
✓ CORRECT: "The total number of parts is 27 {{citation:cutlist2.csv|Sheet: Summary, Row 1|Total Parts: 27}} and they use 3 boards {{citation:cutlist2.csv|Sheet: Summary, Row 2|Total Boards: 3}}."
✓ CORRECT: "Part #1 is the Back board {{citation:cutlist2.csv|Sheet: Parts, Row 2|Back board}} with dimensions 500mm {{citation:cutlist2.csv|Sheet: Parts, Row 2|Width: 500mm}} x 800mm {{citation:cutlist2.csv|Sheet: Parts, Row 2|Height: 800mm}}."
✗ WRONG: "The total number of parts is 27." (NO CITATION)
✗ WRONG: "Total Parts: 27 {{citation:cutlist2.csv|Sheet: Summary, Row 1|}}" (EMPTY QUOTE)
✗ WRONG: Listing facts without inline citations

EXAMPLES OF REQUIRED CITATIONS:
- Numbers: "The waste percentage is 20% {{citation:file.csv|Sheet: Boards, Row 3|Waste %: 20%}}"
- Names: "The material is Plywood_19mm {{citation:file.csv|Sheet: Parts, Row 5|Material: Plywood_19mm}}"
- Measurements: "Width is 500mm {{citation:file.csv|Sheet: Parts, Row 2|Width (mm): 500}}"
- Any data point: "Board #1 {{citation:file.csv|Sheet: Boards, Row 2|Board#: 1}} contains 12 parts {{citation:file.csv|Sheet: Boards, Row 2|Parts Count: 12}}"

RESPONSE FORMATTING:
- Use clear markdown formatting
- Use ## for main section headers
- Use ### for subsection headers
- Use **bold** for emphasis
- Use bullet points (-) for lists
- Write in clear, well-structured paragraphs
- ALWAYS cite inline immediately after each fact

REMEMBER: If you mention ANY data from the document, you MUST cite it immediately with the exact quote from the source.`;
  } else {
    return `You are ConstructLM, an intelligent AI assistant with expertise in construction, engineering, and general knowledge.

RESPONSE FORMATTING:
- Use clear markdown formatting for better readability
- Use ## for main section headers
- Use ### for subsection headers  
- Use **bold** for emphasis on important terms
- Use bullet points (-) for lists
- Use numbered lists (1. 2. 3.) for sequential steps
- Write in clear, well-structured paragraphs
- Use line breaks between sections for better visual separation

TONE & STYLE:
- Professional yet conversational and approachable
- Clear and precise language
- Helpful and informative
- Provide actionable insights when applicable

When users have documents to analyze, suggest using @mentions to reference specific files for detailed analysis with citations.`;
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
            const conversationHistory = history.filter(m => !m.isStreaming && m.id !== 'intro');
            await sendMessageToGemini(modelId, apiKey, newMessage, activeFiles, activeFiles, onStream, systemPrompt, conversationHistory);
            return {};
        } else if (model.provider === 'openai' || model.provider === 'groq') {
            // OpenAI or Groq
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            
            const fileContext = activeFiles.length > 0
                ? '\n\nFILE CONTEXT:\n' + activeFiles.map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`).join('\n\n')
                : '';
            
            const messages = [{ role: 'system', content: systemPrompt }];
            
            const recentHistory = history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (let i = 0; i < recentHistory.length; i++) {
                const msg = recentHistory[i];
                const isFirstUserMsg = i === 0 && msg.role === 'user';
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                const content = isFirstUserMsg && fileContext ? msg.content + fileContext : msg.content;
                messages.push({ role, content });
            }
            
            const isFirstMessage = recentHistory.length === 0;
            const currentContent = (isFirstMessage && fileContext) ? newMessage + fileContext : newMessage;
            messages.push({ role: 'user', content: currentContent });
            
            return await streamOpenAICompatible(model, apiKey, messages, onStream);
        } else {
            throw new Error(`Provider ${model.provider} not implemented yet.`);
        }
    } catch (error: any) {
        const errMsg = error.message || "";
        
        if (errMsg.includes("413") || errMsg.includes("too large") || errMsg.includes("TPM")) {
            throw new Error(
                `**Message Too Large:** ${model.name} cannot process this request.\n\n` +
                `**Solution:** Use @mentions to select specific files only, or switch to Gemini 2.5 Flash.`
            );
        }
        
        if (errMsg.includes("429") || errMsg.includes("Rate limit")) {
            const match = errMsg.match(/try again in ([^.]+)/);
            const waitTime = match ? match[1] : 'some time';
            
            // Parse wait time and store cooldown
            const timeMatch = waitTime.match(/(\d+)\s*(second|minute|hour|day)s?/i);
            if (timeMatch) {
                const value = parseInt(timeMatch[1], 10);
                const unit = timeMatch[2].toLowerCase();
                let ms = 0;
                if (unit === 'second') ms = value * 1000;
                else if (unit === 'minute') ms = value * 60 * 1000;
                else if (unit === 'hour') ms = value * 60 * 60 * 1000;
                else if (unit === 'day') ms = value * 24 * 60 * 60 * 1000;
                
                if (ms > 0) {
                    setRateLimitCooldown(modelId, Date.now() + ms);
                }
            }
            
            throw new Error(
                `**Rate Limit Reached:** ${model.name} daily quota exceeded.\n\n` +
                `**Wait:** ${waitTime} or switch to Gemini 2.5 Flash (unlimited free tier).`
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
    messages: Array<{ role: string; content: string }>,
    onStream: (chunk: string) => void
): Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> => {

    const requestBody = {
        model: model.id,
        messages: messages,
        stream: true,
        temperature: 0.2
    };

    // Use Electron proxy if available
    if ((window as any).electron) {
        try {
            let result;
            if (model.provider === 'groq') {
                result = await (window as any).electron.proxyGroq(apiKey, requestBody);
            } else if (model.provider === 'openai') {
                result = await (window as any).electron.proxyOpenai(apiKey, requestBody);
            }
            
            if (result && !result.ok) {
                throw new Error(`API Error ${result.status}: ${result.error || 'Unknown error'}`);
            }
            
            // Handle streaming response from Electron proxy
            if (result && result.data) {
                // For non-streaming response, simulate streaming
                const content = result.data.choices?.[0]?.message?.content || '';
                if (content) {
                    // Simulate streaming by chunking the response
                    const words = content.split(' ');
                    for (let i = 0; i < words.length; i++) {
                        const chunk = (i === 0 ? '' : ' ') + words[i];
                        onStream(chunk);
                        await new Promise(resolve => setTimeout(resolve, 20)); // Small delay for streaming effect
                    }
                }
                
                return {
                    inputTokens: result.data.usage?.prompt_tokens || 0,
                    outputTokens: result.data.usage?.completion_tokens || 0,
                    totalTokens: result.data.usage?.total_tokens || 0
                };
            }
        } catch (error: any) {
            console.error(`[${model.provider}] Electron proxy error:`, error);
            throw error;
        }
    }

    // Fallback to direct API calls with CORS proxy for browser
    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    if (model.provider === 'groq') {
        baseUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.groq.com/openai/v1/chat/completions');
    }

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const errorMsg = err.error?.message || response.statusText;
            
            // Handle rate limit
            if (response.status === 429) {
                const match = errorMsg.match(/(\d+)\s*(second|minute|hour|day)s?/i);
                if (match) {
                    const value = parseInt(match[1], 10);
                    const unit = match[2].toLowerCase();
                    let ms = 0;
                    if (unit === 'second') ms = value * 1000;
                    else if (unit === 'minute') ms = value * 60 * 1000;
                    else if (unit === 'hour') ms = value * 60 * 60 * 1000;
                    else if (unit === 'day') ms = value * 24 * 60 * 60 * 1000;
                    
                    if (ms > 0) {
                        setRateLimitCooldown(model.id, Date.now() + ms);
                    }
                }
            }
            
            throw new Error(`API Error ${response.status}: ${errorMsg}`);
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
    } catch (error: any) {
        console.error(`[${model.provider}] Error:`, error);
        
        // Handle network errors
        if (error.message?.includes('Failed to fetch')) {
            throw new Error(
                `**Connection Error:** Cannot reach ${model.name} API.\n\n` +
                `Check your internet connection or try switching to Gemini models.`
            );
        }
        
        throw error;
    }
};
