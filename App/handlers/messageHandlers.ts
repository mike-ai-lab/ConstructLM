import { Message, ProcessedFile } from '../../types';
import { sendMessageToLLM } from '../../services/llmService';
import { contextManager } from '../../services/contextManager';

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
  saveCurrentChat: (updateTimestamp: boolean) => void,
  sources: any[] = [],
  selectedSourceIds: string[] = [],
  onShowContextWarning?: (data: { totalTokens: number; filesUsed: string[]; selectedCount: number; onProceed: () => void }) => void
) => {
  const handleSendMessage = async (messageText?: string, retryMessageId?: string): Promise<string | null> => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isGenerating) return null;

    // Priority: @mentioned files override sources panel selection
    const mentionedFiles = files.filter(f => textToSend.includes(`@${f.name}`));
    const selectedFiles = mentionedFiles.length > 0 ? mentionedFiles : files.filter(f => selectedSourceIds.includes(f.id));

    const contextResult = await contextManager.selectContext(textToSend, selectedFiles, activeModelId);
    
    if (contextResult.totalTokens > 50000 && onShowContextWarning) {
      const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
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
      
      const fetchedSources = sources.filter(s => s.status === 'fetched');
      console.log('[MessageHandler] Fetched sources:', fetchedSources.length);
      
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
      
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { ...msg, usage: { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0 } } 
            : msg
        ));
      }
      saveCurrentChat(true);
      return accumText;
    } catch (error: any) {
      console.error('[MessageHandler] ERROR:', error);
      const errorMsg = error?.message || "Sorry, I encountered an error. Please check your connection.";
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
