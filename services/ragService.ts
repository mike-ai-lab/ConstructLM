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

  async searchRelevantChunks(query: string, limit: number = 5): Promise<RAGResult[]> {
    // Check if RAG is enabled
    if (!this.isEnabled()) {
      console.log('[RAG] Disabled - skipping semantic search');
      return [];
    }
    
    try {
      const { embeddingService } = await import('./embeddingService');
      
      if (!embeddingService.isReady()) {
        await embeddingService.loadModel();
      }
      
      const allFiles = await this.getAllFileIds();
      console.log(`[RAG] Searching across ${allFiles.length} indexed files`);
      
      if (allFiles.length === 0) {
        console.log('[RAG] No indexed files found');
        activityLogger.logRAGSearch(query, 0);
        return [];
      }
      
      const chunks = await embeddingService.searchSimilar(query, allFiles, limit);
      activityLogger.logRAGSearch(query, chunks.length);
      
      // Map chunks to RAG results with proper scores
      return chunks.map((chunk, index) => {
        // Calculate similarity score from the search results
        // searchSimilar returns chunks sorted by similarity
        const similarityScore = 1.0 - (index * 0.1); // Approximate score based on rank
        
        return {
          chunk: {
            fileName: chunk.fileId,
            content: chunk.content
          },
          score: similarityScore
        };
      });
    } catch (error) {
      console.warn('[RAG] Search failed:', error);
      activityLogger.logRAGSearch(query, 0);
      return [];
    }
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
