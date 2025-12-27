import { ProcessedFile, PDFSection } from '../types';
import { permanentStorage } from './permanentStorage';

interface ContextSelection {
  sections: Array<{
    fileId: string;
    filename: string;
    sectionTitle: string;
    content: string;
    relevanceScore: number;
    pageNumber: number;
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
  'llama-3.3-70b-versatile': 1000,
  'llama-3.1-8b-instant': 1500,
};

export async function selectRelevantContext(
  query: string,
  fileIds: string[],
  modelId: string
): Promise<ContextSelection> {
  const modelLimit = MODEL_LIMITS[modelId] || 32000;
  const maxTokenBudget = Math.floor(modelLimit * 0.1); // Use only 10% for very strict selection
  
  const allSections: any[] = [];
  
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
          relevanceScore: calculateRelevance(query, section)
        });
      });
    } else {
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
        relevanceScore: calculateRelevanceFromContent(query, file.content, file.name)
      });
    }
  }
  
  allSections.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  const selected: any[] = [];
  let totalTokens = 0;
  const filesUsed = new Set<string>();
  
  for (const item of allSections) {
    const sectionTokens = item.section.tokens || 0;
    
    if (totalTokens + sectionTokens > maxTokenBudget) {
      if (selected.length === 0) {
        selected.push({
          fileId: item.fileId,
          filename: item.filename,
          sectionTitle: item.section.title,
          content: item.section.content.substring(0, maxTokenBudget * 4),
          relevanceScore: item.relevanceScore,
          pageNumber: item.section.pageNumber
        });
        totalTokens = maxTokenBudget;
        filesUsed.add(item.filename);
      }
      break;
    }
    
    selected.push({
      fileId: item.fileId,
      filename: item.filename,
      sectionTitle: item.section.title,
      content: item.section.content,
      relevanceScore: item.relevanceScore,
      pageNumber: item.section.pageNumber
    });
    
    totalTokens += sectionTokens;
    filesUsed.add(item.filename);
  }
  
  let warning: string | undefined;
  if (totalTokens > maxTokenBudget * 0.8) {
    warning = `Large context (~${Math.round(totalTokens / 1000)}k tokens). Response may be slower.`;
  }
  
  return {
    sections: selected,
    totalTokens,
    filesUsed: Array.from(filesUsed),
    warning
  };
}

function calculateRelevance(query: string, section: PDFSection): number {
  const queryLower = query.toLowerCase();
  const titleLower = section.title.toLowerCase();
  const contentLower = section.content.toLowerCase();
  
  let score = 0;
  
  if (titleLower.includes(queryLower)) score += 100;
  
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 20;
    const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    score += contentMatches * 3;
  });
  
  const constructionKeywords = [
    'detail', 'specification', 'material', 'door', 'window', 'wall', 
    'floor', 'ceiling', 'acoustic', 'fire rating', 'schedule', 'typical'
  ];
  
  constructionKeywords.forEach(keyword => {
    if (titleLower.includes(keyword) && queryLower.includes(keyword)) {
      score += 30;
    }
  });
  
  return score;
}

function calculateRelevanceFromContent(query: string, content: string, filename: string): number {
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

export function buildContextString(selection: ContextSelection): string {
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
