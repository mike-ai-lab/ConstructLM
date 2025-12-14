export interface ProcessedFile {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'image' | 'document' | 'other';
  content: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  tokenCount?: number;
  fileHandle?: File; // Store original file for re-reading binary data (rendering PDFs)
  path?: string; // Relative path for folder uploads
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  modelId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface Citation {
  file: string;
  snippet: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'groq' | 'openai' | 'local';
  contextWindow: number;
  apiKeyEnv: string;
  supportsImages: boolean;
  description: string;
  capacityTag: 'Low' | 'Medium' | 'High';
  maxInputWords?: number;
  maxOutputWords?: number;
  supportsFilesApi?: boolean;
  isLocal?: boolean;
  isAvailable?: boolean;
}

// Declare external library types loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
    pdfWorkerReady: Promise<void>;
    d3: any;
  }
}