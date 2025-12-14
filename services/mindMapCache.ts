const STORAGE_KEY = 'constructlm_mindmap_cache';

interface CachedMindMap {
  fileId: string;
  fileName: string;
  modelId: string;
  data: any;
  timestamp: number;
}

export const mindMapCache = {
  save(fileId: string, fileName: string, modelId: string, data: any) {
    try {
      const cache = this.getAll();
      const key = `${fileId}-${modelId}`;
      cache[key] = { fileId, fileName, modelId, data, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to cache mind map:', e);
    }
  },

  get(fileId: string, modelId: string): CachedMindMap | null {
    const cache = this.getAll();
    return cache[`${fileId}-${modelId}`] || null;
  },

  getAll(): Record<string, CachedMindMap> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  },

  delete(fileId: string, modelId: string) {
    try {
      const cache = this.getAll();
      const key = `${fileId}-${modelId}`;
      delete cache[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to delete mind map:', e);
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
