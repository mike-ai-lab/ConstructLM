/**
 * Detects if text contains Arabic characters
 */
export const hasArabic = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

/**
 * Determines text direction based on content
 */
export const getTextDirection = (text: string): 'rtl' | 'ltr' => {
  if (!text) return 'ltr';
  
  const arabicCount = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  
  const totalLetters = arabicCount + latinCount;
  if (totalLetters === 0) return 'ltr';
  
  return (arabicCount / totalLetters) > 0.3 ? 'rtl' : 'ltr';
};
