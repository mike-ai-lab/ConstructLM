// Generate hash for file content to enable embedding reuse
export async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Estimate token count (rough approximation: 1 token ≈ 4 characters)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Chunk text with overlap - respects paragraph boundaries
export function chunkText(text: string, chunkSize: number = 500, overlapPercent: number = 25): string[] {
  const chunks: string[] = [];
  const overlap = Math.floor(chunkSize * (overlapPercent / 100));
  const step = chunkSize - overlap;
  
  // Try to split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length <= chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = para;
      
      // If single paragraph exceeds chunk size, split it
      while (currentChunk.length > chunkSize) {
        chunks.push(currentChunk.slice(0, chunkSize).trim());
        currentChunk = currentChunk.slice(step);
      }
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  
  return chunks.filter(c => c.length > 0);
}

// Specialized chunking for Excel files that preserves row context
export function chunkExcelText(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  
  // Split by sheets first
  const sheetRegex = /--- \[Sheet: (.*?)\] ---([\s\S]*?)(?=--- \[Sheet:|$)/g;
  let match;
  
  while ((match = sheetRegex.exec(text)) !== null) {
    const sheetName = match[1].trim();
    const sheetContent = match[2].trim();
    
    if (!sheetContent) continue;
    
    const lines = sheetContent.split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;
    
    // First line is headers
    const headers = lines[0];
    const dataRows = lines.slice(1);
    
    // Create chunks with row context
    let currentChunk = `Sheet: ${sheetName}\nHeaders: ${headers}\n`;
    let rowsInChunk = 0;
    const maxRowsPerChunk = 10; // Reasonable number of rows per chunk
    
    for (let i = 0; i < dataRows.length; i++) {
      const excelRowNumber = i + 2; // Excel rows start from 1, headers are row 1, data starts from row 2
      const rowWithContext = `Row ${excelRowNumber}: ${dataRows[i]}`;
      
      // Check if adding this row would exceed chunk size or max rows
      if ((currentChunk + rowWithContext).length > chunkSize || rowsInChunk >= maxRowsPerChunk) {
        if (rowsInChunk > 0) {
          chunks.push(currentChunk.trim());
        }
        // Start new chunk with sheet context
        currentChunk = `Sheet: ${sheetName}\nHeaders: ${headers}\n${rowWithContext}\n`;
        rowsInChunk = 1;
      } else {
        currentChunk += rowWithContext + '\n';
        rowsInChunk++;
      }
    }
    
    // Add final chunk if it has content
    if (rowsInChunk > 0) {
      chunks.push(currentChunk.trim());
    }
  }
  
  // Fallback for non-sheet content
  if (chunks.length === 0) {
    return chunkText(text, chunkSize, 10);
  }
  
  return chunks.filter(c => c.length > 0);
}
