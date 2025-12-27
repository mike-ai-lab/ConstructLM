import { vectorStore, ChunkRecord } from './vectorStore';
import { generateFileHash, estimateTokens, chunkText } from './embeddingUtils';
import { ProcessedFile } from '../types';
import { diagnosticLogger } from './diagnosticLogger';

const EMBEDDING_VERSION = 'MiniLM-L6-v2';
const CHUNK_SIZE = 500; // ~500 tokens per chunk
const OVERLAP_PERCENT = 10;

interface EmbeddingProgress {
  fileId: string;
  fileName: string;
  current: number;
  total: number;
}

class EmbeddingService {
  private pipeline: any = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  async loadModel(): Promise<void> {
    if (this.pipeline) return;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        // Set custom cache directory and model source
        const { pipeline, env } = await import('@xenova/transformers');
        
        // Use HuggingFace Hub directly with fallback
        env.allowRemoteModels = true;
        env.allowLocalModels = true;
        
        console.log('[EMBEDDING] Attempting to load model from HuggingFace...');
        this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          revision: 'main',
          cache_dir: './.cache/transformers'
        });
        console.log('[EMBEDDING] Model loaded successfully');
      } catch (error) {
        console.error('[EMBEDDING] Failed to load model:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.pipeline !== null;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) await this.loadModel();
    
    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async processFile(
    file: ProcessedFile,
    onProgress?: (progress: EmbeddingProgress) => void
  ): Promise<void> {
    const fileHash = await generateFileHash(file.content);
    
    // Check if already embedded with same hash
    const existing = await vectorStore.getEmbeddingByHash(fileHash);
    if (existing && existing.version === EMBEDDING_VERSION) {
      console.log(`Reusing embeddings for ${file.name} (hash match)`);
      
      // Copy to current fileId
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

    // Generate new embeddings
    if (!this.pipeline) await this.loadModel();

    const chunks = chunkText(file.content, CHUNK_SIZE, OVERLAP_PERCENT);
    
    // DIAGNOSTIC: 2. UNIT/CHUNK CREATION LOG
    diagnosticLogger.log('2. CHUNK CREATION START', {
      source_file: file.name,
      file_id: file.id,
      total_content_length: file.content.length,
      chunk_size: CHUNK_SIZE,
      overlap_percent: OVERLAP_PERCENT,
      total_chunks_created: chunks.length,
      chunking_strategy: 'fixed-size-with-overlap'
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
      
      // DIAGNOSTIC: Log each unit created
      diagnosticLogger.log(`2. UNIT_CREATED [${i + 1}/${chunks.length}]`, {
        unit_id: chunkRecord.id,
        source_file: file.name,
        chunk_index: i,
        unit_type: 'chunk',
        character_count: chunks[i].length,
        token_count: chunkRecord.tokens,
        chunking_strategy: 'fixed-size-with-overlap',
        text_preview: chunks[i].substring(0, 200),
        metadata: {
          fileId: file.id,
          chunkIndex: i,
          embeddingDimension: embedding.length
        }
      });
    }

    // Save file-level embedding (average of chunks)
    const avgEmbedding = this.averageEmbeddings(chunkRecords.map(c => c.embedding));
    await vectorStore.saveEmbedding({
      fileId: file.id,
      fileHash,
      version: EMBEDDING_VERSION,
      embedding: avgEmbedding,
      timestamp: Date.now()
    });

    await vectorStore.saveChunks(chunkRecords);
    
    // DIAGNOSTIC: 3. EMBEDDING & INDEXING LOG
    diagnosticLogger.log('3. EMBEDDING & INDEXING COMPLETE', {
      embedding_model_name: 'Xenova/all-MiniLM-L6-v2',
      embedding_version: EMBEDDING_VERSION,
      embedding_dimension: avgEmbedding.length,
      total_units_embedded: chunkRecords.length,
      storage_backend: 'IndexedDB (vectorStore)',
      file_id: file.id,
      file_name: file.name
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
