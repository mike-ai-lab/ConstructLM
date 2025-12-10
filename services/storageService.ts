import { get, set } from 'idb-keyval';
import { db, storage, isFirebaseInitialized } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProcessedFile, Message } from '../types';

const LOCAL_STORAGE_KEY = 'constructlm_workspace';

export interface WorkspaceData {
  files: ProcessedFile[];
  messages: Message[];
  lastUpdated: number;
}

// --- LOCAL STORAGE (IndexedDB) ---
// We use IndexedDB because LocalStorage cannot handle large file blobs

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

// --- CLOUD SYNC (Firebase) ---

export const saveWorkspaceCloud = async (userId: string, files: ProcessedFile[], messages: Message[]) => {
  if (!userId || !isFirebaseInitialized || !db || !storage) return;

  try {
    // 1. Upload Files to Storage (if needed)
    // We only upload the blob. The metadata is stored in Firestore.
    const fileMetadataPromises = files.map(async (file) => {
        // If file has a handle (Blob), we might need to upload it
        if (file.fileHandle) {
            const storageRef = ref(storage, `users/${userId}/files/${file.id}_${file.name}`);
            // Check if we need to upload? For simplicity, we just overwrite or update.
            // In a real app, we'd check md5 hash or a 'synced' flag.
            
            // Note: We upload the blob
            await uploadBytes(storageRef, file.fileHandle);
            const downloadURL = await getDownloadURL(storageRef);
            
            // Return metadata without the giant content string or fileHandle for Firestore
            return {
                ...file,
                content: file.content, // We store text content in Firestore for searchability/context re-hydration
                fileHandle: null, // Don't store Blob in Firestore
                downloadURL
            };
        }
        return file;
    });

    const processedFilesMetadata = await Promise.all(fileMetadataPromises);

    // 2. Save Workspace Data to Firestore
    const workspaceRef = doc(db, 'users', userId, 'workspaces', 'default');
    await setDoc(workspaceRef, {
        messages,
        files: processedFilesMetadata, // Contains text content + downloadURL
        lastUpdated: Date.now()
    });
    
    console.log('[Storage] Synced to cloud');

  } catch (e) {
    console.error('[Storage] Cloud sync failed', e);
    throw e;
  }
};

export const loadWorkspaceCloud = async (userId: string): Promise<WorkspaceData | null> => {
    if (!userId || !isFirebaseInitialized || !db) return null;

    try {
        const workspaceRef = doc(db, 'users', userId, 'workspaces', 'default');
        const snap = await getDoc(workspaceRef);

        if (snap.exists()) {
            const data = snap.data() as any;
            const messages = data.messages || [];
            
            // Rehydrate Files (Download Blobs to recreate File objects for PDF.js)
            const filesPromises = (data.files || []).map(async (f: any) => {
                let fileHandle: File | undefined = undefined;

                if (f.downloadURL && (f.type === 'pdf' || f.type === 'excel')) {
                    try {
                        const response = await fetch(f.downloadURL);
                        const blob = await response.blob();
                        fileHandle = new File([blob], f.name, { type: blob.type });
                    } catch (err) {
                        console.warn(`[Storage] Failed to download file blob for ${f.name}`, err);
                    }
                }

                return {
                    ...f,
                    fileHandle // Reattached Blob/File object
                } as ProcessedFile;
            });

            const files = await Promise.all(filesPromises);

            return {
                messages,
                files,
                lastUpdated: data.lastUpdated
            };
        }
    } catch (e) {
        console.error('[Storage] Cloud load failed', e);
    }
    return null;
};