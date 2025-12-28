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
  async searchRelevantChunks(query: string, limit: number = 5): Promise<RAGResult[]> {
    try {
      const { embeddingService } = await import('./embeddingService');
      const { vectorStore } = await import('./vectorStore');
      
      if (!embeddingService.isReady()) {
        await embeddingService.loadModel();
      }
      
      const allFiles = await this.getAllFileIds();
      if (allFiles.length === 0) {
        activityLogger.logRAGSearch(query, 0);
        return [];
      }
      
      const chunks = await embeddingService.searchSimilar(query, allFiles, limit);
      activityLogger.logRAGSearch(query, chunks.length);
      
      return chunks.map(chunk => ({
        chunk: {
          fileName: chunk.fileId,
          content: chunk.content
        },
        score: chunk.tokens
      }));
    } catch (error) {
      console.warn('[RAG] Search failed:', error);
      activityLogger.logRAGSearch(query, 0);
      return [];
    }
  }
  
  private async getAllFileIds(): Promise<string[]> {
    try {
      const { vectorStore } = await import('./vectorStore');
      const db = await vectorStore.init();
      return [];
    } catch {
      return [];
    }
  }
}

export const ragService = new RAGService();
