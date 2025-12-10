
import { get, set } from 'idb-keyval';
import { ProcessedFile, Message } from '../types';

const LOCAL_STORAGE_KEY = 'constructlm_workspace';

export interface WorkspaceData {
  files: ProcessedFile[];
  messages: Message[];
  lastUpdated: number;
}

// --- LOCAL STORAGE (IndexedDB) ---
export const saveWorkspaceLocal = async (files: ProcessedFile[], messages: Message[]) => {
  try {
    const data: WorkspaceData = {
      files,
      messages,
      lastUpdated: Date.now()
    };
    await set(LOCAL_STORAGE_KEY, data);
    console.log('[Storage] Saved locally');
  } catch (e) {
    console.error('[Storage] Failed to save locally', e);
  }
};

export const loadWorkspaceLocal = async (): Promise<WorkspaceData | null> => {
  try {
    const data = await get<WorkspaceData>(LOCAL_STORAGE_KEY);
    return data || null;
  } catch (e) {
    console.error('[Storage] Failed to load locally', e);
    return null;
  }
};
