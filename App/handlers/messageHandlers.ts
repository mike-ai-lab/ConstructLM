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
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const selectedFiles = files.filter(f => selectedSourceIds.includes(f.id));
    
    if (selectedFiles.length === 0) {
      const helpMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**No sources selected**\n\nPlease select sources using the checkboxes in the sidebar.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }, helpMsg]);
      setInput('');
      return;
    }

    const contextResult = await contextManager.selectContext(input, selectedFiles, activeModelId);
    
    if (contextResult.totalTokens > 50000 && onShowContextWarning) {
      const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
      onShowContextWarning({
        totalTokens: contextResult.totalTokens,
        filesUsed: fileNames,
        selectedCount: selectedFiles.length,
        onProceed: () => sendMessageWithContext(contextResult, selectedFiles)
      });
      return;
    }

    await sendMessageWithContext(contextResult, selectedFiles);
  };

  const sendMessageWithContext = async (contextResult: any, selectedFiles: ProcessedFile[]) => {
    console.log('[MessageHandler] Context result:', { 
      totalTokens: contextResult.totalTokens, 
      filesUsed: contextResult.filesUsed.length,
      chunksCount: contextResult.chunks.length 
    });
    
    const fileNames = contextManager.getFileNames(contextResult.filesUsed, files);
    console.log('[MessageHandler] Sources:', fileNames);
    
    // Create excerpted files for LLM - if no chunks, use full files
    const excerptedFiles: ProcessedFile[] = contextResult.chunks.length > 0
      ? contextResult.chunks.map((chunk: any) => {
          const originalFile = selectedFiles.find(f => f.id === chunk.fileId);
          return {
            id: chunk.fileId,
            name: originalFile?.name || 'Unknown',
            content: chunk.content,
            type: originalFile?.type || 'text/plain',
            size: chunk.content.length,
            uploadedAt: originalFile?.uploadedAt || Date.now()
          };
        })
      : selectedFiles; // Use full files if no chunks
    
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      sourcesUsed: fileNames
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowMentionMenu(false);
    setIsGenerating(true);
    
    console.log('[MessageHandler] Sending to LLM, model:', activeModelId);

    const modelMsgId = `model-${Date.now()}`;
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
      modelId: activeModelId,
      sourcesUsed: fileNames
    };
    
    setMessages(prev => [...prev, modelMsg]);

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
      saveCurrentChat(true);
    }
  };

  return { handleSendMessage };
};
