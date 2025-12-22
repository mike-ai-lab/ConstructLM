import { useState } from 'react';
import { Message } from '../types';
import { ChatMetadata } from '../services/chatRegistry';

export const useChatState = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  return {
    currentChatId,
    setCurrentChatId,
    chats,
    setChats,
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
  };
};
