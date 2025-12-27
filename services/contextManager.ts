import { embeddingService } from './embeddingService';
import { vectorStore, ChunkRecord } from './vectorStore';
import { estimateTokens } from './embeddingUtils';
import { ProcessedFile } from '../types';
import { MODEL_REGISTRY } from './modelRegistry';
import { selectRelevantContext, buildContextString as buildSmartContext } from './smartContextManager';
import { selectHybridContext, buildHybridContextString } from './hybridContextManager';
import { activityLogger } from './activityLogger';
import { diagnosticLogger } from './diagnosticLogger';

interface ContextResult {
  chunks: ChunkRecord[];
  totalTokens: number;
  filesUsed: string[];
  warning?: string;
}

class ContextManager {
  async selectContext(
    query: string,
    selectedFiles: ProcessedFile[],
    modelId: string
  ): Promise<ContextResult> {
    if (selectedFiles.length === 0) {
      return { chunks: [], totalTokens: 0, filesUsed: [] };
    }

    // Try hybrid semantic + section-based selection first
    try {
      const fileIds = selectedFiles.map(f => f.id);
      const hybridSelection = await selectHybridContext(query, fileIds, modelId);
      
      // Convert to ContextResult format
      const chunks: ChunkRecord[] = hybridSelection.sections.map((section, idx) => ({
        id: `${section.fileId}_section_${idx}`,
        fileId: section.fileId,
        chunkIndex: idx,
        content: `[${section.sectionTitle}] (Page ${section.pageNumber})\n${section.content}`,
        embedding: [],
        tokens: Math.ceil(section.content.length / 4)
      }));
      
      return {
        chunks,
        totalTokens: hybridSelection.totalTokens,
        filesUsed: hybridSelection.filesUsed,
        warning: hybridSelection.warning
      };
    } catch (error) {
      console.warn('Hybrid context selection failed, falling back to keyword-based:', error);
      
      // LOG: Retrieval method - fallback
      activityLogger.logRetrievalMethodUsed('keyword_fallback', 'hybrid_method_failed', 'fallback_triggered');
      
      // Fallback to keyword-based selection
      const model = MODEL_REGISTRY.find(m => m.id === modelId);
      const contextWindow = model?.contextWindow || 32000;
      
      const groqLimits: Record<string, number> = {
        'llama-3.3-70b-versatile': 1000,
        'llama-3.1-8b-instant': 1500,
        'qwen/qwen3-32b': 2000,
        'openai/gpt-oss-120b': 3000,
        'meta-llama/llama-4-scout-17b-16e-instruct': 2000,
        'meta-llama/llama-4-maverick-17b-128e-instruct': 2000,
        'openai/gpt-oss-safeguard-20b': 3000,
        'openai/gpt-oss-20b': 3000
      };
      
      const maxTokens = model?.provider === 'groq' && groqLimits[modelId]
        ? groqLimits[modelId]
        : contextWindow - 4000;

      return await this.keywordBasedSelection(query, selectedFiles, maxTokens);
    }
  }

  private async keywordBasedSelection(query: string, files: ProcessedFile[], maxTokens: number): Promise<ContextResult> {
    // Use section-based fallback, or chunk-based if no sections
    try {
      const fileIds = files.map(f => f.id);
      const smartSelection = await selectRelevantContext(query, fileIds, 'fallback');
      
      const chunks: ChunkRecord[] = smartSelection.sections.map((section, idx) => ({
        id: `${section.fileId}_section_${idx}`,
        fileId: section.fileId,
        chunkIndex: idx,
        content: `[${section.sectionTitle}] (Page ${section.pageNumber})\n${section.content}`,
        embedding: [],
        tokens: Math.ceil(section.content.length / 4)
      }));
      
      return {
        chunks,
        totalTokens: smartSelection.totalTokens,
        filesUsed: smartSelection.filesUsed,
        warning: smartSelection.warning
      };
    } catch (error) {
      console.error('Section-based fallback failed, using emergency chunking:', error);
      
      // Emergency: chunk files that have no sections
      const chunks: ChunkRecord[] = [];
      let totalTokens = 0;
      const filesUsed = new Set<string>();
      
      for (const file of files) {
        if (totalTokens >= maxTokens) break;
        
        // Find relevant excerpts only
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const excerpts: string[] = [];
        
        for (const word of queryWords) {
          const regex = new RegExp(`.{0,300}${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.{0,300}`, 'gi');
          const matches = file.content.match(regex);
          if (matches) excerpts.push(...matches.slice(0, 3));
        }
        
        const content = excerpts.length > 0 
          ? excerpts.join('\n...\n')
          : file.content.slice(0, Math.min(2000, maxTokens * 4)); // Max 2000 chars
        
        const tokens = Math.ceil(content.length / 4);
        if (totalTokens + tokens > maxTokens) break;
        
        chunks.push({
          id: `${file.id}_emergency_chunk`,
          fileId: file.id,
          chunkIndex: 0,
          content,
          embedding: [],
          tokens
        });
        
        totalTokens += tokens;
        filesUsed.add(file.id);
      }
      
      return {
        chunks,
        totalTokens,
        filesUsed: Array.from(filesUsed),
        warning: 'Using emergency text extraction due to system limitations'
      };
    }
  }

  buildContextString(chunks: ChunkRecord[], files: ProcessedFile[]): string {
    if (chunks.length === 0) return '';

    const fileMap = new Map(files.map(f => [f.id, f]));
    let context = '=== CONTEXT FROM SELECTED SOURCES ===\n\n';

    // Group chunks by file
    const chunksByFile = new Map<string, ChunkRecord[]>();
    chunks.forEach(chunk => {
      if (!chunksByFile.has(chunk.fileId)) {
        chunksByFile.set(chunk.fileId, []);
      }
      chunksByFile.get(chunk.fileId)!.push(chunk);
    });

    // DIAGNOSTIC: 5. LLM CONTEXT ASSEMBLY LOG
    const contextUnits: any[] = [];
    let orderIndex = 0;

    // Build context string
    chunksByFile.forEach((fileChunks, fileId) => {
      const file = fileMap.get(fileId);
      if (!file) return;

      context += `--- Source: ${file.name} ---\n`;
      fileChunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .forEach(chunk => {
          context += chunk.content + '\n\n';
          
          contextUnits.push({
            unit_id: chunk.id,
            order_in_prompt: orderIndex++,
            character_count: chunk.content.length,
            token_count: chunk.tokens,
            source_file: file.name,
            chunk_index: chunk.chunkIndex
          });
        });
    });

    context += '=== END CONTEXT ===\n\n';
    
    diagnosticLogger.log('5. LLM_CONTEXT_ASSEMBLY', {
      number_of_units_included: chunks.length,
      total_characters: context.length,
      total_tokens: chunks.reduce((sum, c) => sum + c.tokens, 0),
      context_units: contextUnits
    });
    
    return context;
  }

  getFileNames(fileIds: string[], files: ProcessedFile[]): string[] {
    return fileIds
      .map(id => files.find(f => f.id === id)?.name)
      .filter(Boolean) as string[];
  }
}

export const contextManager = new ContextManager();
export type { ContextResult };
