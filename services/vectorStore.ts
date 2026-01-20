// IndexedDB for embeddings and chunks
const DB_NAME = 'ConstructLM_VectorStore';
const DB_VERSION = 1;
const EMBEDDINGS_STORE = 'embeddings';
const CHUNKS_STORE = 'chunks';

interface EmbeddingRecord {
  fileId: string;
  fileHash: string;
  version: string;
  embedding: number[];
  timestamp: number;
}

interface ChunkRecord {
  id: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokens: number;
}

class VectorStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
          const embeddingStore = db.createObjectStore(EMBEDDINGS_STORE, { keyPath: 'fileId' });
          embeddingStore.createIndex('fileHash', 'fileHash', { unique: false });
        }

        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
          chunkStore.createIndex('fileId', 'fileId', { unique: false });
        }
      };
    });
  }

  async saveEmbedding(record: EmbeddingRecord): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(EMBEDDINGS_STORE, 'readwrite');
      const store = tx.objectStore(EMBEDDINGS_STORE);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getEmbedding(fileId: string): Promise<EmbeddingRecord | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(EMBEDDINGS_STORE, 'readonly');
      const store = tx.objectStore(EMBEDDINGS_STORE);
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getEmbeddingByHash(fileHash: string): Promise<EmbeddingRecord | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(EMBEDDINGS_STORE, 'readonly');
      const store = tx.objectStore(EMBEDDINGS_STORE);
      const index = store.index('fileHash');
      const request = index.get(fileHash);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveChunks(chunks: ChunkRecord[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readwrite');
      const store = tx.objectStore(CHUNKS_STORE);
      
      chunks.forEach(chunk => store.put(chunk));
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getChunks(fileId: string): Promise<ChunkRecord[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const index = store.index('fileId');
      const request = index.getAll(fileId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([EMBEDDINGS_STORE, CHUNKS_STORE], 'readwrite');
      
      tx.objectStore(EMBEDDINGS_STORE).delete(fileId);
      
      const chunkStore = tx.objectStore(CHUNKS_STORE);
      const index = chunkStore.index('fileId');
      const request = index.openCursor(IDBKeyRange.only(fileId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async deleteEmbeddingByHash(fileHash: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(EMBEDDINGS_STORE, 'readwrite');
      const store = tx.objectStore(EMBEDDINGS_STORE);
      const index = store.index('fileHash');
      const request = index.openCursor(IDBKeyRange.only(fileHash));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const vectorStore = new VectorStore();
export type { EmbeddingRecord, ChunkRecord };
