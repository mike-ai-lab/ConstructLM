
import { Message, ProcessedFile, ModelConfig } from "../types";
import { getModel, getApiKeyForModel, setRateLimitCooldown, getStoredApiKey } from "./modelRegistry";
import { sendMessageToGemini } from "./geminiService";
import { streamLocalModel } from "./localModelService";
import { ragService } from "./ragService";
import { streamAWSBedrock } from "./awsBedrockService";
import { streamOpenRouter } from "./openrouterService";
import { streamOllamaCloud } from "./ollamaCloudService";
import { diagnosticLogger } from "./diagnosticLogger";
import { getNextProxy } from "./proxyRotation";

// --- System Prompt Construction ---
export const constructBaseSystemPrompt = (
  hasFiles: boolean = false, 
  hasSources: boolean = false, 
  sources: any[] = [],
  activeFiles: ProcessedFile[] = []
) => {
  // ✅ MINIMAL PROMPT - No files/sources = minimal tokens
  if (!hasFiles && !hasSources) {
    return `You are ConstructLM, an AI assistant. Provide helpful, detailed answers.`;
  }
  
  if (hasSources && sources.length > 0) {
    const sourcesList = sources.map((s, i) => `[${i + 1}] ${s.title || s.url}: ${s.url}`).join('\n');
    return `You are ConstructLM. Answer based on these sources:

${sourcesList}

Cite: {{citation:URL|Section|exact quote}}`;
  }
  
  if (hasFiles) {
    // Detect file types
    const fileTypes = new Set(activeFiles.map(f => f.type));
    const hasPdf = fileTypes.has('pdf');
    const hasExcel = fileTypes.has('excel');
    const hasCsv = fileTypes.has('csv');
    
    // Build MINIMAL file-type-specific citation instructions
    let citationInstructions = '';
    
    if (hasPdf) {
      citationInstructions += `\nPDF: {{citation:File.pdf|Page X|quote}}`;
    }
    
    if (hasExcel || hasCsv) {
      citationInstructions += `\nExcel/CSV: {{citation:File.xlsx|Sheet: Name, Row X|quote}}`;
    }
    
    // If no specific types, generic
    if (!citationInstructions) {
      citationInstructions = `\nCite: {{citation:FileName|Location|exact quote}}`;
    }
    
    return `You are ConstructLM. Answer using document chunks below.

**Citation:**${citationInstructions}

Cite exact text (3-10 words). Be detailed and thorough.`;
  }
  
  return `You are ConstructLM, an AI assistant. Provide helpful, detailed answers.`;
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
    
    const model = getModel(modelId);
    
    // Check for images with non-vision models
    const hasImages = activeFiles.some(f => f.type === 'image');
    const isVisionModel = model.provider === 'google' || 
                         (model.provider === 'openai' && model.id.includes('gpt-4')) ||
                         (model.provider === 'openrouter' && model.supportsImages);
    
    if (hasImages && !isVisionModel) {
        throw new Error(
            `**Vision Not Supported:** ${model.name} cannot analyze images.\n\n` +
            `**Switch to a vision-enabled model:**\n` +
            `• Google Gemini (any model)\n` +
            `• OpenAI GPT-4o or GPT-4o Mini\n` +
            `• OpenRouter: Gemma 3 series, Nemotron VL`
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
            
            // Adaptive chunk count based on file types (INCREASED FOR BETTER CONTEXT)
            const hasStructuredFiles = activeFiles.some(f => f.type === 'excel' || f.type === 'csv');
            const hasPdfFiles = activeFiles.some(f => f.type === 'pdf');
            
            let chunkLimit = 20; // Default - increased from 10
            if (hasStructuredFiles && !hasPdfFiles) {
                chunkLimit = 15; // Excel/CSV only - increased from 6
            } else if (hasPdfFiles && !hasStructuredFiles) {
                chunkLimit = 25; // PDF only - increased from 12
            } else if (hasStructuredFiles && hasPdfFiles) {
                chunkLimit = 20; // Mixed - increased from 10
            }
            
            const ragResults = await ragService.searchRelevantChunks(newMessage, chunkLimit, selectedFileIds);
            
            if (ragResults.length > 0) {
                console.log(`[RAG] ✅ Found ${ragResults.length} relevant chunks from selected files`);
                
                ragContext = '\n\nRELEVANT CONTEXT FROM SEMANTIC SEARCH:\n' + 
                    ragResults.map((result, i) => {
                        const score = result.score ? ` (relevance: ${(result.score * 100).toFixed(0)}%)` : '';
                        return `[${i + 1}] From ${result.chunk.fileName}${score}:\n${result.chunk.content}`;
                    }).join('\n\n') + 
                    '\n\n🔴 CRITICAL CITATION RULES:\n' +
                    '1. Answer ONCE - no repetitions, alternatives, or "better answers"\n' +
                    '2. Find location markers in chunks: "--- [Page N] ---", "Sheet:", "Row", or section headers\n' +
                    '3. Cite EXACT text: Copy 3-10 words directly from chunk (include numbers + context)\n' +
                    '4. Format: {{citation:FileName|Location|exact quote}}\n' +
                    '5. NEVER use "Page not specified" - use the actual location from the chunk\n' +
                    '6. NEVER cite just item names - include quantities/specifications\n' +
                    '7. Be confident and direct - give ONE clear answer';
            } else {
                console.log('[RAG] No relevant chunks found in selected files');
            }
        } catch (error) {
            console.warn('[RAG] Search failed, continuing without RAG context:', error);
        }
    }

    // ✅ REQUIREMENT 1: System prompt MUST ALWAYS include base + RAG context
    const baseSystemPrompt = constructBaseSystemPrompt(activeFiles.length > 0, activeSources.length > 0, activeSources, activeFiles);
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
            
            const usage = await sendMessageToGemini(modelId, apiKey, geminiMessage, activeFiles, onStream, finalSystemPrompt, conversationHistory);
            return usage;
        } else if (model.provider === 'openai' || model.provider === 'groq' || model.provider === 'cerebras') {
            // OpenAI, Groq, or Cerebras
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            
            // Helper to convert File to base64 on-the-fly (efficient - no storage overhead)
            const fileToBase64 = async (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
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
                
                // Convert images to base64 on-the-fly (only when sending, not stored)
                for (const imgFile of imageFiles) {
                    if (imgFile.fileHandle) {
                        try {
                            const base64 = await fileToBase64(imgFile.fileHandle);
                            const sizeKB = Math.round(imgFile.size / 1024);
                            contentParts.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${imgFile.fileHandle.type || 'image/jpeg'};base64,${base64}`
                                }
                            });
                        } catch (error) {
                            console.error(`[OpenAI] Failed to convert image ${imgFile.name}:`, error);
                        }
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
        } else if (model.provider === 'openrouter') {
            // OpenRouter
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            
            // Helper to convert File to base64 on-the-fly (efficient - no storage overhead)
            const fileToBase64 = async (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };
            
            // Separate image and text files
            const imageFiles = activeFiles.filter(f => f.type === 'image');
            const textFiles = activeFiles.filter(f => f.type !== 'image');
            
            // Build messages array with system prompt
            const finalSystemPrompt = strictSystemPrompt + sourceContext;
            const messages: Array<{ role: string; content: string | any[] }> = [{ role: 'system', content: finalSystemPrompt }];
            
            // Add history (strict mode isolation)
            const recentHistory = strictMode ? [] : history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (const msg of recentHistory) {
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                messages.push({ role, content: msg.content });
            }
            
            // Add current user message with images if present
            if (imageFiles.length > 0 && model.supportsImages) {
                const contentParts: any[] = [{ type: 'text', text: newMessage }];
                
                // Convert images to base64 on-the-fly (only when sending, not stored)
                for (const imgFile of imageFiles) {
                    if (imgFile.fileHandle) {
                        try {
                            const base64 = await fileToBase64(imgFile.fileHandle);
                            const sizeKB = Math.round(imgFile.size / 1024);
                            contentParts.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${imgFile.fileHandle.type || 'image/jpeg'};base64,${base64}`
                                }
                            });
                        } catch (error) {
                            console.error(`[OpenRouter] Failed to convert image ${imgFile.name}:`, error);
                        }
                    }
                }
                
                messages.push({ role: 'user', content: contentParts });
            } else {
                // Standard text-only message
                messages.push({ role: 'user', content: newMessage });
            }
            
            // Consume the generator properly
            const generator = streamOpenRouter(model.id, apiKey, messages, onStream);
            let result;
            while (true) {
                const { done, value } = await generator.next();
                if (done) {
                    result = value;
                    break;
                }
            }
            return result;
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
        } else if (model.provider === 'ollama-cloud') {
            // Ollama Cloud
            const apiKey = getApiKeyForModel(model);
            if (!apiKey) {
                throw new Error(`API Key for ${model.name} is missing. Please open Settings (Gear Icon) to add it.`);
            }
            
            const finalSystemPrompt = strictSystemPrompt + sourceContext;
            const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: finalSystemPrompt }];
            
            // Add history (strict mode isolation)
            const recentHistory = strictMode ? [] : history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
            for (const msg of recentHistory) {
                const role = msg.role === 'model' ? 'assistant' : msg.role;
                messages.push({ role, content: msg.content });
            }
            
            // Add current user message
            messages.push({ role: 'user', content: newMessage });
            
            console.log('[Ollama Cloud] Sending request with', messages.length, 'messages');
            
            // Use model.id instead of model.modelId (which doesn't exist on ModelConfig)
            await streamOllamaCloud(model.id, messages, apiKey, onStream);
            return {};
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
            // Setup stream listener BEFORE making the request
            let streamBuffer = '';
            let allChunksReceived = false;
            
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
                        console.error('[Electron] Failed to parse stream chunk:', e, 'Raw:', dataStr);
                    }
                };
                
                // Register listener BEFORE making the request
                (window as any).electron.onStreamChunk(handleStreamChunk);
            }
            
            let result;
            if (model.provider === 'groq') {
                result = await (window as any).electron.proxyGroq(apiKey, requestBody);
            } else if (model.provider === 'openai') {
                result = await (window as any).electron.proxyOpenai(apiKey, requestBody);
            }
            
            // Cleanup listener after request completes
            if ((window as any).electron.removeStreamListener) {
                (window as any).electron.removeStreamListener();
            }
            
            console.log('[Electron] Proxy result:', { ok: result?.ok, status: result?.status, streaming: result?.streaming });
            
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
    } else if ((model.provider as string) === 'cerebras') {
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
