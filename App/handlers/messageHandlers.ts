import { Message, ProcessedFile } from '../../types';
import { sendMessageToLLM } from '../../services/llmService';
import { contextManager } from '../../services/contextManager';
import { activityLogger } from '../../services/activityLogger';
import { diagnosticLogger } from '../../services/diagnosticLogger';
import { embeddingService } from '../../services/embeddingService';

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
  onShowContextWarning?: (data: { totalTokens: number; filesUsed: string[]; selectedCount: number; onProceed: () => void }) => void,
  updateChatName?: (name: string) => void
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

    // Track user query
    activityLogger.logRAGUserQuery(textToSend, files.length);

    // Priority: @mentioned files override sources panel selection
    const mentionedFiles = files.filter(f => textToSend.includes(`@${f.name}`));
    const selectedFiles = mentionedFiles.length > 0 ? mentionedFiles : files.filter(f => selectedSourceIds.includes(f.id));

    activityLogger.logInfo('MESSAGE', 'Processing user message', { 
      messageLength: textToSend.length, 
      filesSelected: selectedFiles.length,
      sourcesSelected: selectedSourceIds.length,
      modelId: activeModelId
    });

    const contextResult = await contextManager.selectContext(textToSend, selectedFiles, activeModelId);
    activityLogger.logRAGSemanticSearch(textToSend, 'hybrid', contextResult.chunks.length);
    
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
        onProceed: () => sendMessageWithContext(contextResult, selectedFiles, textToSend, retryMessageId)
      });
      return null;
    }

    return await sendMessageWithContext(contextResult, selectedFiles, textToSend, retryMessageId);
  };

  const sendMessageWithContext = async (contextResult: any, selectedFiles: ProcessedFile[], textToSend: string, retryMessageId?: string): Promise<string | null> => {
    console.log('[MessageHandler] Context result:', { 
      totalTokens: contextResult.totalTokens, 
      filesUsed: contextResult.filesUsed.length,
      chunksCount: contextResult.chunks.length,
      selectedFilesCount: selectedFiles.length
    });
    
    const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
    console.log('[MessageHandler] Sources:', fileNames);
    
    // Always use selected files - chunks are optional optimization
    const excerptedFiles: ProcessedFile[] = selectedFiles;
    console.log('[MessageHandler] Excerpted files:', excerptedFiles.map(f => ({ name: f.name, contentLength: f.content?.length || 0 })));
    
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      sourcesUsed: fileNames
    };

    if (!retryMessageId) {
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      const actualFileNames = selectedFiles.map(f => f.name);
      activityLogger.logMessageSent('current', textToSend.length, activeModelId, actualFileNames);
    }
    setShowMentionMenu(false);
    setIsGenerating(true);
    
    console.log('[MessageHandler] Sending to LLM, model:', activeModelId);

    const modelMsgId = retryMessageId || `model-${Date.now()}`;
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
      modelId: activeModelId,
      sourcesUsed: fileNames
    };
    
    if (!retryMessageId) {
      setMessages(prev => [...prev, modelMsg]);
    } else {
      setMessages(prev => prev.map(m => m.id === retryMessageId ? { ...modelMsg, id: retryMessageId } : m));
    }

    try {
      let accumText = "";
      let thinkingText = "";
      let updateTimer: NodeJS.Timeout | null = null;
      
      const fetchedSources = sources.filter(s => s.status === 'fetched' && s.selected !== false);
      console.log('[MessageHandler] Fetched sources:', fetchedSources.length);
      
      // Determine source type for first message
      const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
      const sourceType = isFirstUserMessage ? (fetchedSources.length > 0 ? 'links' : 'files') : undefined;
      
      activityLogger.logRequestSent(activeModelId, textToSend.length, excerptedFiles.length, fetchedSources.length);
      
      const responseStartTime = Date.now();
      
      const usage = await sendMessageToLLM(
        activeModelId,
        messages,
        userMsg.content,
        excerptedFiles,
        (chunk, thinking) => {
          accumText += chunk;
          if (thinking) thinkingText = thinking;
          if (updateTimer) clearTimeout(updateTimer);
          updateTimer = setTimeout(() => {
            setMessages(prev => prev.map(msg => 
              msg.id === modelMsgId ? { ...msg, content: accumText, thinking: thinkingText || undefined } : msg
            ));
          }, 50);
        },
        fetchedSources
      );
      
      if (updateTimer) clearTimeout(updateTimer);
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId ? { ...msg, content: accumText, thinking: thinkingText || undefined } : msg
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
          msg.id === modelMsgId 
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
