import { ProcessedFile, PDFSection } from '../types';

const DB_NAME = 'ConstructLM_PermanentStorage';
const DB_VERSION = 2;
const FILES_STORE = 'files';
const SECTIONS_STORE = 'sections';

class PermanentStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Permanent storage initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const fileStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          fileStore.createIndex('contentHash', 'contentHash', { unique: false });
          fileStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }

        // Sections store
        if (!db.objectStoreNames.contains(SECTIONS_STORE)) {
          const sectionStore = db.createObjectStore(SECTIONS_STORE, { keyPath: 'id' });
          sectionStore.createIndex('fileId', 'fileId', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async saveFile(file: ProcessedFile): Promise<void> {
    if (!this.db) await this.init();
    
    // Get ArrayBuffer for ALL file types BEFORE starting transaction
    let rawContent: ArrayBuffer | undefined;
    if (file.fileHandle) {
      try {
        rawContent = await file.fileHandle.arrayBuffer();
      } catch (e) {
        console.warn(`Failed to store raw content for ${file.name}:`, e);
      }
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      
      // Don't store fileHandle in IndexedDB (can't be serialized)
      const { fileHandle, ...fileData } = file;
      const dataToStore = rawContent ? { ...fileData, rawContent } : fileData;
      
      const request = store.put(dataToStore);
      request.onsuccess = () => {
        this.backupMetadata();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSections(sections: PDFSection[], fileId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!sections || sections.length === 0) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(SECTIONS_STORE, 'readwrite');
      const store = tx.objectStore(SECTIONS_STORE);
      
      sections.forEach(section => {
        const sectionData = { ...section, fileId };
        store.put(sectionData);
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getFileByHash(hash: string): Promise<ProcessedFile | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const index = store.index('contentHash');
      const request = index.get(hash);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(fileId: string): Promise<ProcessedFile | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getSectionsByFileId(fileId: string): Promise<PDFSection[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(SECTIONS_STORE, 'readonly');
      const store = tx.objectStore(SECTIONS_STORE);
      const index = store.index('fileId');
      const request = index.getAll(fileId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles(): Promise<ProcessedFile[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const files = request.result || [];
        // Restore File objects from rawContent
        const restoredFiles = files.map((f: any) => {
          if (f.rawContent) {
            // Restore fileHandle for any file type that has rawContent
            const mimeType = f.type === 'pdf' ? 'application/pdf' : 
                           f.type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                           f.type === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                           'text/plain';
            const blob = new Blob([f.rawContent], { type: mimeType });
            const file = new File([blob], f.name, { type: mimeType });
            const { rawContent, ...fileData } = f;
            return { ...fileData, fileHandle: file };
          } else if (f.content) {
            // Fallback: create fileHandle from text content for old files
            const blob = new Blob([f.content], { type: 'text/plain' });
            const file = new File([blob], f.name, { type: 'text/plain' });
            return { ...f, fileHandle: file };
          }
          console.warn(`File "${f.name}" has no content - citations may not work`);
          return f;
        });
        resolve(restoredFiles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([FILES_STORE, SECTIONS_STORE], 'readwrite');
      
      // Delete file
      tx.objectStore(FILES_STORE).delete(fileId);
      
      // Delete associated sections
      const sectionStore = tx.objectStore(SECTIONS_STORE);
      const index = sectionStore.index('fileId');
      const request = index.openCursor(IDBKeyRange.only(fileId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => {
        this.backupMetadata();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  private backupMetadata(): void {
    // Backup file metadata to localStorage (not full content)
    this.getAllFiles().then(files => {
      const metadata = files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        uploadedAt: f.uploadedAt,
        contentHash: f.contentHash
      }));
      try {
        localStorage.setItem('constructlm-files-backup', JSON.stringify(metadata));
      } catch (e) {
        console.warn('Failed to backup metadata to localStorage:', e);
      }
    }).catch(err => {
      console.error('Failed to backup metadata:', err);
    });
  }

  async exportAllData(): Promise<Blob> {
    const files = await this.getAllFiles();
    const allData: any = { files: [], sections: [] };
    
    for (const file of files) {
      const sections = await this.getSectionsByFileId(file.id);
      allData.files.push(file);
      allData.sections.push(...sections);
    }
    
    return new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    for (const file of data.files || []) {
      await this.saveFile(file);
    }
    
    // Group sections by fileId
    const sectionsByFile = new Map<string, PDFSection[]>();
    for (const section of data.sections || []) {
      const fileId = (section as any).fileId;
      if (!sectionsByFile.has(fileId)) {
        sectionsByFile.set(fileId, []);
      }
      sectionsByFile.get(fileId)!.push(section);
    }
    
    for (const [fileId, sections] of sectionsByFile) {
      await this.saveSections(sections, fileId);
    }
  }
}

export const permanentStorage = new PermanentStorageService();
