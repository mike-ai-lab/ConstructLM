/**
 * RAG Process Tracker - User-Friendly Event Emitter
 * Translates technical RAG operations into user-understandable events
 */

interface RAGProcessEvent {
  stepId: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: any;
}

class RAGProcessTracker {
  private isTracking = false;

  startTracking() {
    this.isTracking = true;
    console.log('🔍 RAG Process Tracking Started');
  }

  stopTracking() {
    this.isTracking = false;
    console.log('🔍 RAG Process Tracking Stopped');
  }

  private emitEvent(stepId: string, status: 'pending' | 'active' | 'completed' | 'error', details?: any) {
    if (!this.isTracking) return;

    const event = new CustomEvent('rag-process-event', {
      detail: { stepId, status, details }
    });
    window.dispatchEvent(event);
  }

  // File Upload Events
  onFileUploadStart(fileName: string, fileSize: number, fileType: string) {
    this.emitEvent('file-upload', 'active', { fileName, fileSize, fileType });
  }

  onFileUploadComplete(fileName: string, fileSize: number, fileType: string) {
    this.emitEvent('file-upload', 'completed', { fileName, fileSize, fileType });
  }

  // File Parsing Events
  onFileParsingStart(fileName: string) {
    this.emitEvent('file-parsing', 'active', { fileName });
  }

  onFileParsingComplete(fileName: string, contentLength: number, sections: number, tokenCount: number) {
    this.emitEvent('file-parsing', 'completed', { 
      fileName, 
      contentLength, 
      sections, 
      tokenCount,
      explanation: `Extracted ${contentLength.toLocaleString()} characters of text from your document. Found ${sections} sections.`
    });
  }

  // Text Chunking Events
  onChunkingStart(fileName: string, contentLength: number) {
    this.emitEvent('text-chunking', 'active', { fileName, contentLength });
  }

  onChunkingComplete(fileName: string, chunksCount: number, avgChunkSize: number, sampleChunk?: string) {
    this.emitEvent('text-chunking', 'completed', { 
      fileName, 
      chunksCount, 
      avgChunkSize,
      sampleChunk,
      explanation: `Split your document into ${chunksCount} smaller pieces (chunks) for better AI understanding. Each chunk is about ${avgChunkSize} characters.`
    });
  }

  // Embedding Generation Events
  onEmbeddingStart(fileName: string, chunksCount: number) {
    this.emitEvent('embedding-generation', 'active', { 
      fileName, 
      chunksCount,
      explanation: `Converting ${chunksCount} text chunks into AI-readable format using local Transformers.js model...`
    });
  }

  onEmbeddingComplete(fileName: string, chunksCount: number, timeTaken: number, sampleEmbedding?: number[]) {
    this.emitEvent('embedding-generation', 'completed', { 
      fileName, 
      chunksCount, 
      timeTaken,
      sampleEmbedding,
      explanation: `Successfully converted all ${chunksCount} chunks into 384-dimensional vectors that AI can understand and search through.`
    });
  }

  // Vector Storage Events
  onVectorStorageStart(fileName: string) {
    this.emitEvent('vector-storage', 'active', { fileName });
  }

  onVectorStorageComplete(fileName: string, chunksCount: number) {
    this.emitEvent('vector-storage', 'completed', { 
      fileName, 
      chunksCount,
      explanation: `Stored ${chunksCount} AI-readable chunks in your local database. Your document is now searchable!`
    });
  }

  // User Query Events
  onUserQuery(query: string, filesCount: number) {
    this.emitEvent('user-query', 'completed', { 
      query, 
      queryLength: query.length, 
      filesCount,
      explanation: `You asked: "${query}". Now searching through ${filesCount} document(s) for relevant information.`
    });
  }

  // Semantic Search Events
  onSemanticSearchStart(query: string, filesCount: number) {
    this.emitEvent('semantic-search', 'active', { 
      query, 
      filesCount,
      explanation: `Using AI to find parts of your documents that are most relevant to your question...`
    });
  }

  onSemanticSearchComplete(query: string, method: string, filesSearched: number, chunksFound: number, topMatches?: any[]) {
    this.emitEvent('semantic-search', 'completed', { 
      query, 
      method, 
      filesSearched, 
      chunksFound,
      topMatches,
      explanation: `Found ${chunksFound} relevant pieces of information using ${method === 'hybrid' ? 'AI semantic understanding + keyword matching' : 'keyword matching'}.`
    });
  }

  // Context Selection Events
  onContextSelectionStart(chunksFound: number) {
    this.emitEvent('context-selection', 'active', { 
      chunksFound,
      explanation: `Selecting the most relevant information from ${chunksFound} found pieces...`
    });
  }

  onContextSelectionComplete(selectedChunks: number, totalTokens: number, efficiency: number, filesUsed: string[]) {
    this.emitEvent('context-selection', 'completed', { 
      selectedChunks, 
      totalTokens, 
      efficiency, 
      filesUsed,
      explanation: `Selected ${selectedChunks} most relevant pieces (${totalTokens} tokens). Achieved ${efficiency}% efficiency by filtering out irrelevant content.`
    });
  }

  // AI Response Events
  onAIResponseStart(modelId: string, contextTokens: number) {
    this.emitEvent('ai-response', 'active', { 
      modelId, 
      contextTokens,
      explanation: `Generating answer using ${modelId} with ${contextTokens} tokens of relevant context...`
    });
  }

  onAIResponseComplete(modelId: string, responseLength: number, citationsCount: number, processingTime: number) {
    this.emitEvent('ai-response', 'completed', { 
      modelId, 
      responseLength, 
      citationsCount, 
      processingTime,
      explanation: `Generated ${responseLength}-character response with ${citationsCount} citations in ${processingTime}ms. Every fact is linked to your original documents!`
    });
  }

  // Error Events
  onError(stepId: string, error: string, details?: any) {
    this.emitEvent(stepId, 'error', { error, details });
  }
}

export const ragProcessTracker = new RAGProcessTracker();