import { Chat } from '../types/chat';
import { Message } from '../types';

const CHATS_KEY = 'constructlm_chats';
const ACTIVE_CHAT_KEY = 'constructlm_active_chat';

export const saveChats = (chats: Chat[]) => {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
};

export const loadChats = (): Chat[] => {
  const stored = localStorage.getItem(CHATS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const setActiveChat = (chatId: string) => {
  localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
};

export const getActiveChat = (): string | null => {
  return localStorage.getItem(ACTIVE_CHAT_KEY);
};

export const createNewChat = (): Chat => {
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [{
      id: 'intro',
      role: 'model',
      content: 'Hello. I am ConstructLM. Upload your project documents (PDF, Excel) or a whole folder to begin.',
      timestamp: Date.now()
    }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

export const generateChatTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(' ').slice(0, 4);
  return words.join(' ') + (words.length >= 4 ? '...' : '');
};