import { get, set, del, clear } from 'idb-keyval';

interface CacheEntry {
  response: string;
  timestamp: number;
  modelId: string;
  contextHash: string;
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = 'llm_cache_';

// Generate hash for cache key
const generateHash = (input: string, modelId: string, contextFiles: string[]): string => {
  const combined = `${input}|${modelId}|${contextFiles.sort().join('|')}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

export const getCachedResponse = async (
  input: string, 
  modelId: string, 
  contextFiles: string[]
): Promise<string | null> => {
  try {
    const hash = generateHash(input, modelId, contextFiles);
    const cacheKey = `${CACHE_PREFIX}${hash}`;
    
    const cached = await get<CacheEntry>(cacheKey);
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      await del(cacheKey);
      return null;
    }
    
    console.log('[Cache] Hit for query:', input.substring(0, 50) + '...');
    return cached.response;
  } catch (error) {
    console.error('[Cache] Error retrieving:', error);
    return null;
  }
};

export const setCachedResponse = async (
  input: string,
  modelId: string,
  contextFiles: string[],
  response: string
): Promise<void> => {
  try {
    const hash = generateHash(input, modelId, contextFiles);
    const cacheKey = `${CACHE_PREFIX}${hash}`;
    
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      modelId,
      contextHash: hash
    };
    
    await set(cacheKey, entry);
    console.log('[Cache] Stored response for query:', input.substring(0, 50) + '...');
  } catch (error) {
    console.error('[Cache] Error storing:', error);
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    await clear();
    console.log('[Cache] Cleared all cached responses');
  } catch (error) {
    console.error('[Cache] Error clearing:', error);
  }
};