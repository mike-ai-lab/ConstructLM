
import { get, set } from 'idb-keyval';
import { ProcessedFile, Message } from '../types';
import { createChatSession, updateChatSession, getActiveChatId, getChatSession } from './chatHistoryService';

const LOCAL_STORAGE_KEY = 'constructlm_workspace';
const ACTIVE_MODEL_KEY = 'constructlm_active_model';

export interface WorkspaceData {
  files: ProcessedFile[];
  messages: Message[];
  lastUpdated: number;
}

/**
 * Save workspace and create/update chat session
 * This is called automatically as user types and sends messages
 */
export const saveWorkspaceLocal = async (
  files: ProcessedFile[],
  messages: Message[],
  modelId?: string
) => {
  try {
    // Get or create active chat session
    const activeChatId = await getActiveChatId();
    
    if (activeChatId) {
      // Update existing session
      await updateChatSession(activeChatId, messages, files);
    } else if (messages.length > 1) {
      // Create new session if we have messages
      await createChatSession(messages, files, modelId || 'gemini-2.5-flash');
    }
    
    // Save active model
    if (modelId) {
      await set(ACTIVE_MODEL_KEY, modelId);
    }
  } catch (error) {
    console.error('[Storage] Error saving workspace:', error);
  }
};

/**
 * Load workspace from active chat session
 */
export const loadWorkspaceLocal = async (): Promise<WorkspaceData | null> => {
  try {
    const activeChatId = await getActiveChatId();
    
    if (!activeChatId) {
      return null;
    }
    
    const session = await getChatSession(activeChatId);
    if (!session) {
      return null;
    }
    
    return {
      files: session.files,
      messages: session.messages,
      lastUpdated: session.updatedAt
    };
  } catch (error) {
    console.error('[Storage] Error loading workspace:', error);
    return null;
  }
};

/**
 * Get the last active model ID
 */
export const getLastActiveModel = async (): Promise<string | null> => {
  try {
    return await get(ACTIVE_MODEL_KEY) || null;
  } catch (error) {
    return null;
  }
};
