import { Message, ProcessedFile } from '../../types';
import { sendMessageToLLM } from '../../services/llmService';
import { contextManager } from '../../services/contextManager';
import { activityLogger } from '../../services/activityLogger';
import { diagnosticLogger } from '../../services/diagnosticLogger';
import { embeddingService } from '../../services/embeddingService';
import { UploadedImage } from '../components/ImageUploadPanel';
import { sessionPersistence } from '../../services/sessionPersistence';

export const createMessageHandlers = (
  input: string,
  setInput: (input: string) => void,
  files: ProcessedFile[],
  messages: Message[],
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
  isGenerating: boolean,
  setIsGenerating: (generating: boolean) => void,
  activeModelId: string,
  setShowMentionMenu: (show: boolean) => void,
  saveCurrentChat: (updateTimestamp: boolean, sourceType?: 'files' | 'links') => void,
  sources: any[] = [],
  selectedSourceIds: string[] = [],
  uploadedImages: UploadedImage[] = [],
  setUploadedImages: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void,
  onShowContextWarning?: (data: { totalTokens: number; filesUsed: string[]; selectedCount: number; onProceed: () => void }) => void,
  updateChatName?: (name: string) => void,
  currentChatId?: string | null,
  messagesEndRef?: React.RefObject<HTMLDivElement>
) => {
  
  const generateChatTitle = async (userMessage: string) => {
    try {
      const titlePrompt = `You must create a descriptive 3-word title that summarizes the TOPIC of this user request. DO NOT just copy the first 3 words.

User request: "${userMessage.slice(0, 200)}"

Bad examples (DO NOT DO THIS):
- "tell me about" ❌
- "how do I" ❌
- "can you explain" ❌

Good examples:
- Request: "tell me about react hooks" → Title: "React Hooks Overview"
- Request: "how do I sort arrays in python" → Title: "Python Array Sorting"
- Request: "can you explain machine learning" → Title: "Machine Learning Explained"

Extract the KEY TOPIC and create a proper title. Output ONLY 3 words, no punctuation.`;

      await sendMessageToLLM(
        activeModelId,
        [],
        titlePrompt,
        [],
        (chunk) => {
          if (chunk && updateChatName) {
            updateChatName(chunk.trim());
          }
        },
        []
      );
    } catch (error) {
      console.error('Failed to generate chat title:', error);
    }
  };
  const handleSendMessage = async (messageText?: string, retryMessageId?: string): Promise<string | null> => {
    const textToSend = typeof messageText === 'string' ? messageText : input;
    if (!textToSend || typeof textToSend !== 'string' || !textToSend.trim() || isGenerating) return null;

    // Check if images are attached and model support
    let imageFiles: ProcessedFile[] = [];
    let imagePlaceholderText = '';
    
    if (uploadedImages.length > 0) {
      const { MODEL_REGISTRY } = await import('../../services/modelRegistry');
      const currentModel = MODEL_REGISTRY.find(m => m.id === activeModelId);
      
      if (currentModel?.supportsImages) {
        // Model supports images - convert to ProcessedFile format
        imageFiles = uploadedImages.map(img => ({
          id: img.id,
          name: img.file.name,
          type: 'image' as const,
          content: '',
          size: img.size,
          status: 'ready' as const,
          fileHandle: img.file,
          uploadedAt: Date.now()
        }));
        
        console.log('[MessageHandler] Sending images to vision model:', imageFiles.length);
      } else {
        // Model doesn't support images - create placeholder text
        const imageNames = uploadedImages.map(img => img.file.name).join(', ');
        imagePlaceholderText = uploadedImages.length === 1
          ? `\n\n[Image attached: ${imageNames}]`
          : `\n\n[${uploadedImages.length} images attached: ${imageNames}]`;
        
        console.log('[MessageHandler] Model does not support images, using placeholder text');
        activityLogger.logWarning('MESSAGE', 'Images sent as placeholder to non-vision model', { 
          modelId: activeModelId,
          imageCount: uploadedImages.length 
        });
      }
    }

    // Append placeholder text if needed
    const finalTextToSend = textToSend + imagePlaceholderText;

    // Track user query
    activityLogger.logRAGUserQuery(finalTextToSend, files.length + imageFiles.length);

    // Priority: @mentioned files override sources panel selection
    const mentionedFiles = files.filter(f => textToSend.includes(`@${f.name}`));
    const selectedFiles = mentionedFiles.length > 0 ? mentionedFiles : files.filter(f => selectedSourceIds.includes(f.id));

    console.log('[MessageHandler] Selected files:', selectedFiles.map(f => ({ id: f.id, name: f.name, type: f.type })));
    console.log('[MessageHandler] Image files:', imageFiles.length);
    console.log('[MessageHandler] Selected source IDs:', selectedSourceIds);

    activityLogger.logInfo('MESSAGE', 'Processing user message', { 
      messageLength: finalTextToSend.length, 
      filesSelected: selectedFiles.length,
      imagesAttached: uploadedImages.length,
      imagesSentAsFiles: imageFiles.length,
      sourcesSelected: selectedSourceIds.length,
      modelId: activeModelId
    });

    // ✅ CRITICAL FIX: Create user message and AI bubble IMMEDIATELY before heavy processing
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: finalTextToSend,
      timestamp: Date.now(),
      sourcesUsed: []
    };

    const modelMsgId = retryMessageId || `model-${Date.now()}`;
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
      modelId: activeModelId,
      sourcesUsed: []
    };

    // Add messages to UI IMMEDIATELY
    if (!retryMessageId) {
      setMessages(prev => [...prev, userMsg, modelMsg]);
      setInput('');
      // Clear input draft for current chat from session persistence
      if (currentChatId) {
        sessionPersistence.clearChatDraft(currentChatId);
      }
      // Clear uploaded images after sending
      setUploadedImages([]);
      // Clean up blob URLs
      imageFiles.forEach(img => {
        if (img.fileHandle) {
          const preview = URL.createObjectURL(img.fileHandle);
          URL.revokeObjectURL(preview);
        }
      });
      const actualFileNames = selectedFiles.map(f => f.name);
      activityLogger.logMessageSent('current', finalTextToSend.length, activeModelId, actualFileNames);
    } else {
      setMessages(prev => prev.map(m => m.id === retryMessageId ? { ...modelMsg, id: retryMessageId } : m));
    }
    
    setShowMentionMenu(false);
    setIsGenerating(true);

    // Force immediate UI render before heavy processing
    await new Promise(resolve => setTimeout(resolve, 0));

    // ✅ AUTO-SCROLL: Scroll to bottom after messages are added
    setTimeout(() => {
      if (messagesEndRef?.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);

    // NOW do the heavy context processing (RAG/embeddings)
    const contextResult = await contextManager.selectContext(finalTextToSend, selectedFiles, activeModelId);
    console.log('[MessageHandler] Context result:', { 
      chunksCount: contextResult.chunks.length, 
      totalTokens: contextResult.totalTokens,
      filesUsed: contextResult.filesUsed
    });
    activityLogger.logRAGSemanticSearch(finalTextToSend, 'hybrid', contextResult.chunks.length);
    
    activityLogger.logContextProcessing(contextResult.totalTokens, contextResult.filesUsed.length, contextResult.chunks.length);
    
    const efficiency = contextResult.totalTokens > 0 ? Math.round((1 - contextResult.totalTokens / 10000) * 100) : 0;
    activityLogger.logRAGContextSelection(contextResult.chunks.length, contextResult.totalTokens, efficiency);
    
    if (contextResult.totalTokens > 50000 && onShowContextWarning) {
      const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
      activityLogger.logWarning('CONTEXT', 'Large context warning shown', { totalTokens: contextResult.totalTokens, filesUsed: fileNames.length });
      onShowContextWarning({
        totalTokens: contextResult.totalTokens,
        filesUsed: fileNames,
        selectedCount: selectedFiles.length,
        onProceed: () => sendMessageWithContext(contextResult, selectedFiles, imageFiles, finalTextToSend, retryMessageId, modelMsgId)
      });
      return null;
    }

    return await sendMessageWithContext(contextResult, selectedFiles, imageFiles, finalTextToSend, retryMessageId, modelMsgId);
  };

  const sendMessageWithContext = async (contextResult: any, selectedFiles: ProcessedFile[], imageFiles: ProcessedFile[], textToSend: string, retryMessageId?: string, modelMsgId?: string): Promise<string | null> => {
    console.log('[MessageHandler] Context result:', { 
      totalTokens: contextResult.totalTokens, 
      filesUsed: contextResult.filesUsed.length,
      chunksCount: contextResult.chunks.length,
      selectedFilesCount: selectedFiles.length,
      imageFilesCount: imageFiles.length
    });
    
    const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
    console.log('[MessageHandler] Sources:', fileNames);
    
    // Combine document files and image files for LLM
    const allFiles = [...selectedFiles, ...imageFiles];
    console.log('[MessageHandler] Sending to LLM with', selectedFiles.length, 'documents and', imageFiles.length, 'images');
    
    // Update the model message with source files
    const finalModelMsgId = modelMsgId || retryMessageId || `model-${Date.now()}`;
    setMessages(prev => prev.map(msg => 
      msg.id === finalModelMsgId ? { ...msg, sourcesUsed: fileNames } : msg
    ));

    console.log('[MessageHandler] Sending to LLM, model:', activeModelId);

    try {
      let accumText = "";
      let thinkingText = "";
      
      const fetchedSources = sources.filter(s => s.status === 'fetched' && s.selected !== false);
      console.log('[MessageHandler] Fetched sources:', fetchedSources.length);
      
      // Determine source type for first message
      const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
      const sourceType = isFirstUserMessage ? (fetchedSources.length > 0 ? 'links' : 'files') : undefined;
      
      activityLogger.logRequestSent(activeModelId, textToSend.length, allFiles.length, fetchedSources.length);
      
      const responseStartTime = Date.now();
      
      const usage = await sendMessageToLLM(
        activeModelId,
        messages,
        textToSend,
        allFiles, // Send both documents and images
        (chunk, thinking) => {
          accumText += chunk;
          if (thinking) thinkingText = thinking;
          
          // Update immediately - streaming is already throttled at the service level
          setMessages(prev => prev.map(msg => 
            msg.id === finalModelMsgId ? { ...msg, content: accumText, thinking: thinkingText || undefined } : msg
          ));
        },
        fetchedSources
      );
      
      // ✅ ENSURE FINAL UPDATE AFTER STREAMING COMPLETES
      setMessages(prev => prev.map(msg => 
        msg.id === finalModelMsgId ? { ...msg, content: accumText, thinking: thinkingText || undefined } : msg
      ));
      
      console.log('[MessageHandler] LLM response complete. Usage:', usage);
      console.log('[MessageHandler] Final content length:', accumText.length);
      
      const citationsCount = (accumText.match(/\{\{citation:/g) || []).length;
      const responseTime = Date.now() - responseStartTime;
      activityLogger.logRAGAIResponse(activeModelId, accumText.length, citationsCount, responseTime);
      
      activityLogger.logResponseReceived(activeModelId, accumText.length, usage?.inputTokens, usage?.outputTokens, usage?.totalTokens);
      activityLogger.logMessageReceived('current', accumText.length, activeModelId, usage);
      
      // DIAGNOSTIC: 7. FINAL ANSWER LOG
      diagnosticLogger.log('7. FINAL_ANSWER', {
        model_name: activeModelId,
        final_answer_text: accumText,
        answer_length: accumText.length,
        thinking_text: thinkingText || null,
        usage_stats: usage,
        sources_used: fileNames,
        timestamp: Date.now()
      });
      
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        setMessages(prev => prev.map(msg => 
          msg.id === finalModelMsgId 
            ? { ...msg, usage: { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0 } } 
            : msg
        ));
      }
      saveCurrentChat(true, sourceType);
      
      // Auto-generate chat title on first user message
      if (isFirstUserMessage && !retryMessageId) {
        generateChatTitle(textToSend);
      }
      
      return accumText;
    } catch (error: any) {
      console.error('[MessageHandler] ERROR:', error);
      const errorMsg = error?.message || "Sorry, I encountered an error. Please check your connection.";
      activityLogger.logErrorMsg('MESSAGE', 'LLM request failed', { error: errorMsg, modelId: activeModelId });
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId ? { ...msg, content: `**Error:** ${errorMsg}` } : msg
      ));
    } finally {
      setIsGenerating(false);
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId ? { ...msg, isStreaming: false } : msg
      ));
      return null;
    }
  };

  return { handleSendMessage };
};
