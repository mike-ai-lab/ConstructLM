import { Message, ProcessedFile } from '../types';

export interface ChatSession {
  id: string;
  name: string;
  modelId: string;
  messages: Message[];
  fileIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMetadata {
  id: string;
  name: string;
  modelId: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

class ChatRegistryService {
  private readonly STORAGE_KEY = 'constructlm_chats';
  private readonly FILES_KEY = 'constructlm_files';
  private readonly MAX_MESSAGES_PER_CHAT = 50;
  private readonly MAX_CHATS = 10;

  generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllChats(): ChatMetadata[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      const chats: ChatSession[] = JSON.parse(stored);
      return chats.map(chat => ({
        id: chat.id,
        name: chat.name,
        modelId: chat.modelId,
        messageCount: chat.messages.length,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }));
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  getChat(chatId: string): ChatSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      const chats: ChatSession[] = JSON.parse(stored);
      return chats.find(chat => chat.id === chatId) || null;
    } catch (error) {
      console.error('Error loading chat:', error);
      return null;
    }
  }

  saveChat(chat: ChatSession): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      let chats: ChatSession[] = stored ? JSON.parse(stored) : [];
      const existingIndex = chats.findIndex(c => c.id === chat.id);
      
      // Trim messages if exceeding limit
      const trimmedChat = {
        ...chat,
        messages: chat.messages.slice(-this.MAX_MESSAGES_PER_CHAT),
        updatedAt: Date.now()
      };
      
      if (existingIndex >= 0) {
        chats[existingIndex] = trimmedChat;
      } else {
        chats.push(trimmedChat);
      }
      
      // Keep only most recent chats
      if (chats.length > this.MAX_CHATS) {
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
        chats = chats.slice(0, this.MAX_CHATS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
      console.error('Error saving chat:', error);
    }
  }

  private handleQuotaExceeded(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      let chats: ChatSession[] = JSON.parse(stored);
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      chats = chats.slice(0, 5).map(chat => ({
        ...chat,
        messages: chat.messages.slice(-20)
      }));
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  deleteChat(chatId: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      const chats: ChatSession[] = JSON.parse(stored);
      const filtered = chats.filter(chat => chat.id !== chatId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }

  createNewChat(name: string, modelId: string): ChatSession {
    const chat: ChatSession = {
      id: this.generateChatId(),
      name,
      modelId,
      messages: [{
        id: 'intro',
        role: 'model',
        content: 'Hello! I am ConstructLM, your AI assistant. \n\nI can help you with any questions or tasks. You can also upload documents (PDF, Excel, images, etc.) or drag files here for analysis. \n\n**Tip:** Type "@" in the chat to mention a specific file.',
        timestamp: Date.now()
      }],
      fileIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.saveChat(chat);
    return chat;
  }

  saveFiles(files: ProcessedFile[]): void {
    try {
      const fileMap: Record<string, ProcessedFile> = {};
      files.forEach(file => {
        fileMap[file.id] = file;
      });
      localStorage.setItem(this.FILES_KEY, JSON.stringify(fileMap));
    } catch (error) {
      console.error('Error saving files:', error);
    }
  }

  getFiles(fileIds: string[]): ProcessedFile[] {
    try {
      const stored = localStorage.getItem(this.FILES_KEY);
      if (!stored) return [];
      const fileMap: Record<string, ProcessedFile> = JSON.parse(stored);
      return fileIds.map(id => fileMap[id]).filter(Boolean);
    } catch (error) {
      console.error('Error loading files:', error);
      return [];
    }
  }
}

export const chatRegistry = new ChatRegistryService();