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

// Chunk text with overlap
export function chunkText(text: string, chunkSize: number = 500, overlapPercent: number = 10): string[] {
  const chunks: string[] = [];
  const overlap = Math.floor(chunkSize * (overlapPercent / 100));
  const step = chunkSize - overlap;
  
  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}
