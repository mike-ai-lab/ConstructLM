import { Message, ProcessedFile } from '../types';
import { greetingService } from './greetingService';

export interface ChatSession {
  id: string;
  name: string;
  modelId: string;
  messages: Message[];
  fileIds: string[];
  selectedSourceIds: string[];
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
      return chats.filter(chat => chat && chat.id).map(chat => ({
        id: chat.id,
        name: chat.name || 'Untitled Chat',
        modelId: chat.modelId || 'gemini-2.0-flash-exp',
        messageCount: (chat.messages || []).length,
        createdAt: chat.createdAt || Date.now(),
        updatedAt: chat.updatedAt || Date.now()
      }));
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  getAllFullChats(): ChatSession[] {
    const exportId = `CHAT_EXPORT_${Date.now()}`;
    console.log(`[${exportId}] Getting all full chats for export`);
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      console.log(`[${exportId}] Raw localStorage data:`, stored ? 'exists' : 'null');
      
      if (!stored) {
        console.log(`[${exportId}] No stored chats found`);
        return [];
      }
      
      const chats: ChatSession[] = JSON.parse(stored);
      console.log(`[${exportId}] Parsed ${chats.length} chats from storage`);
      
      const fullChats = chats.filter(chat => chat && chat.id).map((chat, index) => {
        const fullChat = {
          id: chat.id,
          name: chat.name || 'Untitled Chat',
          modelId: chat.modelId || 'gemini-2.0-flash-exp',
          messages: chat.messages || [],
          fileIds: chat.fileIds || [],
          createdAt: chat.createdAt || Date.now(),
          updatedAt: chat.updatedAt || Date.now()
        };
        
        console.log(`[${exportId}] Full chat ${index}:`, {
          id: fullChat.id,
          name: fullChat.name,
          messageCount: fullChat.messages.length
        });
        
        return fullChat;
      });
      
      console.log(`[${exportId}] Returning ${fullChats.length} full chats`);
      return fullChats;
      
    } catch (error) {
      console.error(`[${exportId}] Error loading full chats:`, error);
      return [];
    }
  }

  getChat(chatId: string): ChatSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      const chats: ChatSession[] = JSON.parse(stored);
      const chat = chats.find(chat => chat && chat.id === chatId);
      if (!chat) return null;
      
      // Ensure chat has required properties
      return {
        id: chat.id,
        name: chat.name || 'Untitled Chat',
        modelId: chat.modelId || 'gemini-2.0-flash-exp',
        messages: chat.messages || [],
        fileIds: chat.fileIds || [],
        selectedSourceIds: chat.selectedSourceIds || [],
        createdAt: chat.createdAt || Date.now(),
        updatedAt: chat.updatedAt || Date.now()
      };
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
        content: greetingService.generateGreeting(),
        timestamp: Date.now()
      }],
      fileIds: [],
      selectedSourceIds: [],
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

  importChats(chats: any[]): void {
    const importId = `CHAT_IMPORT_${Date.now()}`;
    console.log(`[${importId}] Starting chat import with ${chats.length} chats`);
    
    try {
      if (!Array.isArray(chats)) {
        console.error(`[${importId}] Invalid chats data - not an array:`, typeof chats);
        return;
      }
      
      console.log(`[${importId}] Raw chat data sample:`, chats.slice(0, 2));
      
      // Validate and clean chat data
      const validChats = chats.filter((chat, index) => {
        const isValid = chat && chat.id && chat.messages;
        if (!isValid) {
          console.warn(`[${importId}] Invalid chat at index ${index}:`, {
            hasChat: !!chat,
            hasId: chat?.id,
            hasMessages: chat?.messages,
            chat: chat
          });
        }
        return isValid;
      }).map((chat, index) => {
        const processed = {
          id: chat.id,
          name: chat.name || `Imported Chat ${index + 1}`,
          modelId: chat.modelId || 'gemini-2.0-flash-exp',
          messages: Array.isArray(chat.messages) ? chat.messages : [],
          fileIds: Array.isArray(chat.fileIds) ? chat.fileIds : [],
          selectedSourceIds: Array.isArray(chat.selectedSourceIds) ? chat.selectedSourceIds : [],
          createdAt: chat.createdAt || Date.now(),
          updatedAt: chat.updatedAt || Date.now()
        };
        
        console.log(`[${importId}] Processed chat ${index}:`, {
          id: processed.id,
          name: processed.name,
          messageCount: processed.messages.length
        });
        
        return processed;
      });
      
      console.log(`[${importId}] Storing ${validChats.length} valid chats to localStorage`);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validChats));
      
      // Verify storage
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      console.log(`[${importId}] Verification: ${parsed.length} chats stored successfully`);
      
    } catch (error) {
      console.error(`[${importId}] Error importing chats:`, error);
    }
  }
}

export const chatRegistry = new ChatRegistryService();