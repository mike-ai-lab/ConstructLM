
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel, setRateLimitCooldown, getStoredApiKey } from "./modelRegistry";
import { sendMessageToGemini } from "./geminiService";
import { streamLocalModel } from "./localModelService";
import { ragService } from "./ragService";
import { streamAWSBedrock } from "./awsBedrockService";
import { diagnosticLogger } from "./diagnosticLogger";
import { getNextProxy } from "./proxyRotation";

// --- System Prompt Construction ---
export const constructBaseSystemPrompt = (hasFiles: boolean = false, hasSources: boolean = false, sources: any[] = []) => {
  if (hasSources && sources.length > 0) {
    const sourcesList = sources.map((s, i) => `[${i + 1}] ${s.title || s.url}: ${s.url}`).join('\n');
    return `You are ConstructLM, an intelligent AI assistant.

CRITICAL SOURCE RESTRICTION
YOU MUST ONLY USE INFORMATION FROM THE PROVIDED SOURCES BELOW.
DO NOT USE ANY EXTERNAL KNOWLEDGE OR INFORMATION NOT IN THESE SOURCES.
IF THE ANSWER IS NOT IN THE SOURCES, SAY "I cannot find this information in the provided sources."

PROVIDED SOURCES:
${sourcesList}

MANDATORY CITATION RULES:
1. EVERY SINGLE FACT must have a citation immediately after it
2. For web sources, use format: {{citation:https://full-url.com|Section/Heading|Quote}}
3. For files, use format: {{citation:FileName.ext|Location|Quote}}
4. Quote must be 3-10 words copied EXACTLY from source
5. NO EXCEPTIONS - every statement needs a citation

EXAMPLES:
- Web: "The feature was released in 2024 {{citation:https://example.com/blog|Product Updates|released in 2024}}."
- File: "The total is 27 {{citation:data.csv|Sheet: Summary, Row 1|Total: 27}}."

CRITICAL: For web sources, the FIRST field MUST be the full URL starting with https://

IF YOU WRITE ANY FACT WITHOUT A CITATION, YOU HAVE FAILED.
REMEMBER: ONLY use information from the provided sources. Every fact MUST have a citation.`;
  }
  
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
  * For Markdown/Text: "Section X" or "Line X"
- Quote: 3-10 words COPIED EXACTLY from the document (NEVER leave this empty)

🔴 CRITICAL: DO NOT use HTML tags like <sup> or <cite>. ONLY use {{citation:...}} format.

CITATION PLACEMENT - INLINE AFTER EVERY FACT:
✓ CORRECT: "The total number of parts is 27 {{citation:cutlist2.csv|Sheet: Summary, Row 1|Total Parts: 27}} and they use 3 boards {{citation:cutlist2.csv|Sheet: Summary, Row 2|Total Boards: 3}}."
✓ CORRECT: "Part #1 is the Back board {{citation:cutlist2.csv|Sheet: Parts, Row 2|Back board}} with dimensions 500mm {{citation:cutlist2.csv|Sheet: Parts, Row 2|Width: 500mm}} x 800mm {{citation:cutlist2.csv|Sheet: Parts, Row 2|Height: 800mm}}."
✓ CORRECT: "This specification section details the requirements {{citation:preview.md|Section 1|details the requirements for various types}} for wood doors."
✗ WRONG: "The total number of parts is 27." (NO CITATION)
✗ WRONG: "Total Parts: 27 <sup>1</sup>" (WRONG FORMAT - NO HTML)
✗ WRONG: "Total Parts: 27 {{citation:cutlist2.csv|Sheet: Summary, Row 1|}}" (EMPTY QUOTE)
✗ WRONG: Listing facts without inline citations

EXAMPLES OF REQUIRED CITATIONS:
- Numbers: "The waste percentage is 20% {{citation:file.csv|Sheet: Boards, Row 3|Waste %: 20%}}"
- Names: "The material is Plywood_19mm {{citation:file.csv|Sheet: Parts, Row 5|Material: Plywood_19mm}}"
- Measurements: "Width is 500mm {{citation:file.csv|Sheet: Parts, Row 2|Width (mm): 500}}"
- Any data point: "Board #1 {{citation:file.csv|Sheet: Boards, Row 2|Board#: 1}} contains 12 parts {{citation:file.csv|Sheet: Boards, Row 2|Parts Count: 12}}"
- Standards: "Must comply with NFPA 80 {{citation:spec.pdf|Page 5|comply with NFPA 80}}"

RESPONSE FORMATTING:
- Use clear markdown formatting
- Use ## for main section headers
- Use ### for subsection headers
- Use **bold** for emphasis
- Use bullet points (-) for lists
- Write in clear, well-structured paragraphs

🔴 DOCUMENT ANALYSIS MODE - MANDATORY BEHAVIOR:
When files are provided, you MUST:
1. IMMEDIATELY analyze the document content WITHOUT asking questions
2. NEVER say "I need more information" or "What would you like to know?"
3. NEVER ask "What analysis do you need?" or "Please provide details"
4. START your response with ## Summary and dive directly into analysis
5. Extract and present ALL key information from the document
6. Provide comprehensive analysis covering all major sections/data

🔴 ADAPTIVE OUTPUT STRUCTURE - MATCH DOCUMENT TYPE:
ANALYZE what type of document this is, then structure accordingly:

For PROJECT/TECHNICAL documents:
## Summary
(2-3 sentence overview with citations)

## Key Findings
- Finding 1 with data {{citation:...}}
- Finding 2 with data {{citation:...}}

## Detailed Breakdown
### [Relevant sections based on content]

For POEMS/LITERATURE:
## Summary
(Brief overview of the work)

## Analysis
### Themes
### Style & Structure
### Literary Devices

For RECIPES/INSTRUCTIONS:
## Summary

## Ingredients/Materials

## Steps/Process

For SPECIFICATIONS:
## Summary

## Requirements

## Standards & Compliance

🔴 CRITICAL RULES:
- ADAPT structure to document type
- DO NOT force "Budget" or "Schedule" sections on poems
- DO NOT force "Themes" sections on technical specs
- If document is unreadable/empty: State this ONCE briefly, then stop
- Every fact MUST have {{citation:...}}

🔴 CITATION RULES (ENFORCED):
- Every factual statement MUST have an inline citation immediately after it
- Citation format: {{citation:SourceName|Location|QuoteOrExcerpt}}
- QuoteOrExcerpt MUST originate from the source
- QuoteOrExcerpt MAY be: exact phrase, distinctive partial phrase, or short semantic excerpt
- The excerpt MUST be recognizable within the source context
- If a fact is not supported by sources, state: "I cannot find this information in the provided sources."

🔴 ABSOLUTELY FORBIDDEN:
- "How can I help you?"
- "What would you like to know?"
- "Please tell me what analysis you need"
- "I need more information"
- "Let me know if you want…"
- "Would you like me to…"
- Any questions or requests for clarification
- Any greeting or conversational filler
- Waiting for user direction
- Forcing irrelevant sections

REMEMBER: 
- START IMMEDIATELY with ## Summary
- ADAPT structure to document type
- Analyze the ENTIRE document comprehensively
- Every fact MUST have {{citation:...}} format ONLY
- NO questions, NO waiting, IMMEDIATE analysis`;
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
  onStream: (chunk: string, thinking?: string) => void,
  activeSources: any[] = []
): Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> => {
    console.log('🔶 [LLM] === SEND MESSAGE START ===');
    console.log('🔶 [LLM] Model:', modelId);
    console.log('🔶 [LLM] Message:', newMessage.substring(0, 100) + '...');
    console.log('🔶 [LLM] Active files:', activeFiles.length);
    console.log('🔶 [LLM] Active sources:', activeSources.length);
    console.log('🔶 [LLM] History length:', history.length);
    
    const model = getModel(modelId);
    
    // Check for images with non-vision models
    const hasImages = activeFiles.some(f => f.type === 'image');
    const isVisionModel = model.provider === 'google' || (model.provider === 'openai' && model.id.includes('gpt-4'));
    
    if (hasImages && !isVisionModel) {
        throw new Error(
            `**Vision Not Supported:** ${model.name} cannot analyze images.\n\n` +
            `**Switch to a vision-enabled model:**\n` +
            `• Google Gemini (any model)\n` +
            `• OpenAI GPT-4o or GPT-4o Mini`
        );
    }

    // ✅ RAG ENABLED - True local embeddings, zero API costs
    let ragContext = '';
    
    // Use RAG for text files (not images) when enabled
    if (activeFiles.some(f => f.type !== 'image') && ragService.isEnabled()) {
        try {
            console.log('[RAG] 🔍 Searching relevant chunks...');
            const ragResults = await ragService.searchRelevantChunks(newMessage, 5);
            
            if (ragResults.length > 0) {
                console.log(`[RAG] ✅ Found ${ragResults.length} relevant chunks`);
                
                // Map file IDs to actual filenames
                const fileIdToName = new Map(activeFiles.map(f => [f.id, f.name]));
                
                ragContext = '\n\nRELEVANT CONTEXT FROM SEMANTIC SEARCH:\n' + 
                    ragResults.map((result, i) => {
                        const fileName = fileIdToName.get(result.chunk.fileName) || result.chunk.fileName;
                        const score = result.score ? ` (relevance: ${(result.score * 100).toFixed(0)}%)` : '';
                        return `[${i + 1}] From ${fileName}${score}:\n${result.chunk.content}`;
                    }).join('\n\n');
            } else {
                console.log('[RAG] No relevant chunks found');
            }
        } catch (error) {
            console.warn('[RAG] Search failed, continuing without RAG context:', error);
        }
    }

    const systemPrompt = constructBaseSystemPrompt(activeFiles.length > 0, activeSources.length > 0, activeSources) + ragContext;

    // Add source context if available
    let sourceContext = '';
    if (activeSources.length > 0) {
        sourceContext = '\n\nSOURCE CONTENT:\n' + 
            activeSources.filter(s => s.content).map((s, i) => 
                `=== SOURCE [${i + 1}]: "${s.title || s.url}" (${s.url}) ===\n${s.content}\n=== END SOURCE ===`
            ).join('\n\n');
    }

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
            
            if (sourceContext) {
                messages[messages.length - 1].content += `\n\n${sourceContext}`;
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
            
            // Add source context to the message for Gemini
            let geminiMessage = newMessage;
            if (activeSources.length > 0) {
                geminiMessage += '\n\nSOURCE CONTENT:\n' + 
                    activeSources.filter(s => s.content).map((s, i) => 
                        `=== SOURCE [${i + 1}]: "${s.title || s.url}" (${s.url}) ===\n${s.content}\n=== END SOURCE ===`
                    ).join('\n\n');
            }
            
            await sendMessageToGemini(modelId, apiKey, geminiMessage, activeFiles, onStream, systemPrompt, conversationHistory);
            return {};
        } else if (model.provider === 'openai' || model.provider === 'groq') {
            // OpenAI or Groq
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            
            // Helper to extract image data
            const extractImageData = (content: string): { base64: string; mimeType: string } | null => {
                const match = content.match(/\[IMAGE_DATA:([^\]]+)\]/);
                if (!match) return null;
                return { base64: match[1], mimeType: 'image/jpeg' };
            };
            
            // Separate image and text files
            const imageFiles = activeFiles.filter(f => f.type === 'image');
            const textFiles = activeFiles.filter(f => f.type !== 'image');
            
            // DON'T send full file content - RAG chunks are already in ragContext
            const fileContext = '';
            
            const fullContext = fileContext + sourceContext;
            
            const messages = [{ role: 'system', content: systemPrompt }];
            
            const recentHistory = history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (let i = 0; i < recentHistory.length; i++) {
                const msg = recentHistory[i];
                const isFirstUserMsg = i === 0 && msg.role === 'user';
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                const content = isFirstUserMsg && fullContext ? msg.content + fullContext : msg.content;
                messages.push({ role, content });
            }
            
            const isFirstMessage = recentHistory.length === 0;
            const currentContent = (isFirstMessage && fullContext) ? newMessage + fullContext : newMessage;
            
            // For OpenAI with vision support, format message with images
            if (imageFiles.length > 0 && model.provider === 'openai') {
                const contentParts: any[] = [{ type: 'text', text: currentContent }];
                
                for (const imgFile of imageFiles) {
                    const imageData = extractImageData(imgFile.content);
                    if (imageData) {
                        contentParts.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${imgFile.fileHandle?.type || 'image/jpeg'};base64,${imageData.base64}`
                            }
                        });
                    }
                }
                
                messages.push({ role: 'user', content: contentParts });
            } else {
                // Standard text-only message
                messages.push({ role: 'user', content: currentContent });
            }
            
            // DIAGNOSTIC: 5. LLM CONTEXT ASSEMBLY (Full Prompt)
            diagnosticLogger.log('5. LLM_CONTEXT_FULL_PROMPT', {
                model_id: modelId,
                model_name: model.name,
                system_prompt: systemPrompt,
                user_prompt: currentContent,
                total_messages: messages.length,
                has_images: imageFiles.length > 0,
                image_count: imageFiles.length,
                total_characters: messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0),
                estimated_tokens: Math.ceil(messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0) / 4),
                messages_structure: messages.map((m, idx) => ({
                    index: idx,
                    role: m.role,
                    content_type: typeof m.content,
                    content_length: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length,
                    content_preview: typeof m.content === 'string' ? m.content.substring(0, 200) : '[multipart content]'
                }))
            });
            
            return await streamOpenAICompatible(model, apiKey, messages, onStream);
        } else if (model.provider === 'aws') {
            // AWS Bedrock
            const accessKeyId = getApiKeyForModel(model);
            const secretAccessKey = getStoredApiKey('AWS_SECRET_ACCESS_KEY');
            
            if (!accessKeyId || !secretAccessKey) {
                throw new Error(`AWS credentials missing. Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Settings.`);
            }
            
            const fileContext = activeFiles.length > 0
                ? '\n\nFILE CONTEXT:\n' + activeFiles.map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`).join('\n\n')
                : '';
            
            const fullContext = fileContext + sourceContext;
            
            const messages = [{ role: 'system', content: systemPrompt }];
            
            const recentHistory = history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (let i = 0; i < recentHistory.length; i++) {
                const msg = recentHistory[i];
                const isFirstUserMsg = i === 0 && msg.role === 'user';
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                const content = isFirstUserMsg && fullContext ? msg.content + fullContext : msg.content;
                messages.push({ role, content });
            }
            
            const isFirstMessage = recentHistory.length === 0;
            const currentContent = (isFirstMessage && fullContext) ? newMessage + fullContext : newMessage;
            messages.push({ role: 'user', content: currentContent });
            
            const awsMessages = messages;
            const awsUserMessage = currentContent;
            const awsFiles = activeFiles;
            const awsCallback = onStream;
            
            return await streamAWSBedrock(
                model.id,
                awsMessages,
                awsUserMessage,
                awsFiles,
                awsCallback
            );
        } else {
            throw new Error(`Provider ${model.provider} not implemented yet.`);
        }
    } catch (error: any) {
        const errMsg = error.message || "";
        
        // Check for actual 413 status code or explicit size errors
        if (errMsg.includes("413") || errMsg.includes("Payload Too Large") || errMsg.includes("Request Entity Too Large")) {
            throw new Error(
                `**Message Too Large:** ${model.name} cannot process this request.\n\n` +
                `**Solution:** Use @mentions to select specific files only, or switch to Gemini 2.5 Flash.`
            );
        }
        
        // CORS proxy file size limit (403 from corsproxy)
        if (errMsg.includes("403") && errMsg.includes("corsproxy")) {
            throw new Error(
                `**File Size Limit:** Request exceeds 1MB browser limit.\n\n` +
                `**Solutions:**\n` +
                `1. Use Desktop App (no size limits)\n` +
                `2. Reduce file attachments\n` +
                `3. Switch to Gemini models`
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
    messages: Array<{ role: string; content: string | any }>,
    onStream: (chunk: string, thinking?: string) => void
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
            // Setup stream listener if available
            let streamBuffer = '';
            
            if ((window as any).electron.onStreamChunk) {
                const handleStreamChunk = (dataStr: string) => {
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices?.[0]?.delta?.content;
                        const thinking = json.choices?.[0]?.delta?.reasoning_content;
                        
                        if (thinking) {
                            streamBuffer += thinking;
                            onStream('', streamBuffer);
                        } else if (content) {
                            onStream(content, streamBuffer || undefined);
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                };
                
                (window as any).electron.onStreamChunk(handleStreamChunk);
            }
            
            let result;
            if (model.provider === 'groq') {
                result = await (window as any).electron.proxyGroq(apiKey, requestBody);
            } else if (model.provider === 'openai') {
                result = await (window as any).electron.proxyOpenai(apiKey, requestBody);
            }
            
            // Cleanup listener if available
            if ((window as any).electron.removeStreamListener) {
                (window as any).electron.removeStreamListener();
            }
            
            if (result && !result.ok) {
                const errorMsg = result.error || 'Unknown error';
                if (errorMsg.includes('Empty response')) {
                    throw new Error(
                        `**Request Too Large:** The context exceeds ${model.name}'s limits.\n\n` +
                        `**Solutions:**\n` +
                        `1. Use @mentions to select specific sections only\n` +
                        `2. Switch to Gemini 2.5 Flash (1M+ token context)\n` +
                        `3. Reduce file size or split into smaller parts`
                    );
                }
                throw new Error(`API Error ${result.status}: ${errorMsg}`);
            }
            
            if (result && result.streaming) {
                return {};
            }
            
            // Handle non-streaming response
            if (result && result.data) {
                const content = result.data.choices?.[0]?.message?.content || '';
                if (content) {
                    onStream(content);
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

    // Use existing proxy rotation service for better reliability
    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    
    if (model.provider === 'groq') {
        const proxy = getNextProxy();
        baseUrl = proxy + encodeURIComponent('https://api.groq.com/openai/v1/chat/completions');
    } else if (model.provider === 'openai') {
        const proxy = getNextProxy();
        baseUrl = proxy + encodeURIComponent('https://api.openai.com/v1/chat/completions');
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
        let thinkingBuffer = '';
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
                        const thinking = json.choices?.[0]?.delta?.reasoning_content;
                        
                        if (thinking) {
                            thinkingBuffer += thinking;
                            onStream('', thinkingBuffer);
                        } else if (content) {
                            onStream(content, thinkingBuffer || undefined);
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
