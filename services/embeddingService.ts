/**
 * embeddingService.ts
 * Uses Gemini API for embeddings - reliable and free
 */

import { vectorStore, ChunkRecord } from './vectorStore';
import { generateFileHash, estimateTokens, chunkText } from './embeddingUtils';
import { ProcessedFile } from '../types';
import { diagnosticLogger } from './diagnosticLogger';
import { getStoredApiKey } from './modelRegistry';

const EMBEDDING_VERSION = 'gemini-embedding-004';
const CHUNK_SIZE = 500;
const OVERLAP_PERCENT = 10;

interface EmbeddingProgress {
  fileId: string;
  fileName: string;
  current: number;
  total: number;
}

class EmbeddingService {
  private isReady = true; // Always ready with API

  async loadModel(): Promise<void> {
    // No model to load - using API
    console.log('[EMBEDDING] Using Gemini Embeddings API');
  }

  isReady(): boolean {
    return true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = getStoredApiKey('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 2048) }] } // Limit to 2048 chars
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }

  async processFile(
    file: ProcessedFile,
    onProgress?: (progress: EmbeddingProgress) => void
  ): Promise<void> {
    const fileHash = await generateFileHash(file.content);
    
    const existing = await vectorStore.getEmbeddingByHash(fileHash);
    if (existing && existing.version === EMBEDDING_VERSION) {
      console.log(`Reusing embeddings for ${file.name}`);
      await vectorStore.saveEmbedding({
        fileId: file.id,
        fileHash,
        version: EMBEDDING_VERSION,
        embedding: existing.embedding,
        timestamp: Date.now()
      });
      
      const existingChunks = await vectorStore.getChunks(existing.fileId);
      const newChunks = existingChunks.map(chunk => ({
        ...chunk,
        id: `${file.id}_chunk_${chunk.chunkIndex}`,
        fileId: file.id
      }));
      await vectorStore.saveChunks(newChunks);
      return;
    }

    const chunks = chunkText(file.content, CHUNK_SIZE, OVERLAP_PERCENT);
    
    diagnosticLogger.log('2. CHUNK CREATION START', {
      source_file: file.name,
      file_id: file.id,
      total_chunks_created: chunks.length
    });
    
    const chunkRecords: ChunkRecord[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (onProgress) {
        onProgress({
          fileId: file.id,
          fileName: file.name,
          current: i + 1,
          total: chunks.length
        });
      }

      const embedding = await this.generateEmbedding(chunks[i]);
      const chunkRecord = {
        id: `${file.id}_chunk_${i}`,
        fileId: file.id,
        chunkIndex: i,
        content: chunks[i],
        embedding,
        tokens: estimateTokens(chunks[i])
      };
      chunkRecords.push(chunkRecord);
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    const avgEmbedding = this.averageEmbeddings(chunkRecords.map(c => c.embedding));
    await vectorStore.saveEmbedding({
      fileId: file.id,
      fileHash,
      version: EMBEDDING_VERSION,
      embedding: avgEmbedding,
      timestamp: Date.now()
    });

    await vectorStore.saveChunks(chunkRecords);
    
    diagnosticLogger.log('3. EMBEDDING & INDEXING COMPLETE', {
      embedding_model_name: 'Gemini text-embedding-004',
      total_units_embedded: chunkRecords.length,
      file_id: file.id
    });
  }

  async searchSimilar(query: string, fileIds: string[], topK: number = 5): Promise<ChunkRecord[]> {
    if (!this.pipeline) await this.loadModel();

    // DIAGNOSTIC: 4. QUERY & RETRIEVAL LOG
    diagnosticLogger.log('4. QUERY START', {
      raw_user_query: query,
      embedding_model_used: 'Xenova/all-MiniLM-L6-v2',
      top_k_requested: topK,
      file_ids_searched: fileIds,
      query_length: query.length
    });

    const queryEmbedding = await this.generateEmbedding(query);
    const allChunks: ChunkRecord[] = [];

    for (const fileId of fileIds) {
      const chunks = await vectorStore.getChunks(fileId);
      allChunks.push(...chunks);
    }
    
    diagnosticLogger.log('4. CHUNKS LOADED', {
      total_chunks_loaded: allChunks.length,
      file_ids: fileIds
    });

    // Calculate cosine similarity
    const scored = allChunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK).map(s => s.chunk);
    
    // DIAGNOSTIC: Log all retrieval results
    diagnosticLogger.log('4. RETRIEVAL_RESULTS', {
      total_results: results.length,
      results: results.map((chunk, idx) => ({
        rank: idx + 1,
        unit_id: chunk.id,
        similarity_score: scored[idx].score,
        source_file: chunk.fileId,
        chunk_index: chunk.chunkIndex,
        token_count: chunk.tokens,
        text_preview: chunk.content.substring(0, 300)
      }))
    });
    
    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }

    return avg.map(v => v / embeddings.length);
  }

  async deleteFile(fileId: string): Promise<void> {
    await vectorStore.deleteFile(fileId);
  }
}

export const embeddingService = new EmbeddingService();
export type { EmbeddingProgress };
