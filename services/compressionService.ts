export const compressText = (text: string): string => {
  // Detect file types that need full preservation
  const isExcel = text.includes('--- [Sheet:');
  const isMarkdown = text.includes('# ') || text.includes('## ') || text.includes('```') || 
                     text.includes('---\n') || text.includes('\n---') || 
                     text.includes('* ') || text.includes('- ') || text.includes('1. ');
  
  if (isExcel || isMarkdown) {
    console.log('[compressionService] Detected special format, preserving content:', isExcel ? 'Excel' : 'Markdown');
    return text; // No compression
  }
  
  console.log('[compressionService] Applying light compression');
  // For other files: only remove excessive blank lines
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\[METADATA:([^\]]+)\]\n+/g, '[META:$1]');
};

export const decompressForDisplay = (text: string): string => {
  return text
    .replace(/\[META:/g, '[METADATA:');
};
