import { get, set, del, keys } from 'idb-keyval';
import { Message, ProcessedFile } from '../types';

/**
 * Chat History Service
 * 
 * Manages persistent storage of chat sessions with:
 * - Individual chat sessions with metadata
 * - Automatic session creation and updates
 * - Search and filtering capabilities
 * - Efficient storage with IndexedDB
 */

export interface ChatSession {
  id: string;
  title: string;
  description?: string;
  messages: Message[];
  files: ProcessedFile[];
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatListItem {
  id: string;
  title: string;
  description?: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string; // First message preview
}

const CHAT_STORAGE_PREFIX = 'chat_';
const CHAT_INDEX_KEY = 'chat_index';
const ACTIVE_CHAT_KEY = 'active_chat_id';

/**
 * Generate a chat title from the first user message
 */
const generateChatTitle = (messages: Message[]): string => {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';
  
  const title = firstUserMsg.content.substring(0, 50).trim();
  return title.length > 0 ? title : 'New Chat';
};

/**
 * Create a new chat session
 */
export const createChatSession = async (
  messages: Message[],
  files: ProcessedFile[],
  modelId: string
): Promise<ChatSession> => {
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const title = generateChatTitle(messages);
  
  const session: ChatSession = {
    id: chatId,
    title,
    messages,
    files,
    modelId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: messages.length
  };

  // Save the chat session
  await set(`${CHAT_STORAGE_PREFIX}${chatId}`, session);
  
  // Update the index
  await updateChatIndex();
  
  // Set as active
  await setActiveChatId(chatId);
  
  console.log(`[ChatHistory] Created new session: ${chatId}`);
  return session;
};

/**
 * Update an existing chat session
 */
export const updateChatSession = async (
  chatId: string,
  messages: Message[],
  files: ProcessedFile[]
): Promise<ChatSession | null> => {
  const session = await getChatSession(chatId);
  if (!session) return null;

  const updated: ChatSession = {
    ...session,
    messages,
    files,
    updatedAt: Date.now(),
    messageCount: messages.length,
    title: generateChatTitle(messages) // Update title if needed
  };

  await set(`${CHAT_STORAGE_PREFIX}${chatId}`, updated);
  await updateChatIndex();
  
  console.log(`[ChatHistory] Updated session: ${chatId}`);
  return updated;
};

/**
 * Get a specific chat session
 */
export const getChatSession = async (chatId: string): Promise<ChatSession | null> => {
  try {
    const session = await get(`${CHAT_STORAGE_PREFIX}${chatId}`);
    return session || null;
  } catch (error) {
    console.error(`[ChatHistory] Error loading chat ${chatId}:`, error);
    return null;
  }
};

/**
 * Get all chat sessions (list view)
 */
export const getAllChatSessions = async (): Promise<ChatListItem[]> => {
  try {
    const allKeys = await keys();
    const chatKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(CHAT_STORAGE_PREFIX));
    
    const sessions: ChatListItem[] = [];
    
    for (const key of chatKeys) {
      const session = await get(key);
      if (session) {
        const firstMsg = session.messages?.find((m: Message) => m.role === 'user')?.content || '';
        sessions.push({
          id: session.id,
          title: session.title,
          description: session.description,
          modelId: session.modelId,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: session.messageCount,
          preview: firstMsg.substring(0, 100)
        });
      }
    }
    
    // Sort by most recent first
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('[ChatHistory] Error loading all chats:', error);
    return [];
  }
};

/**
 * Delete a chat session
 */
export const deleteChatSession = async (chatId: string): Promise<boolean> => {
  try {
    await del(`${CHAT_STORAGE_PREFIX}${chatId}`);
    await updateChatIndex();
    
    // If this was the active chat, clear it
    const activeId = await getActiveChatId();
    if (activeId === chatId) {
      await setActiveChatId(null);
    }
    
    console.log(`[ChatHistory] Deleted session: ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[ChatHistory] Error deleting chat ${chatId}:`, error);
    return false;
  }
};

/**
 * Rename a chat session
 */
export const renameChatSession = async (chatId: string, newTitle: string): Promise<ChatSession | null> => {
  const session = await getChatSession(chatId);
  if (!session) return null;

  const updated: ChatSession = {
    ...session,
    title: newTitle,
    updatedAt: Date.now()
  };

  await set(`${CHAT_STORAGE_PREFIX}${chatId}`, updated);
  await updateChatIndex();
  
  console.log(`[ChatHistory] Renamed session: ${chatId} to "${newTitle}"`);
  return updated;
};

/**
 * Search chats by title or content
 */
export const searchChats = async (query: string): Promise<ChatListItem[]> => {
  const allChats = await getAllChatSessions();
  const lowerQuery = query.toLowerCase();
  
  return allChats.filter(chat => 
    chat.title.toLowerCase().includes(lowerQuery) ||
    chat.preview.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get active chat ID
 */
export const getActiveChatId = async (): Promise<string | null> => {
  try {
    return await get(ACTIVE_CHAT_KEY) || null;
  } catch (error) {
    return null;
  }
};

/**
 * Set active chat ID
 */
export const setActiveChatId = async (chatId: string | null): Promise<void> => {
  if (chatId === null) {
    await del(ACTIVE_CHAT_KEY);
  } else {
    await set(ACTIVE_CHAT_KEY, chatId);
  }
};

/**
 * Update the chat index (for quick lookups)
 */
const updateChatIndex = async (): Promise<void> => {
  try {
    const allKeys = await keys();
    const chatKeys = allKeys
      .filter(k => typeof k === 'string' && k.startsWith(CHAT_STORAGE_PREFIX))
      .map(k => (k as string).replace(CHAT_STORAGE_PREFIX, ''));
    
    await set(CHAT_INDEX_KEY, chatKeys);
  } catch (error) {
    console.error('[ChatHistory] Error updating index:', error);
  }
};

/**
 * Clear all chat history (destructive)
 */
export const clearAllChats = async (): Promise<boolean> => {
  try {
    const allKeys = await keys();
    const chatKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(CHAT_STORAGE_PREFIX));
    
    for (const key of chatKeys) {
      await del(key);
    }
    
    await del(CHAT_INDEX_KEY);
    await del(ACTIVE_CHAT_KEY);
    
    console.log('[ChatHistory] Cleared all chats');
    return true;
  } catch (error) {
    console.error('[ChatHistory] Error clearing chats:', error);
    return false;
  }
};

/**
 * Export chat as JSON
 */
export const exportChat = async (chatId: string): Promise<string | null> => {
  const session = await getChatSession(chatId);
  if (!session) return null;
  
  return JSON.stringify(session, null, 2);
};

/**
 * Get chat statistics
 */
export const getChatStats = async (): Promise<{
  totalChats: number;
  totalMessages: number;
  oldestChat: number;
  newestChat: number;
}> => {
  const allChats = await getAllChatSessions();
  
  if (allChats.length === 0) {
    return {
      totalChats: 0,
      totalMessages: 0,
      oldestChat: 0,
      newestChat: 0
    };
  }
  
  return {
    totalChats: allChats.length,
    totalMessages: allChats.reduce((sum, chat) => sum + chat.messageCount, 0),
    oldestChat: Math.min(...allChats.map(c => c.createdAt)),
    newestChat: Math.max(...allChats.map(c => c.updatedAt))
  };
};
