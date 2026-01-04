/**
 * Activity Logger Service - Browser Compatible Version
 * Logs all user activities and app workflow events
 * Communicates with Electron main process for file operations
 */

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ACTION' | 'ERROR' | 'WARNING';
  category: string;
  message: string;
  details?: Record<string, any>;
}

class ActivityLogger {
  private logBuffer: LogEntry[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private isElectron: boolean;

  constructor() {
    // Check if running in Electron
    this.isElectron = typeof window !== 'undefined' && !!(window as any).electron;
    
    // Start buffer flush interval
    this.startBufferFlush();
  }

  private startBufferFlush(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL);
  }

  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    try {
      const logContent = this.logBuffer
        .map(entry => this.formatLogEntry(entry))
        .join('\n');

      // Send to Electron main process if available
      if (this.isElectron && (window as any).electron?.writeLogs) {
        // Use synchronous invoke to ensure logs are written
        (window as any).electron.writeLogs(logContent).catch((err: any) => {
          console.error('Failed to write logs:', err);
        });
      } else {
        // Store in localStorage for browser
        const existingLogs = localStorage.getItem('activityLogs') || '';
        const newLogs = existingLogs + (existingLogs ? '\n' : '') + logContent;
        localStorage.setItem('activityLogs', newLogs);
      }
      
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;
    
    if (entry.details && Object.keys(entry.details).length > 0) {
      const detailsStr = Object.entries(entry.details)
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value)}`;
          }
          return `${key}: ${value}`;
        })
        .join(' | ');
      return `${baseLog} | ${detailsStr}`;
    }
    
    return baseLog;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Flush if buffer reaches size limit
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  private createLogEntry(
    level: 'INFO' | 'ACTION' | 'ERROR' | 'WARNING',
    category: string,
    message: string,
    details?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
  }

  // Public logging methods
  public logAction(category: string, message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry('ACTION', category, message, details);
    this.addToBuffer(entry);
  }

  public logInfo(category: string, message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry('INFO', category, message, details);
    this.addToBuffer(entry);
  }

  public logWarning(category: string, message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry('WARNING', category, message, details);
    this.addToBuffer(entry);
  }

  public logErrorMsg(category: string, message: string, errorDetails?: Record<string, any>): void {
    const entry = this.createLogEntry('ERROR', category, message, errorDetails);
    this.addToBuffer(entry);
  }

  // Specific activity logging methods
  public logChatCreated(chatId: string, modelId: string): void {
    this.logAction('CHAT', 'New chat created', { chatId, modelId });
  }

  public logChatDeleted(chatId: string): void {
    this.logAction('CHAT', 'Chat deleted', { chatId });
  }

  public logMessageSent(chatId: string, messageLength: number, modelId: string, filesUsed?: string[]): void {
    this.logAction('MESSAGE', 'Message sent', { chatId, messageLength, modelId, filesUsed: filesUsed?.join(', ') || 'none' });
  }

  public logMessageReceived(chatId: string, responseLength: number, modelId: string, usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }): void {
    this.logAction('MESSAGE', 'Response received', { chatId, responseLength, modelId, ...usage });
  }

  public logFileUploaded(fileName: string, fileType: string, fileSize: number): void {
    this.logAction('FILE', 'File uploaded', { fileName, fileType, fileSize });
  }

  public logFileRemoved(fileName: string): void {
    this.logAction('FILE', 'File removed', { fileName });
  }

  public logFileProcessingStart(fileName: string, fileCount: number, totalCount: number): void {
    this.logAction('FILE', 'Processing file', { fileName, progress: `${fileCount}/${totalCount}` });
  }

  public logFileProcessingComplete(uploadedCount: number, skippedCount: number, skippedFiles: string[]): void {
    this.logAction('FILE', 'Batch upload complete', { uploaded: uploadedCount, skipped: skippedCount, skippedFiles: skippedFiles.join(', ') || 'none' });
  }

  public logFileParsingStart(fileName: string, fileType: string, fileSize: number): void {
    this.logAction('PARSE', 'File parsing started', { fileName, fileType, fileSizeBytes: fileSize });
  }

  public logFileParsingComplete(fileName: string, contentLength: number, tokenCount: number, sections?: number): void {
    this.logAction('PARSE', 'File parsing complete', { fileName, contentLength, tokenCount, sections: sections || 0 });
  }

  public logChunkingStart(fileName: string, contentLength: number): void {
    this.logAction('CHUNK', 'Chunking started', { fileName, contentLength });
  }

  public logChunkingComplete(fileName: string, chunksCount: number, avgChunkSize: number): void {
    this.logAction('CHUNK', 'Chunking complete', { fileName, chunksCount, avgChunkSize });
  }

  public logEmbeddingStart(fileName: string, chunksCount: number): void {
    this.logAction('EMBED', 'Embedding generation started', { fileName, chunksCount });
  }

  public logEmbeddingComplete(fileName: string, chunksCount: number, timeTaken: number): void {
    this.logAction('EMBED', 'Embedding generation complete', { fileName, chunksCount, timeTakenMs: timeTaken });
  }

  public logRequestSent(modelId: string, messageLength: number, filesCount: number, sourcesCount: number): void {
    this.logAction('REQUEST', 'LLM request sent', { modelId, messageLength, filesCount, sourcesCount });
  }

  public logResponseReceived(modelId: string, responseLength: number, inputTokens?: number, outputTokens?: number, totalTokens?: number): void {
    this.logAction('RESPONSE', 'LLM response received', { modelId, responseLength, inputTokens, outputTokens, totalTokens });
  }

  public logContextProcessing(totalTokens: number, filesUsed: number, chunksCount: number): void {
    this.logAction('CONTEXT', 'Context processing', { totalTokens, filesUsed, chunksCount });
  }

  public logContextSelectionStart(query: string, filesCount: number, modelId: string): void {
    this.logAction('🔍 CONTEXT_START', `Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`, { 
      filesCount, 
      modelId,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  public logRetrievalMethodUsed(method: 'hybrid_semantic' | 'keyword_fallback' | 'failed', reason?: string, embeddingStatus?: string): void {
    const methodEmoji = method === 'hybrid_semantic' ? '🧠' : method === 'keyword_fallback' ? '🔤' : '❌';
    this.logAction(`${methodEmoji} RETRIEVAL_METHOD`, `Using: ${method.toUpperCase()}`, { 
      reason: reason || 'primary_choice',
      embeddingStatus: embeddingStatus || 'unknown'
    });
  }

  public logSectionsSelected(totalSections: number, selectedSections: number, originalTokens: number, finalTokens: number, filesInvolved: string[]): void {
    const reductionPercent = originalTokens > 0 ? Math.round(((originalTokens - finalTokens) / originalTokens) * 100) : 0;
    const efficiencyEmoji = reductionPercent > 80 ? '🎯' : reductionPercent > 50 ? '⚡' : '⚠️';
    this.logAction(`${efficiencyEmoji} SECTIONS_RESULT`, `Selected ${selectedSections}/${totalSections} sections`, {
      originalTokens,
      finalTokens,
      reduction: `${reductionPercent}%`,
      files: filesInvolved.join(', ')
    });
  }

  public logTokenEfficiency(originalTokens: number, actualTokens: number, costSavingsEstimate?: string): void {
    const reductionPercent = originalTokens > 0 ? Math.round(((originalTokens - actualTokens) / originalTokens) * 100) : 0;
    const costEmoji = reductionPercent > 80 ? '💰' : reductionPercent > 50 ? '💸' : '🔥';
    this.logAction(`${costEmoji} TOKEN_SAVINGS`, `${reductionPercent}% reduction (${originalTokens} → ${actualTokens})`, {
      costSavingsEstimate: costSavingsEstimate || 'calculated_automatically'
    });
  }

  public logSectionDetails(sections: Array<{title: string, sourceFile: string, pageNumber: number, tokens: number, score: number, method: string}>): void {
    const topSections = sections.slice(0, 3).map((s, idx) => `${idx + 1}. "${s.title.substring(0, 30)}..." (${s.tokens} tokens, score: ${Math.round(s.score * 100)/100})`);
    this.logAction('📋 TOP_SECTIONS', `Best matches: ${topSections.join(' | ')}`, {
      totalSections: sections.length
    });
  }

  // Add session control methods
  public startNewSession(sessionName?: string): void {
    const sessionId = sessionName || `session_${Date.now()}`;
    this.logAction('🆕 NEW_SESSION', `=== STARTING NEW LOG SESSION: ${sessionId} ===`, {
      sessionId,
      startTime: new Date().toISOString()
    });
  }

  public logSessionMarker(marker: string): void {
    this.logAction('📍 MARKER', `=== ${marker.toUpperCase()} ===`, {
      timestamp: new Date().toLocaleTimeString()
    });
  }

  public logSemanticSearch(query: string, resultsCount: number, filesSearched?: number, matchedFiles?: string[]): void {
    this.logAction('SEARCH', 'Semantic search executed', { 
      queryLength: query.length, 
      queryPreview: query.substring(0, 50),
      resultsCount,
      filesSearched: filesSearched || 0,
      matchedFiles: matchedFiles?.join(', ') || 'none'
    });
  }

  public logRAGSearch(query: string, resultsCount: number, chunksRetrieved?: number): void {
    this.logAction('RAG', 'RAG search executed', { 
      queryLength: query.length,
      queryPreview: query.substring(0, 50),
      resultsCount,
      chunksRetrieved: chunksRetrieved || 0
    });
  }

  public logSourceAdded(url: string, title: string): void {
    this.logAction('SOURCE', 'Source added', { url, title });
  }

  public logSourceFetched(url: string, contentLength: number): void {
    this.logAction('SOURCE', 'Source content fetched', { url, contentLength });
  }

  public logSourceDeleted(url: string): void {
    this.logAction('SOURCE', 'Source deleted', { url });
  }

  public logNoteCreated(noteId: string, noteLength: number): void {
    this.logAction('NOTE', 'Note created', { noteId, noteLength });
  }

  public logNoteDeleted(noteId: string): void {
    this.logAction('NOTE', 'Note deleted', { noteId });
  }

  public logTodoCreated(todoId: string, title: string): void {
    this.logAction('TODO', 'Todo created', { todoId, title });
  }

  public logTodoCompleted(todoId: string, title: string): void {
    this.logAction('TODO', 'Todo completed', { todoId, title });
  }

  public logTodoDeleted(todoId: string): void {
    this.logAction('TODO', 'Todo deleted', { todoId });
  }

  public logReminderCreated(reminderId: string, title: string): void {
    this.logAction('REMINDER', 'Reminder created', { reminderId, title });
  }

  public logReminderTriggered(reminderId: string, title: string): void {
    this.logAction('REMINDER', 'Reminder triggered', { reminderId, title });
  }

  public logModelSwitched(fromModel: string, toModel: string): void {
    this.logAction('MODEL', 'Model switched', { fromModel, toModel });
  }

  // RAG Process Logging
  public logRAGFileUpload(fileName: string, fileSize: number, fileType: string): void {
    this.logAction('📁 RAG_FILE_UPLOAD', `File uploaded: ${fileName}`, { fileName, fileSize, fileType });
  }

  public logRAGFileParsing(fileName: string, contentLength: number, sections: number): void {
    this.logAction('📖 RAG_FILE_PARSING', `Document processed: ${fileName}`, { fileName, contentLength, sections });
  }

  public logRAGChunking(fileName: string, chunksCount: number, avgChunkSize: number): void {
    this.logAction('✂️ RAG_CHUNKING', `Text chunked: ${fileName}`, { fileName, chunksCount, avgChunkSize });
  }

  public logRAGEmbedding(fileName: string, chunksCount: number, timeTaken: number): void {
    this.logAction('🧠 RAG_EMBEDDING', `AI understanding generated: ${fileName}`, { fileName, chunksCount, timeTaken, model: 'Xenova/all-MiniLM-L6-v2' });
  }

  public logRAGVectorStorage(fileName: string, chunksCount: number): void {
    this.logAction('💾 RAG_STORAGE', `Knowledge stored: ${fileName}`, { fileName, chunksCount });
  }

  public logRAGUserQuery(query: string, filesCount: number): void {
    this.logAction('❓ RAG_QUERY', `User question: "${query.substring(0, 50)}..."`, { queryLength: query.length, filesCount });
  }

  public logRAGSemanticSearch(query: string, method: string, chunksFound: number): void {
    this.logAction('🔍 RAG_SEARCH', `Smart search completed`, { method, chunksFound, queryPreview: query.substring(0, 30) });
  }

  public logRAGContextSelection(selectedChunks: number, totalTokens: number, efficiency: number): void {
    this.logAction('🎯 RAG_CONTEXT', `Context selected`, { selectedChunks, totalTokens, efficiency });
  }

  public logRAGAIResponse(modelId: string, responseLength: number, citationsCount: number, processingTime: number): void {
    this.logAction('🤖 RAG_RESPONSE', `AI response generated`, { modelId, responseLength, citationsCount, processingTime });
  }

  public logDrawingAction(action: string, details?: Record<string, any>): void {
    this.logAction('DRAWING', action, details);
  }

  public logMindMapGenerated(fileName: string): void {
    this.logAction('MINDMAP', 'Mind map generated', { fileName });
  }

  public logSessionStart(): void {
    this.logInfo('SESSION', 'Application session started');
  }

  public logSessionEnd(): void {
    this.logInfo('SESSION', 'Application session ended');
    this.flushBuffer(); // Ensure all logs are written before closing
  }

  public logError(category: string, message: string, error?: Error): void {
    const details: Record<string, any> = {};
    if (error) {
      details.errorMessage = error.message;
      details.errorStack = error.stack;
    }
    const entry = this.createLogEntry('ERROR', category, message, details);
    this.addToBuffer(entry);
  }

  // Get log files from Electron main process or return empty for browser
  public async getLogFiles(): Promise<string[]> {
    if (this.isElectron && (window as any).electron?.getLogFiles) {
      return (window as any).electron.getLogFiles();
    }
    return ['browser-session.log'];
  }

  // Read log file content from Electron main process or return buffer for browser
  public async readLogFile(fileName: string): Promise<string> {
    if (this.isElectron && (window as any).electron?.readLogFile) {
      return (window as any).electron.readLogFile(fileName);
    }
    // Return current session logs for browser - include both buffer and localStorage
    const currentBuffer = this.logBuffer.map(entry => this.formatLogEntry(entry)).join('\n');
    const storedLogs = localStorage.getItem('activityLogs') || '';
    return storedLogs + (storedLogs && currentBuffer ? '\n' : '') + currentBuffer;
  }

  // Get logs directory from Electron main process
  public async getLogsDirectory(): Promise<string> {
    if (this.isElectron && (window as any).electron?.getLogsDirectory) {
      return (window as any).electron.getLogsDirectory();
    }
    return '';
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();
