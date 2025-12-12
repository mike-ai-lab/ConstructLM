import { get, set, del, keys } from 'idb-keyval';
import { ProcessedFile } from '../types';
import { DocumentChunk, chunkDocument } from './documentChunkingService';
import { embeddingService } from './embeddingService';

interface StoredChunk extends DocumentChunk {
  embedding: number[];
  indexed: boolean;
}

interface RAGSearchResult {
  chunk: DocumentChunk;
  similarity: number;
  relevanceScore: number;
}

const CHUNK_STORE_PREFIX = 'rag_chunk_';
const INDEX_METADATA_KEY = 'rag_index_metadata';

export class RAGService {
  private isIndexed = false;
  private allChunks: StoredChunk[] = [];

  // Index documents for RAG
  async indexDocuments(files: ProcessedFile[]): Promise<void> {
    console.log('[RAG] Starting document indexing...');
    
    const allChunks: DocumentChunk[] = [];
    
    // Chunk all documents
    for (const file of files) {
      const chunks = chunkDocument(file);
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      console.log('[RAG] No chunks to index');
      return;
    }

    // Build vocabulary for embedding service
    embeddingService.buildVocabulary(allChunks);

    // Generate embeddings and store chunks
    const storedChunks: StoredChunk[] = [];
    
    for (const chunk of allChunks) {
      const embedding = embeddingService.generateEmbedding(chunk.content);
      const storedChunk: StoredChunk = {
        ...chunk,
        embedding,
        indexed: true
      };
      
      // Store in IndexedDB
      await set(`${CHUNK_STORE_PREFIX}${chunk.id}`, storedChunk);
      storedChunks.push(storedChunk);
    }

    // Store metadata
    await set(INDEX_METADATA_KEY, {
      totalChunks: storedChunks.length,
      files: files.map(f => ({ id: f.id, name: f.name, type: f.type })),
      lastIndexed: Date.now()
    });

    this.allChunks = storedChunks;
    this.isIndexed = true;
    
    console.log(`[RAG] Indexed ${storedChunks.length} chunks from ${files.length} files`);
  }

  // Load existing index
  async loadIndex(): Promise<boolean> {
    try {
      const metadata = await get(INDEX_METADATA_KEY);
      if (!metadata) return false;

      const chunkKeys = await keys();
      const chunkPromises = chunkKeys
        .filter(key => typeof key === 'string' && key.startsWith(CHUNK_STORE_PREFIX))
        .map(key => get(key));

      const chunks = await Promise.all(chunkPromises);
      this.allChunks = chunks.filter(chunk => chunk && chunk.indexed);

      if (this.allChunks.length > 0) {
        // Rebuild vocabulary for consistency
        embeddingService.buildVocabulary(this.allChunks);
        this.isIndexed = true;
        console.log(`[RAG] Loaded ${this.allChunks.length} indexed chunks`);
        return true;
      }
    } catch (error) {
      console.error('[RAG] Error loading index:', error);
    }
    return false;
  }

  // Search for relevant chunks
  async searchRelevantChunks(query: string, topK: number = 5): Promise<RAGSearchResult[]> {
    if (!this.isIndexed || this.allChunks.length === 0) {
      console.log('[RAG] Index not ready, returning empty results');
      return [];
    }

    const queryEmbedding = embeddingService.generateEmbedding(query);
    const results: RAGSearchResult[] = [];

    // Calculate similarity for all chunks
    for (const chunk of this.allChunks) {
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      // Additional relevance scoring based on keyword matching
      const keywordScore = this.calculateKeywordRelevance(query, chunk.content);
      const relevanceScore = similarity * 0.7 + keywordScore * 0.3;

      results.push({
        chunk,
        similarity,
        relevanceScore
      });
    }

    // Sort by relevance and return top K
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);
  }

  // Calculate keyword-based relevance
  private calculateKeywordRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 2 && contentLower.includes(word)) {
        matches++;
      }
    }
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  // Get chunks by file
  async getChunksByFile(fileId: string): Promise<DocumentChunk[]> {
    return this.allChunks.filter(chunk => chunk.fileId === fileId);
  }

  // Delete chunks for a specific file
  async deleteFileChunks(fileId: string): Promise<void> {
    const chunksToDelete = this.allChunks.filter(chunk => chunk.fileId === fileId);
    
    for (const chunk of chunksToDelete) {
      await del(`${CHUNK_STORE_PREFIX}${chunk.id}`);
    }
    
    this.allChunks = this.allChunks.filter(chunk => chunk.fileId !== fileId);
    
    // Update metadata
    const metadata = await get(INDEX_METADATA_KEY);
    if (metadata) {
      metadata.files = metadata.files.filter((f: any) => f.id !== fileId);
      metadata.totalChunks = this.allChunks.length;
      await set(INDEX_METADATA_KEY, metadata);
    }
    
    console.log(`[RAG] Deleted chunks for file ${fileId}`);
  }

  // Clear all indexed data
  async clearIndex(): Promise<void> {
    const chunkKeys = await keys();
    const deletePromises = chunkKeys
      .filter(key => typeof key === 'string' && key.startsWith(CHUNK_STORE_PREFIX))
      .map(key => del(key));

    await Promise.all(deletePromises);
    await del(INDEX_METADATA_KEY);
    
    this.allChunks = [];
    this.isIndexed = false;
    
    console.log('[RAG] Cleared all indexed data');
  }

  // Get index statistics
  async getIndexStats(): Promise<{
    totalChunks: number;
    totalFiles: number;
    lastIndexed: number | null;
    isReady: boolean;
  }> {
    const metadata = await get(INDEX_METADATA_KEY);
    
    return {
      totalChunks: this.allChunks.length,
      totalFiles: metadata?.files?.length || 0,
      lastIndexed: metadata?.lastIndexed || null,
      isReady: this.isIndexed
    };
  }
}

// Singleton instance
export const ragService = new RAGService();