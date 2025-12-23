import { embeddingService } from './embeddingService';
import { vectorStore, ChunkRecord } from './vectorStore';
import { estimateTokens } from './embeddingUtils';
import { ProcessedFile } from '../types';
import { MODEL_REGISTRY } from './modelRegistry';

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

    const model = MODEL_REGISTRY.find(m => m.id === modelId);
    const contextWindow = model?.contextWindow || 32000;
    const safetyMargin = 4000;
    const maxTokens = contextWindow - safetyMargin;

    // Use keyword-based search (no embeddings needed)
    return this.keywordBasedSelection(query, selectedFiles, maxTokens);
  }

  private keywordBasedSelection(query: string, files: ProcessedFile[], maxTokens: number): ContextResult {
    console.log('[ContextManager] Query:', query);
    console.log('[ContextManager] Files:', files.length, 'Max tokens:', maxTokens);
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    console.log('[ContextManager] Query words:', queryWords);
    
    const chunks: ChunkRecord[] = [];
    let totalTokens = 0;
    const filesUsed = new Set<string>();
    const maxPerFile = 5000;

    const scoredFiles = files.map(file => {
      const content = file.content.toLowerCase();
      const score = queryWords.reduce((sum, word) => {
        const matches = (content.match(new RegExp(word, 'g')) || []).length;
        return sum + matches;
      }, 0);
      return { file, score };
    }).filter(f => f.score > 0).sort((a, b) => b.score - a.score);
    
    console.log('[ContextManager] Scored files:', scoredFiles.map(f => ({ name: f.file.name, score: f.score })));

    for (const { file } of scoredFiles) {
      const fileTokens = Math.min(estimateTokens(file.content), maxPerFile);
      if (totalTokens + fileTokens > maxTokens) break;
      
      const excerpts: string[] = [];
      for (const word of queryWords) {
        const regex = new RegExp(`.{0,500}${word}.{0,500}`, 'gi');
        const matches = file.content.match(regex);
        if (matches) excerpts.push(...matches.slice(0, 5));
      }
      
      const content = excerpts.length > 0 ? excerpts.join('\n...\n') : file.content.slice(0, 20000);
      const tokens = estimateTokens(content);
      
      console.log('[ContextManager] File:', file.name, 'Excerpts:', excerpts.length, 'Tokens:', tokens);
      
      chunks.push({
        id: `${file.id}_excerpts`,
        fileId: file.id,
        chunkIndex: 0,
        content,
        embedding: [],
        tokens
      });
      
      totalTokens += tokens;
      filesUsed.add(file.id);
    }
    
    console.log('[ContextManager] Result - Total tokens:', totalTokens, 'Files used:', filesUsed.size);

    const warning = totalTokens > 50000
      ? `Large context: ~${Math.round(totalTokens / 1000)}k tokens. Response may be slower.`
      : undefined;

    return {
      chunks,
      totalTokens,
      filesUsed: Array.from(filesUsed),
      warning
    };
  }

  private fallbackSelection(files: ProcessedFile[], maxTokens: number): ContextResult {
    // Deprecated - using keyword-based selection instead
    return this.keywordBasedSelection('', files, maxTokens);
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

    // Build context string
    chunksByFile.forEach((fileChunks, fileId) => {
      const file = fileMap.get(fileId);
      if (!file) return;

      context += `--- Source: ${file.name} ---\n`;
      fileChunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .forEach(chunk => {
          context += chunk.content + '\n\n';
        });
    });

    context += '=== END CONTEXT ===\n\n';
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
