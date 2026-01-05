import { activityLogger } from './activityLogger';
import { diagnosticLogger } from './diagnosticLogger';

interface RAGChunk {
  fileName: string;
  content: string;
}

interface RAGResult {
  chunk: RAGChunk;
  score?: number;
}

class RAGService {
  private enabled: boolean = true; // ✅ ENABLED by default - true local embeddings!

  constructor() {
    // Check localStorage for user preference
    const stored = localStorage.getItem('constructlm_rag_enabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }
    console.log('[RAG] Status:', this.enabled ? '✅ ENABLED (local embeddings)' : '❌ DISABLED');
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('constructlm_rag_enabled', enabled ? 'true' : 'false');
    console.log('[RAG] Status changed:', enabled ? '✅ ENABLED' : '❌ DISABLED');
  }

  isEnabled(): boolean {
    if (this.enabled) return true;
    const stored = localStorage.getItem('constructlm_rag_enabled');
    this.enabled = stored === 'true';
    return this.enabled;
  }

  async searchRelevantChunks(query: string, limit: number = 5, fileIds?: string[]): Promise<RAGResult[]> {
    // Check if RAG is enabled
    if (!this.isEnabled()) {
      console.log('[RAG] Disabled - skipping semantic search');
      return [];
    }
    
    try {
      const { embeddingService } = await import('./embeddingService');
      const { permanentStorage } = await import('./permanentStorage');
      
      if (!embeddingService.isReady()) {
        await embeddingService.loadModel();
      }
      
      // Use provided fileIds or get all indexed files
      const targetFiles = fileIds && fileIds.length > 0 ? fileIds : await this.getAllFileIds();
      console.log(`[RAG] Searching across ${targetFiles.length} ${fileIds ? 'selected' : 'indexed'} files`);
      
      if (targetFiles.length === 0) {
        console.log('[RAG] No files to search');
        activityLogger.logRAGSearch(query, 0);
        return [];
      }
      
      // Multi-topic query expansion: split by AND/OR and search separately
      const queries = this.expandQuery(query);
      const allChunks = new Map<string, { chunk: any; score: number }>();
      
      // Get more chunks per query to ensure coverage
      const chunksPerQuery = queries.length > 1 ? Math.ceil(limit * 0.8) : limit;
      
      for (const subQuery of queries) {
        console.log(`[RAG] Sub-query: "${subQuery}"`);
        const chunks = await embeddingService.searchSimilar(subQuery, targetFiles, chunksPerQuery);
        chunks.forEach(chunk => {
          const key = `${chunk.fileId}_${chunk.chunkIndex}`;
          if (!allChunks.has(key)) {
            allChunks.set(key, { chunk, score: 1.0 });
          }
        });
      }
      
      // Convert to array and sort by score
      const results = Array.from(allChunks.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      activityLogger.logRAGSearch(query, results.length);
      
      // Map file IDs to actual filenames
      const fileMap = new Map<string, string>();
      for (const fileId of targetFiles) {
        const file = await permanentStorage.getFile(fileId);
        if (file) {
          fileMap.set(fileId, file.name);
        }
      }
      
      // Map chunks to RAG results with proper scores and filenames
      return results.map(({ chunk, score }, index) => {
        const actualFileName = fileMap.get(chunk.fileId) || chunk.fileName || chunk.fileId;
        
        return {
          chunk: {
            fileName: actualFileName,
            fileId: chunk.fileId,
            content: chunk.content
          },
          score: score - (index * 0.05)
        };
      });
    } catch (error) {
      console.warn('[RAG] Search failed:', error);
      activityLogger.logRAGSearch(query, 0);
      return [];
    }
  }
  
  private expandQuery(query: string): string[] {
    // Split by AND/OR to handle multi-topic queries
    const parts = query.split(/\s+(?:AND|OR|\+|,)\s+/i).map(p => p.trim()).filter(p => p.length > 3);
    return parts.length > 1 ? parts : [query];
  }
  
  private async getAllFileIds(): Promise<string[]> {
    try {
      const { vectorStore } = await import('./vectorStore');
      await vectorStore.init();
      
      // Get all unique file IDs from the chunks store
      const db = (vectorStore as any).db;
      if (!db) {
        console.warn('[RAG] Vector store not initialized');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
          const keys = request.result as string[];
          // Extract unique file IDs from chunk IDs (format: fileId_chunk_N)
          const fileIds = new Set<string>();
          keys.forEach(key => {
            const fileId = key.split('_chunk_')[0];
            if (fileId) fileIds.add(fileId);
          });
          console.log(`[RAG] Found ${fileIds.size} indexed files`);
          resolve(Array.from(fileIds));
        };
        
        request.onerror = () => {
          console.warn('[RAG] Failed to get file IDs:', request.error);
          resolve([]);
        };
      });
    } catch (error) {
      console.warn('[RAG] Error getting file IDs:', error);
      return [];
    }
  }
}

export const ragService = new RAGService();
