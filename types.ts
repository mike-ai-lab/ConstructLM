
export interface ProcessedFile {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'other';
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
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'groq';
  contextWindow: number;
  apiKeyEnv: string;
  supportsImages: boolean;
  description: string;
  capacityTag: 'High' | 'Medium' | 'Low';
  isDeprecated?: boolean;
}

export interface Citation {
  file: string;
  snippet: string;
}

export type LLMProvider = 'google' | 'openai' | 'groq' | 'anthropic';

export interface ModelConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  apiKeyEnv: string; // The environment variable name for the key (e.g., 'GROQ_API_KEY')
  isDeprecated?: boolean;
  supportsImages?: boolean;
  
  // User-facing fields
  description: string; // e.g. "Best for large PDFs"
  capacityTag: 'High' | 'Medium' | 'Low'; // Simple gauge for the user
}

// Declare external library types loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
    pdfWorkerReady: Promise<void>;
  }
}
