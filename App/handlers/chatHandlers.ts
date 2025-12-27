import { Message } from '../../types';
import { chatRegistry, ChatSession, ChatMetadata } from '../../services/chatRegistry';
import { activityLogger } from '../../services/activityLogger';

export const createChatHandlers = (
  currentChatId: string | null,
  setCurrentChatId: (id: string | null) => void,
  chats: ChatMetadata[],
  setChats: (chats: ChatMetadata[] | ((prev: ChatMetadata[]) => ChatMetadata[])) => void,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  activeModelId: string,
  setActiveModelId: (id: string) => void,
  selectedSourceIds: string[],
  setSelectedSourceIds: (ids: string[]) => void
) => {
  const loadChat = (chatId: string) => {
    const chat = chatRegistry.getChat(chatId);
    if (chat) {
      activityLogger.logAction('CHAT', 'Chat loaded', { chatId, messageCount: chat.messages.length, modelId: chat.modelId });
      setCurrentChatId(chatId);
      sessionStorage.setItem('currentChatId', chatId);
      localStorage.setItem('lastChatId', chatId);
      setMessages(chat.messages);
      setActiveModelId(chat.modelId);
      setSelectedSourceIds(chat.selectedSourceIds || []);
    }
  };

  const generateChatName = (messages: Message[]): string => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'New Chat';
    const firstMessage = userMessages[0].content;
    const words = firstMessage.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const saveCurrentChat = (updateTimestamp: boolean = false) => {
    if (!currentChatId) return;
    const existingChat = chats.find(c => c.id === currentChatId);
    const chat: ChatSession = {
      id: currentChatId,
      name: generateChatName(messages),
      modelId: activeModelId,
      messages,
      fileIds: [],
      selectedSourceIds,
      createdAt: existingChat?.createdAt || Date.now(),
      updatedAt: updateTimestamp ? Date.now() : (existingChat?.updatedAt || Date.now())
    };
    chatRegistry.saveChat(chat);
    activityLogger.logAction('CHAT', 'Chat saved', { chatId: currentChatId, messageCount: messages.length });
    setChats(prev => {
      const existing = prev.find(c => c.id === currentChatId);
      const updated = {
        id: chat.id,
        name: chat.name,
        modelId: chat.modelId,
        messageCount: chat.messages.length,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
      if (existing) {
        return prev.map(c => c.id === currentChatId ? updated : c);
      } else {
        return [...prev, updated];
      }
    });
  };

  const handleCreateChat = () => {
    const hasUserMessages = messages.some(m => m.role === 'user');
    if (!hasUserMessages) {
      return;
    }
    
    saveCurrentChat();
    const newChat = chatRegistry.createNewChat('New Chat', activeModelId);
    activityLogger.logChatCreated(newChat.id, activeModelId);
    setCurrentChatId(newChat.id);
    sessionStorage.setItem('currentChatId', newChat.id);
    localStorage.setItem('lastChatId', newChat.id);
    setMessages(newChat.messages);
    setSelectedSourceIds([]);
    setChats(prev => [{
      id: newChat.id,
      name: newChat.name,
      modelId: newChat.modelId,
      messageCount: newChat.messages.length,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt
    }, ...prev]);
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId === currentChatId) return;
    saveCurrentChat();
    loadChat(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    chatRegistry.deleteChat(chatId);
    activityLogger.logChatDeleted(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (chatId === currentChatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        loadChat(remaining[0].id);
      } else {
        handleCreateChat();
      }
    }
  };

  return {
    loadChat,
    saveCurrentChat,
    handleCreateChat,
    handleSelectChat,
    handleDeleteChat,
  };
};
