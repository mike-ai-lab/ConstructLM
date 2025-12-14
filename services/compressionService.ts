export const compressText = (text: string): string => {
  const isExcel = text.includes('--- [Sheet:');
  
  if (isExcel) {
    // For Excel: preserve CSV structure, only compress excessive newlines
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\[METADATA:([^\]]+)\]\n+/g, '[META:$1]');
  }
  
  // For other files: aggressive compression
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/\[METADATA:([^\]]+)\]\n+/g, '[META:$1]');
};

export const decompressForDisplay = (text: string): string => {
  return text
    .replace(/\[META:/g, '[METADATA:');
};
