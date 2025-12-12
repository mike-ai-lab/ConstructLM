import { ProcessedFile } from '../types';

export interface DocumentChunk {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  metadata: {
    page?: number;
    section?: string;
    type: string;
  };
  embedding?: number[];
}

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters

export const chunkDocument = (file: ProcessedFile): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  const content = file.content;
  
  if (!content || content.length === 0) {
    return chunks;
  }

  // For PDFs, try to preserve page boundaries
  if (file.type === 'pdf') {
    return chunkPdfByPages(file);
  }
  
  // For other files, use sliding window approach
  let startIndex = 0;
  let chunkIndex = 0;
  
  while (startIndex < content.length) {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, content.length);
    let chunkContent = content.slice(startIndex, endIndex);
    
    // Try to break at sentence boundaries
    if (endIndex < content.length) {
      const lastSentence = chunkContent.lastIndexOf('.');
      const lastNewline = chunkContent.lastIndexOf('\n');
      const breakPoint = Math.max(lastSentence, lastNewline);
      
      if (breakPoint > startIndex + CHUNK_SIZE * 0.5) {
        chunkContent = content.slice(startIndex, breakPoint + 1);
      }
    }
    
    chunks.push({
      id: `${file.id}_chunk_${chunkIndex}`,
      fileId: file.id,
      fileName: file.name,
      content: chunkContent.trim(),
      startIndex,
      endIndex: startIndex + chunkContent.length,
      chunkIndex,
      metadata: {
        type: file.type,
        section: `Chunk ${chunkIndex + 1}`
      }
    });
    
    startIndex += chunkContent.length - CHUNK_OVERLAP;
    chunkIndex++;
  }
  
  return chunks;
};

const chunkPdfByPages = (file: ProcessedFile): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  const content = file.content;
  
  // Split by page markers
  const pageRegex = /--- \[Page (\d+)\] ---/g;
  const pages = content.split(pageRegex);
  
  let chunkIndex = 0;
  let currentIndex = 0;
  
  for (let i = 1; i < pages.length; i += 2) {
    const pageNumber = parseInt(pages[i]);
    const pageContent = pages[i + 1]?.trim();
    
    if (!pageContent) continue;
    
    // If page is too long, split it further
    if (pageContent.length > CHUNK_SIZE) {
      const subChunks = splitLongContent(pageContent, CHUNK_SIZE);
      subChunks.forEach((subChunk, subIndex) => {
        chunks.push({
          id: `${file.id}_chunk_${chunkIndex}`,
          fileId: file.id,
          fileName: file.name,
          content: subChunk,
          startIndex: currentIndex,
          endIndex: currentIndex + subChunk.length,
          chunkIndex,
          metadata: {
            page: pageNumber,
            type: file.type,
            section: `Page ${pageNumber}${subIndex > 0 ? ` (Part ${subIndex + 1})` : ''}`
          }
        });
        currentIndex += subChunk.length;
        chunkIndex++;
      });
    } else {
      chunks.push({
        id: `${file.id}_chunk_${chunkIndex}`,
        fileId: file.id,
        fileName: file.name,
        content: pageContent,
        startIndex: currentIndex,
        endIndex: currentIndex + pageContent.length,
        chunkIndex,
        metadata: {
          page: pageNumber,
          type: file.type,
          section: `Page ${pageNumber}`
        }
      });
      currentIndex += pageContent.length;
      chunkIndex++;
    }
  }
  
  return chunks;
};

const splitLongContent = (content: string, maxSize: number): string[] => {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < content.length) {
    let end = Math.min(start + maxSize, content.length);
    
    // Try to break at sentence or paragraph boundaries
    if (end < content.length) {
      const lastPeriod = content.lastIndexOf('.', end);
      const lastNewline = content.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + maxSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(content.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
  }
  
  return chunks;
};