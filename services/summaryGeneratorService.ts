/**
 * summaryGeneratorService.ts
 * Generates clean, citation-free summary documents from chats/notes
 * Safe for re-ingestion into RAG system
 */

import { sendMessageToLLM } from './llmService';
import { ProcessedFile } from '../types';

const SUMMARY_PROMPT = `You are a document summarizer. Create a clean, well-structured summary of the provided content.

CRITICAL RULES:
1. Remove ALL citation markers ({{citation:...}})
2. Convert cited information into direct statements
3. Preserve factual information and key details
4. Use clear headings and structure
5. Write in third-person, objective tone
6. Do NOT add new information or interpretations
7. Output ONLY the summary, no meta-commentary

Format as a professional document with:
- Clear title
- Logical sections with ## headings
- Bullet points for lists
- Concise paragraphs

Content to summarize:
---
{CONTENT}
---

Generate the clean summary now:`;

interface SummaryOptions {
  title?: string;
  includeMetadata?: boolean;
}

class SummaryGeneratorService {
  
  /**
   * Generate a clean summary document from chat messages or notes
   */
  async generateSummaryDocument(
    content: string,
    modelId: string,
    options: SummaryOptions = {}
  ): Promise<string> {
    
    // Strip existing citations first
    const cleanedContent = this.stripCitations(content);
    
    // Generate summary using AI
    const prompt = SUMMARY_PROMPT.replace('{CONTENT}', cleanedContent);
    
    let summary = '';
    
    await sendMessageToLLM(
      prompt,
      [],
      [],
      modelId,
      (chunk) => {
        summary += chunk;
      },
      () => {},
      false
    );
    
    // Add metadata header if requested
    if (options.includeMetadata) {
      const header = `---
Generated: ${new Date().toISOString()}
Source: ${options.title || 'Chat Summary'}
Type: AI-Generated Summary Document
---

`;
      summary = header + summary;
    }
    
    return summary.trim();
  }
  
  /**
   * Create a ProcessedFile from summary (ready for upload)
   */
  createSummaryFile(summary: string, title: string): Partial<ProcessedFile> {
    return {
      name: `${title}.md`,
      type: 'markdown',
      content: summary,
      size: new Blob([summary]).size,
      status: 'ready',
      uploadedAt: Date.now()
    };
  }
  
  /**
   * Strip all citation markers from text
   */
  private stripCitations(text: string): string {
    return text
      .replace(/\{\{citation:[^}]+\}\}/g, '')
      .replace(/\[\[cite:[^\]]+\]\]/g, '')
      .trim();
  }
  
  /**
   * Validate that content is safe for RAG ingestion
   */
  validateForRAG(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for citation markers
    if (content.match(/\{\{citation:/)) {
      issues.push('Contains citation markers');
    }
    
    // Check for AI meta-commentary
    if (content.match(/^(As an AI|I cannot|I apologize)/im)) {
      issues.push('Contains AI meta-commentary');
    }
    
    // Check minimum length
    if (content.length < 100) {
      issues.push('Content too short for meaningful indexing');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export const summaryGeneratorService = new SummaryGeneratorService();
