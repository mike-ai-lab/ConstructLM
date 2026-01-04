import { ProcessedFile, PDFSection } from '../types';
import { permanentStorage } from './permanentStorage';
import { embeddingService } from './embeddingService';
import { activityLogger } from './activityLogger';
import { diagnosticLogger } from './diagnosticLogger';

interface SectionWithEmbedding {
  fileId: string;
  filename: string;
  section: PDFSection;
  embedding?: number[];
  semanticScore?: number;
  keywordScore: number;
  hybridScore: number;
}

interface HybridContextSelection {
  sections: Array<{
    fileId: string;
    filename: string;
    sectionTitle: string;
    content: string;
    relevanceScore: number;
    pageNumber: number;
    retrievalMethod: 'semantic' | 'keyword' | 'hybrid';
  }>;
  totalTokens: number;
  filesUsed: string[];
  warning?: string;
}

const MODEL_LIMITS: Record<string, number> = {
  'gemini-2.0-flash-exp': 1000000,
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash': 1000000,
  'gemini-flash-latest': 1000000,
  'llama-3.3-70b-versatile': 1500,  // Very conservative for Groq
  'llama-3.1-8b-instant': 300,      // Very conservative for Groq
  'llama-3.1-70b-versatile': 1500,
  'llama-3.2-90b-text-preview': 1500,
  'mixtral-8x7b-32768': 4000,
  'gemma-7b-it': 1000,
  'gemma2-9b-it': 1000,
};

export async function selectHybridContext(
  query: string,
  fileIds: string[],
  modelId: string
): Promise<HybridContextSelection> {
  const modelLimit = MODEL_LIMITS[modelId] || 32000;
  const maxTokenBudget = modelLimit; // Use the limit directly (already set to 50%)
  
  // LOG: Context selection start
  activityLogger.logSessionMarker('NEW QUERY TEST');
  activityLogger.logContextSelectionStart(query, fileIds.length, modelId);
  
  diagnosticLogger.log('HYBRID_RETRIEVAL_START', {
    query,
    fileIds,
    modelId,
    maxTokenBudget
  });

  const allSections: SectionWithEmbedding[] = [];
  let useSemanticSearch = false;

  // Try to load embedding model
  try {
    console.log('[EMBEDDING] Using local Transformers.js for hybrid search');
    useSemanticSearch = true;
    activityLogger.logRetrievalMethodUsed('hybrid_semantic', 'transformers_local', 'ready');
  } catch (error) {
    console.log('[EMBEDDING] Failed to initialize, using keyword fallback:', error);
    useSemanticSearch = false;
    activityLogger.logRetrievalMethodUsed('keyword_fallback', 'embedding_init_failed', String(error));
  }

  // Collect all sections
  for (const fileId of fileIds) {
    const file = await permanentStorage.getFile(fileId);
    if (!file) continue;
    
    const sections = await permanentStorage.getSectionsByFileId(fileId);
    
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        allSections.push({
          fileId,
          filename: file.name,
          section,
          keywordScore: calculateKeywordRelevance(query, section),
          hybridScore: 0 // Will be calculated after semantic scores
        });
      });
    } else {
      // Fallback for files without sections
      allSections.push({
        fileId,
        filename: file.name,
        section: {
          id: fileId,
          title: file.name,
          content: file.content,
          pageNumber: 1,
          tokens: file.tokenCount || 0
        },
        keywordScore: calculateKeywordRelevanceFromContent(query, file.content, file.name),
        hybridScore: 0
      });
    }
  }

  // Add semantic scores if available
  if (useSemanticSearch && allSections.length > 0) {
    try {
      // Use RAG service for efficient semantic search instead of generating new embeddings
      const ragResults = await embeddingService.searchSimilar(query, fileIds, 50);
      
      // Map RAG results back to sections
      const ragScoreMap = new Map<string, number>();
      ragResults.forEach((chunk, index) => {
        const score = 1 - (index / ragResults.length); // Higher rank = higher score
        ragScoreMap.set(chunk.fileId, Math.max(ragScoreMap.get(chunk.fileId) || 0, score));
      });
      
      // Apply semantic scores from RAG results
      allSections.forEach(section => {
        section.semanticScore = ragScoreMap.get(section.fileId) || 0;
      });
      
      // Calculate hybrid scores (weighted combination)
      const maxKeywordScore = Math.max(...allSections.map(s => s.keywordScore));
      const maxSemanticScore = Math.max(...allSections.map(s => s.semanticScore || 0));
      
      allSections.forEach(section => {
        const normalizedKeyword = maxKeywordScore > 0 ? section.keywordScore / maxKeywordScore : 0;
        const normalizedSemantic = maxSemanticScore > 0 ? (section.semanticScore || 0) / maxSemanticScore : 0;
        
        // 80% semantic, 20% keyword for better precision
        section.hybridScore = (normalizedSemantic * 0.8) + (normalizedKeyword * 0.2);
      });
      
      diagnosticLogger.log('SEMANTIC_SCORING_COMPLETE', {
        sectionsProcessed: allSections.length,
        ragResultsUsed: ragResults.length,
        maxKeywordScore,
        maxSemanticScore,
        hybridWeights: { semantic: 0.8, keyword: 0.2 }
      });
      
    } catch (error) {
      console.warn('Semantic scoring failed, falling back to keyword-only:', error);
      useSemanticSearch = false;
    }
  }

  // Sort by hybrid score (or keyword score if semantic failed)
  const sortKey = useSemanticSearch ? 'hybridScore' : 'keywordScore';
  allSections.sort((a, b) => b[sortKey] - a[sortKey]);
  
  // Select sections within token budget
  const selected: any[] = [];
  let totalTokens = 0;
  const filesUsed = new Set<string>();
  
  for (const sectionData of allSections) {
    const sectionTokens = sectionData.section.tokens || 0;
    
    if (totalTokens + sectionTokens > maxTokenBudget) {
      if (selected.length === 0) {
        // Include at least one section, truncated if necessary
        const truncatedContent = sectionData.section.content.substring(0, maxTokenBudget * 4);
        selected.push({
          fileId: sectionData.fileId,
          filename: sectionData.filename,
          sectionTitle: sectionData.section.title,
          content: truncatedContent,
          relevanceScore: sectionData[sortKey],
          pageNumber: sectionData.section.pageNumber,
          retrievalMethod: useSemanticSearch ? 'hybrid' : 'keyword'
        });
        totalTokens = maxTokenBudget;
        filesUsed.add(sectionData.filename);
      }
      break;
    }
    
    selected.push({
      fileId: sectionData.fileId,
      filename: sectionData.filename,
      sectionTitle: sectionData.section.title,
      content: sectionData.section.content,
      relevanceScore: sectionData[sortKey],
      pageNumber: sectionData.section.pageNumber,
      retrievalMethod: useSemanticSearch ? 'hybrid' : 'keyword'
    });
    
    totalTokens += sectionTokens;
    filesUsed.add(sectionData.filename);
  }
  
  let warning: string | undefined;
  if (totalTokens > maxTokenBudget * 0.8) {
    warning = `Large context (~${Math.round(totalTokens / 1000)}k tokens). Response may be slower.`;
  }
  
  // Calculate original tokens if full files were sent
  const originalTokens = allSections.reduce((sum, s) => sum + (s.section.tokens || 0), 0);
  
  // LOG: Sections selected
  const filesInvolved = Array.from(filesUsed);
  activityLogger.logSectionsSelected(
    allSections.length,
    selected.length,
    originalTokens,
    totalTokens,
    filesInvolved
  );
  
  // LOG: Token efficiency
  activityLogger.logTokenEfficiency(originalTokens, totalTokens);
  
  // LOG: Section details
  activityLogger.logSectionDetails(
    selected.map(s => ({
      title: s.sectionTitle,
      sourceFile: s.filename,
      pageNumber: s.pageNumber,
      tokens: Math.ceil(s.content.length / 4),
      score: s.relevanceScore,
      method: s.retrievalMethod
    }))
  );
  
  diagnosticLogger.log('HYBRID_RETRIEVAL_COMPLETE', {
    sectionsSelected: selected.length,
    totalTokens,
    filesUsed: Array.from(filesUsed),
    retrievalMethod: useSemanticSearch ? 'hybrid' : 'keyword-only',
    topScores: selected.slice(0, 3).map(s => ({
      title: s.sectionTitle,
      score: s.relevanceScore,
      method: s.retrievalMethod
    }))
  });
  
  return {
    sections: selected,
    totalTokens,
    filesUsed: Array.from(filesUsed),
    warning
  };
}

function calculateKeywordRelevance(query: string, section: PDFSection): number {
  const queryLower = query.toLowerCase();
  const titleLower = section.title.toLowerCase();
  const contentLower = section.content.toLowerCase();
  
  let score = 0;
  
  // Exact query match in title
  if (titleLower.includes(queryLower)) score += 100;
  
  // Word-by-word matching
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 20;
    const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    score += contentMatches * 3;
  });
  
  // Construction-specific keywords boost
  const constructionKeywords = [
    'detail', 'specification', 'material', 'door', 'window', 'wall', 
    'floor', 'ceiling', 'acoustic', 'fire rating', 'schedule', 'typical',
    'boq', 'quantity', 'item', 'unit', 'rate', 'amount'
  ];
  
  constructionKeywords.forEach(keyword => {
    if (titleLower.includes(keyword) && queryLower.includes(keyword)) {
      score += 30;
    }
  });
  
  return score;
}

function calculateKeywordRelevanceFromContent(query: string, content: string, filename: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  let score = 0;
  
  if (filenameLower.includes(queryLower)) score += 50;
  
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    score += matches * 2;
  });
  
  return score;
}

function cosineSimilarity(a: number[], b: number[]): number {
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

export function buildHybridContextString(selection: HybridContextSelection): string {
  if (selection.sections.length === 0) return '';
  
  let context = '=== CONTEXT FROM SELECTED SOURCES ===\n\n';
  
  const fileGroups = new Map<string, typeof selection.sections>();
  selection.sections.forEach(section => {
    if (!fileGroups.has(section.filename)) {
      fileGroups.set(section.filename, []);
    }
    fileGroups.get(section.filename)!.push(section);
  });
  
  fileGroups.forEach((sections, filename) => {
    context += `--- Source: ${filename} ---\n`;
    sections.forEach(section => {
      context += `\n[${section.sectionTitle}] (Page ${section.pageNumber})\n`;
      context += section.content + '\n';
    });
    context += '\n';
  });
  
  context += '=== END CONTEXT ===\n\n';
  return context;
}