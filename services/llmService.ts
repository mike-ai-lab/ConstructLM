
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
4. Quote must be 3-10 words copied EXACTLY from source - NEVER use generic words like "quote"
5. NO EXCEPTIONS - every statement needs a citation with meaningful text

EXAMPLES:
- Web: "The feature was released in 2024 {{citation:https://example.com/blog|Product Updates|released in 2024}}."
- File: "The total is 27 {{citation:data.csv|Sheet: Summary, Row 1|Total: 27}}."
- NEVER: {{citation:file|page|quote}} - this is WRONG
- ALWAYS: {{citation:file|page|meaningful text from source}} - this is CORRECT

CRITICAL: For web sources, the FIRST field MUST be the full URL starting with https://

IF YOU WRITE ANY FACT WITHOUT A CITATION, YOU HAVE FAILED.
REMEMBER: ONLY use information from the provided sources. Every fact MUST have a citation.`;
  }
  
  if (hasFiles) {
    return `You are ConstructLM, a document analysis assistant.

**YOUR ONLY JOB**: Extract ALL detailed information from the context chunks and cite EVERY fact.

**STRICT RULES**:
1. Extract ALL data: numbers, quantities, units, descriptions, specifications
2. EVERY fact needs a citation with EXACT text from the chunk
3. If information is NOT in context → say "I cannot find information about [topic]"
4. NEVER use general knowledge or assumptions

**CITATION FORMAT** (MANDATORY):
{{citation:FileName|Page X|exact 3-10 words from chunk}}

**HOW TO EXTRACT PAGE NUMBERS**:
- Look for "--- [Page N] ---" or "[Page N]" in chunks
- If found, use "Page N" in citation
- For Excel: Look for "[Sheet: Name]" and use "Sheet: Name"
- If no page marker found, use "Page 1" as default

**CITATION EXAMPLES** (CORRECT):
✅ {{citation:boq.pdf|Page 1|29 m² adjustment}}
✅ {{citation:data.xlsx|Sheet: Summary|Total: 27 items}}
✅ {{citation:report.pdf|Page 3|Integrated waterproof and thermal}}

**CITATION EXAMPLES** (WRONG - NEVER DO THIS)**:
❌ {{citation:file|Page not specified|item name}}
❌ {{citation:file|Page X|quote}}
❌ {{citation:file|Page 1|Roof Works}} (too generic)

**RESPONSE FORMAT**:
Provide a structured table or list with ALL details:
- Item numbers
- Full descriptions
- Quantities with units
- Any specifications or notes

REMEMBER: Extract EVERYTHING from context, cite EXACT text, find page numbers in chunk markers.`;
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
    // CRITICAL: Only search within explicitly selected files
    if (activeFiles.some(f => f.type !== 'image') && ragService.isEnabled()) {
        try {
            console.log('[RAG] 🔍 Searching relevant chunks in selected files only...');
            const selectedFileIds = activeFiles.map(f => f.id);
            
            // Adaptive chunk count based on file types
            const hasStructuredFiles = activeFiles.some(f => f.type === 'excel' || f.type === 'csv');
            const hasPdfFiles = activeFiles.some(f => f.type === 'pdf');
            
            let chunkLimit = 10; // Default
            if (hasStructuredFiles && !hasPdfFiles) {
                chunkLimit = 6; // Excel/CSV only: fewer chunks needed (row-based data)
            } else if (hasPdfFiles && !hasStructuredFiles) {
                chunkLimit = 12; // PDF only: more chunks for paragraph context
            } else if (hasStructuredFiles && hasPdfFiles) {
                chunkLimit = 10; // Mixed: balanced approach
            }
            
            console.log(`[RAG] Using ${chunkLimit} chunks (Excel/CSV: ${hasStructuredFiles}, PDF: ${hasPdfFiles})`);
            
            const ragResults = await ragService.searchRelevantChunks(newMessage, chunkLimit, selectedFileIds);
            
            if (ragResults.length > 0) {
                console.log(`[RAG] ✅ Found ${ragResults.length} relevant chunks from selected files`);
                
                // DEBUG: Log first chunk to verify page numbers
                if (ragResults.length > 0) {
                    console.log('[RAG] 🔍 First chunk preview:', ragResults[0].chunk.content.substring(0, 200));
                }
                
                ragContext = '\n\nRELEVANT CONTEXT FROM SEMANTIC SEARCH:\n' + 
                    ragResults.map((result, i) => {
                        const score = result.score ? ` (relevance: ${(result.score * 100).toFixed(0)}%)` : '';
                        return `[${i + 1}] From ${result.chunk.fileName}${score}:\n${result.chunk.content}`;
                    }).join('\n\n') + 
                    '\n\n🔴 CRITICAL CITATION RULES:\n' +
                    '1. Find page numbers: Look for "--- [Page N] ---" or "[Page N]" in chunk text\n' +
                    '2. Extract ALL data: quantities, units, item numbers, descriptions\n' +
                    '3. Cite EXACT text: Copy 3-10 words directly from chunk (numbers + context)\n' +
                    '4. Format: {{citation:FileName|Page N|exact text with numbers}}\n' +
                    '5. For Excel: {{citation:FileName|Sheet: Name|exact text}}\n' +
                    '6. NEVER use "Page not specified" - find the page marker or use Page 1\n' +
                    '7. NEVER cite just item names - include quantities/specifications';
            } else {
                console.log('[RAG] No relevant chunks found in selected files');
            }
            
            // Construct system prompt
            const baseSystemPrompt = constructBaseSystemPrompt(activeFiles.length > 0, activeSources.length > 0, activeSources);
            const systemPrompt = baseSystemPrompt + ragContext;
            
            // FULL REQUEST LOGGING (always show, even if no RAG results)
            const systemPromptTokens = Math.ceil(systemPrompt.length / 4);
            const ragContextTokens = Math.ceil(ragContext.length / 4);
            const userMessageTokens = Math.ceil(newMessage.length / 4);
            const totalRequestTokens = systemPromptTokens + ragContextTokens + userMessageTokens;
            
            console.log('\n🔶 [RAG] === FULL REQUEST BREAKDOWN ===');
            console.log(`📊 System Prompt: ${systemPromptTokens} tokens`);
            console.log(`📊 RAG Context: ${ragContextTokens} tokens (${ragResults.length} chunks)`);
            console.log(`📊 User Message: ${userMessageTokens} tokens`);
            console.log(`📊 TOTAL REQUEST: ${totalRequestTokens} tokens`);
            console.log(`📊 Model Limits: Groq ~8K, Gemini ~1M, GPT-4o ~128K`);
            console.log('\n📄 FULL SYSTEM PROMPT:');
            console.log(systemPrompt);
            console.log('\n📄 FULL RAG CONTEXT:');
            console.log(ragContext);
            console.log('\n📄 USER MESSAGE:');
            console.log(newMessage);
            console.log('\n🔶 === END FULL REQUEST ===\n');
        } catch (error) {
            console.warn('[RAG] Search failed, continuing without RAG context:', error);
        }
    }

    // ✅ REQUIREMENT 1: System prompt MUST ALWAYS include base + RAG context
    const baseSystemPrompt = constructBaseSystemPrompt(activeFiles.length > 0, activeSources.length > 0, activeSources);
    const systemPrompt = baseSystemPrompt + ragContext;
    
    // ✅ REQUIREMENT 4: Strict mode isolation
    const strictMode = activeFiles.length > 0 || activeSources.length > 0;
    
    // ✅ REQUIREMENT 5: Hard refusal clause in strict mode
    const strictSystemPrompt = strictMode ? systemPrompt + '\n\nIF THE USER ASKS FOR INFORMATION NOT PRESENT IN THE PROVIDED CONTEXT:\n- You MUST refuse\n- You MUST NOT explain, guess, infer, or use general knowledge\n- The ONLY allowed response is:\n"I cannot find this information in the provided context."' : systemPrompt;

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
            
            // ✅ REQUIREMENT 4: Strict mode history isolation
            const conversationHistory = strictMode ? [] : history.filter(m => !m.isStreaming && m.id !== 'intro');
            
            // ✅ REQUIREMENT 2: Gemini-specific rule reinforcement
            const geminiMessage = strictMode 
                ? `SYSTEM RULES (MANDATORY – NO EXCEPTIONS):\n${strictSystemPrompt}\n\nUSER QUESTION:\n${newMessage}`
                : newMessage;
            
            // ✅ REQUIREMENT 3: Source context in SYSTEM, not USER
            const finalSystemPrompt = strictSystemPrompt + sourceContext;
            
            await sendMessageToGemini(modelId, apiKey, geminiMessage, activeFiles, onStream, finalSystemPrompt, conversationHistory);
            return {};
        } else if (model.provider === 'openai' || model.provider === 'groq' || model.provider === 'cerebras') {
            // OpenAI, Groq, or Cerebras
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
            
            // RAG chunks are already in ragContext - don't send full files
            const fileContext = '';
            
            const fullContext = fileContext + sourceContext;
            
            // ✅ REQUIREMENT 3: File context in SYSTEM role only
            // ✅ REQUIREMENT 1: System prompt construction
            const finalSystemPrompt = strictSystemPrompt + sourceContext;
            
            const messages: Array<{ role: string; content: string | any[] }> = [{ role: 'system', content: finalSystemPrompt }];
            
            // ✅ REQUIREMENT 4: Strict mode history isolation (ALL providers)
            const recentHistory = strictMode ? [] : history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (const msg of recentHistory) {
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                messages.push({ role, content: msg.content });
            }
            
            // ✅ REQUIREMENT 3: User message contains ONLY user intent
            const currentContent = newMessage;
            
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
            
            // ✅ REQUIREMENT 3: File context in SYSTEM role only
            // ✅ REQUIREMENT 1: System prompt construction
            const finalSystemPrompt = strictSystemPrompt + sourceContext;
            
            const messages = [{ role: 'system', content: finalSystemPrompt }];
            
            // ✅ REQUIREMENT 4: Strict mode history isolation (ALL providers)
            const recentHistory = strictMode ? [] : history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (const msg of recentHistory) {
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                messages.push({ role, content: msg.content });
            }
            
            // ✅ REQUIREMENT 3: User message contains ONLY user intent
            messages.push({ role: 'user', content: newMessage });
            
            const awsMessages = messages;
            const awsUserMessage = newMessage;
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

    // ✅ REQUIREMENT 6: Generation parameters for strict mode
    const hasStrictPrompt = messages[0]?.content?.includes('MANDATORY – NO EXCEPTIONS') || 
                           messages[0]?.content?.includes('STRICT RULES') ||
                           messages[0]?.content?.includes('CRITICAL SOURCE RESTRICTION');
    
    const requestBody = {
        model: model.id,
        messages: messages,
        stream: true,
        temperature: hasStrictPrompt ? 0.3 : 0.7,
        top_p: hasStrictPrompt ? 0.8 : 0.95,
        max_tokens: 8192
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
                const errorMsg = result.error || 'Request failed - no error details provided';
                if (errorMsg.includes('Empty response') || errorMsg === 'Request failed - no error details provided') {
                    throw new Error(
                        `**Request Too Large:** The context exceeds ${model.name}'s limits.\n\n` +
                        `**Solutions:**\n` +
                        `1. Use @mentions to select specific sections only\n` +
                        `2. Switch to Gemini 2.5 Flash (1M+ token context)\n` +
                        `3. Reduce file size or split into smaller parts`
                    );
                }
                throw new Error(`API Error ${result.status || 'Unknown'}: ${errorMsg}`);
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
    } else if (model.provider === 'cerebras') {
        // Cerebras doesn't use proxy - direct API call
        baseUrl = 'https://api.cerebras.ai/v1/chat/completions';
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
