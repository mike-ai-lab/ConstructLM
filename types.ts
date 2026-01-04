export interface ProcessedFile {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'image' | 'document' | 'markdown' | 'csv' | 'other';
  content: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  tokenCount?: number;
  fileHandle?: File; // Store original file for re-reading binary data (rendering PDFs)
  path?: string; // Relative path for folder uploads
  uploadedAt?: number; // Timestamp when file was uploaded
  contentHash?: string; // SHA-256 hash for deduplication
  sections?: PDFSection[]; // Structured sections for construction PDFs
  userFolder?: string; // User-created folder path (e.g., "Research/Papers")
}

export interface PDFSection {
  id: string;
  title: string;
  content: string;
  pageNumber: number;
  tokens: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  modelId?: string;
  thinking?: string;
  sourcesUsed?: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  alternativeOutputs?: string[];
  currentOutputIndex?: number;
}

export interface Note {
  id: string;
  noteNumber: number;
  content: string;
  timestamp: number;
  modelId?: string;
  title?: string;
  tags?: string[];
  category?: string;
  isFavorite?: boolean;
  chatId?: string;
  messageId?: string;
  lastModified?: number;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  timestamp: number;
  boardOrder?: number;
  dueDate?: number;
  priority?: 'low' | 'medium' | 'high';
  chatId?: string;
  messageId?: string;
  notes?: string;
  tags?: string[];
  subtasks?: { id: string; title: string; completed: boolean }[];
  progress?: number;
  estimatedTime?: number;
  category?: string;
  attachments?: string[];
  archived?: boolean;
  groupId?: string;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    lastCompleted?: number;
    nextDue?: number;
  };
}

export interface TodoGroup {
  id: string;
  name: string;
  color: string;
  timestamp: number;
}

export interface Reminder {
  id: string;
  title: string;
  timestamp: number;
  reminderTime: number;
  status: 'pending' | 'triggered' | 'dismissed';
  chatId?: string;
  messageId?: string;
}

export interface Source {
  id: string;
  url: string;
  title?: string;
  content?: string;
  status: 'pending' | 'fetched' | 'error';
  timestamp: number;
  chatId?: string;
  selected?: boolean;
}

export interface Citation {
  file: string;
  snippet: string;
}

export interface Highlight {
  id: string;
  messageId: string;
  chatId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  timestamp: number;
  textBefore?: string;
  textAfter?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'groq' | 'openai' | 'local' | 'aws';
  contextWindow: number;
  apiKeyEnv: string;
  supportsImages: boolean;
  supportsThinking?: boolean;
  description: string;
  capacityTag: 'Low' | 'Medium' | 'High';
  maxInputWords?: number;
  maxOutputWords?: number;
  supportsFilesApi?: boolean;
  isLocal?: boolean;
  isAvailable?: boolean;
  awsRegion?: string;
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
