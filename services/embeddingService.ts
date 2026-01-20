/**
 * embeddingService.ts
 * TRUE LOCAL EMBEDDINGS using Transformers.js
 * 100% privacy-first, zero API costs, runs in browser
 */

import { pipeline, env } from '@xenova/transformers';
import { vectorStore, ChunkRecord } from './vectorStore';
import { generateFileHash, estimateTokens, chunkText, chunkExcelText } from './embeddingUtils';
import { ProcessedFile } from '../types';
import { diagnosticLogger } from './diagnosticLogger';
import { activityLogger } from './activityLogger';

// Configure Transformers.js for browser use
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

const EMBEDDING_VERSION = 'transformers-minilm-v3-pagemarkers';
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const CHUNK_SIZE = 500;
const OVERLAP_PERCENT = 10;

interface EmbeddingProgress {
  fileId: string;
  fileName: string;
  current: number;
  total: number;
}

class EmbeddingService {
  private pipeline: any = null;
  private isLoading: boolean = false;
  private processingFiles: Set<string> = new Set();

  isProcessing(fileId: string): boolean {
    return this.processingFiles.has(fileId);
  }

  getProcessingFiles(): string[] {
    return Array.from(this.processingFiles);
  }

  async loadModel(): Promise<void> {
    if (this.pipeline) return;
    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    try {
      console.log('[EMBEDDING] 🚀 Loading local Transformers.js model...');
      console.log('[EMBEDDING] Model:', MODEL_NAME);
      console.log('[EMBEDDING] First load: ~5-10s (downloads ~25MB to browser cache)');
      console.log('[EMBEDDING] Subsequent loads: instant from cache');
      
      this.pipeline = await pipeline('feature-extraction', MODEL_NAME);
      
      console.log('[EMBEDDING] ✅ Local model ready! 100% privacy-first, zero API costs.');
    } catch (error) {
      console.error('[EMBEDDING] ❌ Failed to load model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  isReady(): boolean {
    return this.pipeline !== null;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.loadModel();
    }

    // Truncate to reasonable length (model handles ~512 tokens)
    const truncated = text.slice(0, 2000);

    try {
      // Generate embedding locally in browser
      const output = await this.pipeline(truncated, {
        pooling: 'mean',
        normalize: true
      });

      // Extract embedding array (384 dimensions for MiniLM)
      return Array.from(output.data);
    } catch (error) {
      console.error('[EMBEDDING] Generation failed:', error);
      throw new Error('Failed to generate embedding locally');
    }
  }

  async processFile(
    file: ProcessedFile,
    onProgress?: (progress: EmbeddingProgress) => void
  ): Promise<void> {
    this.processingFiles.add(file.id);
    
    try {
      const fileHash = await generateFileHash(file.content);
    
    // Check if embeddings already exist for this file content
    const existing = await vectorStore.getEmbeddingByHash(fileHash);
    if (existing && existing.version === EMBEDDING_VERSION) {
      console.log(`✅ Reusing embeddings for ${file.name} (content hash match)`);
      
      // Update file ID mapping but reuse existing embeddings
      await vectorStore.saveEmbedding({
        fileId: file.id,
        fileHash,
        version: EMBEDDING_VERSION,
        embedding: existing.embedding,
        timestamp: Date.now()
      });
      
      // Reuse existing chunks with new file ID
      const existingChunks = await vectorStore.getChunks(existing.fileId);
      if (existingChunks.length > 0) {
        const newChunks = existingChunks.map(chunk => ({
          ...chunk,
          id: `${file.id}_chunk_${chunk.chunkIndex}`,
          fileId: file.id,
          fileName: file.name
        }));
        await vectorStore.saveChunks(newChunks);
        activityLogger.logRAGVectorStorage(file.name, newChunks.length);
      }
      return;
    }
    
    if (existing && existing.version !== EMBEDDING_VERSION) {
      console.log(`🔄 Version mismatch for ${file.name} - re-indexing with new chunking logic`);
      await vectorStore.deleteFile(existing.fileId);
    }

    // Only process if no cached embeddings exist
    console.log(`🔄 Processing new embeddings for ${file.name}`);
    
    // Use specialized chunking for Excel files
    const chunks = file.type === 'excel' || file.type === 'csv' 
      ? chunkExcelText(file.content, CHUNK_SIZE)
      : chunkText(file.content, CHUNK_SIZE, OVERLAP_PERCENT);
      
    activityLogger.logRAGChunking(file.name, chunks.length, Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length));
    
    diagnosticLogger.log('2. CHUNK CREATION START', {
      source_file: file.name,
      file_id: file.id,
      total_chunks_created: chunks.length
    });
    
    const chunkRecords: ChunkRecord[] = [];
    const startTime = Date.now();

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
        fileName: file.name,
        chunkIndex: i,
        content: chunks[i],
        embedding,
        tokens: estimateTokens(chunks[i])
      };
      chunkRecords.push(chunkRecord);
      
      // Yield to UI every 2 chunks to prevent freezing
      if (i % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const avgEmbedding = this.averageEmbeddings(chunkRecords.map(c => c.embedding));
    const timeTaken = Date.now() - startTime;
    activityLogger.logRAGEmbedding(file.name, chunks.length, timeTaken);
    
    await vectorStore.saveEmbedding({
      fileId: file.id,
      fileHash,
      version: EMBEDDING_VERSION,
      embedding: avgEmbedding,
      timestamp: Date.now()
    });

    await vectorStore.saveChunks(chunkRecords);
    activityLogger.logRAGVectorStorage(file.name, chunkRecords.length);
    
    diagnosticLogger.log('3. EMBEDDING & INDEXING COMPLETE', {
      embedding_model_name: MODEL_NAME,
      embedding_dimensions: chunkRecords[0]?.embedding.length || 384,
      total_units_embedded: chunkRecords.length,
      file_id: file.id,
      privacy: 'LOCAL - no data sent to external APIs'
    });
    } finally {
      this.processingFiles.delete(file.id);
    }
  }

  async searchSimilar(query: string, fileIds: string[], topK: number = 5): Promise<ChunkRecord[]> {
    if (!this.pipeline) await this.loadModel();

    // DIAGNOSTIC: 4. QUERY & RETRIEVAL LOG
    diagnosticLogger.log('4. QUERY START', {
      raw_user_query: query,
      embedding_model_used: MODEL_NAME,
      top_k_requested: topK,
      file_ids_searched: fileIds,
      query_length: query.length,
      privacy: 'LOCAL - query processed in browser'
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
  
  async deleteFileByHash(contentHash: string): Promise<void> {
    await vectorStore.deleteEmbeddingByHash(contentHash);
  }
}

export const embeddingService = new EmbeddingService();
export type { EmbeddingProgress };
