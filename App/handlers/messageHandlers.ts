import { Message, ProcessedFile } from '../../types';
import { sendMessageToLLM } from '../../services/llmService';

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
  sources: any[] = []
) => {
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
    const activeContextFiles = mentionedFiles;
    
    const totalTokens = activeContextFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
    if (totalTokens > 50000) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**Token Limit Exceeded**\\n\\nYou're trying to send ~${(totalTokens / 1000).toFixed(0)}k tokens, but most models have a limit of 30-50k tokens.\\n\\n**Solution:** Remove some @mentions or use fewer/smaller files.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }, errorMsg]);
      setInput('');
      return;
    }

    const displayContent = input.replace(/@([^\s]+)/g, '$1');
    
    if (files.length > 0 && activeContextFiles.length === 0 && input.toLowerCase().includes('file')) {
      const helpMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**Tip:** You have ${files.length} file(s) uploaded, but none are mentioned.\\n\\nUse **@filename** to include files in your question. Type **@** to see the list.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: displayContent, timestamp: Date.now() }, helpMsg]);
      setInput('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowMentionMenu(false);
    setIsGenerating(true);

    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      modelId: activeModelId
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      let accumText = "";
      let thinkingText = "";
      let updateTimer: NodeJS.Timeout | null = null;
      
      const fetchedSources = sources.filter(s => s.status === 'fetched');
      
      const usage = await sendMessageToLLM(
        activeModelId,
        messages,
        userMsg.content,
        activeContextFiles,
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
      
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { ...msg, usage: { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0 } } 
            : msg
        ));
      }
    } catch (error: any) {
      console.error(error);
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
