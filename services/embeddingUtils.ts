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
