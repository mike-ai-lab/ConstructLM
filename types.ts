import 'react';

export interface ProcessedFile {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'other';
  content: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  tokenCount?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Citation {
  file: string;
  snippet: string;
}

// Declare external library types loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
  }
}

// Extends input attributes to support 'webkitdirectory'
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}