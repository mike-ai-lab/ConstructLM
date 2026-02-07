/**
 * Unified text normalization for citation matching across all viewers
 */

/**
 * Comprehensive HTML entity decoder
 */
export const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Normalize text for matching - removes HTML, decodes entities, normalizes whitespace
 */
export const normalizeForMatching = (text: string): string => {
  // First decode HTML entities
  const decoded = decodeHtmlEntities(text);
  
  // Remove HTML tags
  const withoutTags = decoded.replace(/<[^>]+>/g, '');
  
  // Normalize whitespace and case
  return withoutTags
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
};

/**
 * Normalize text but preserve case (for display purposes)
 */
export const normalizeForDisplay = (text: string): string => {
  const decoded = decodeHtmlEntities(text);
  const withoutTags = decoded.replace(/<[^>]+>/g, '');
  return withoutTags.replace(/\s+/g, ' ').trim();
};

/**
 * Check if normalized text contains the search term
 */
export const containsNormalized = (text: string, searchTerm: string): boolean => {
  return normalizeForMatching(text).includes(normalizeForMatching(searchTerm));
};

/**
 * Find the index of search term in normalized text
 */
export const findNormalizedIndex = (text: string, searchTerm: string): number => {
  return normalizeForMatching(text).indexOf(normalizeForMatching(searchTerm));
};
