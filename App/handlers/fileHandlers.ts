import { ProcessedFile } from '../../types';
import { parseFile } from '../../services/fileParser';
import { ViewState } from '../types';
import { activityLogger } from '../../services/activityLogger';
import { embeddingService } from '../../services/embeddingService';
import { ragService } from '../../services/ragService';

const SUPPORTED_EXTENSIONS = [
  '.pdf', '.xlsx', '.xls', '.csv', '.txt', '.md', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
  '.doc', '.docx', '.ppt', '.pptx', '.xml', '.html',
  '.js', '.ts', '.css', '.py', '.java', '.c', '.cpp', '.h', '.cs'
];

const BATCH_SIZE = 5;

interface UploadResult {
  uploaded: number;
  skipped: number;
  skippedFiles: string[];
}

interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
}

export const createFileHandlers = (
  files: ProcessedFile[],
  setFiles: (files: ProcessedFile[] | ((prev: ProcessedFile[]) => ProcessedFile[])) => void,
  setIsProcessingFiles: (processing: boolean) => void,
  viewState: ViewState | null,
  setViewState: (state: ViewState | null) => void,
  setUploadFeedback?: (feedback: UploadResult | null) => void,
  setUploadProgress?: (progress: UploadProgress | null) => void,
  forceUpload: boolean = false
) => {
  const handleFileUpload = async (fileList: FileList, forceReupload: boolean = false) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];
    const skippedFiles: string[] = [];
    
    const fileArray = Array.from(fileList);
    const totalFiles = fileArray.length;
    let processedCount = 0;
    
    activityLogger.logInfo('FILE', `Starting batch upload of ${totalFiles} files${forceReupload ? ' (force reprocess)' : ''}`);
    console.log(`🔄 Force reupload: ${forceReupload}`);
    
    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE);
      
      for (const file of batch) {
        processedCount++;
        
        activityLogger.logFileProcessingStart(file.name, processedCount, totalFiles);
        
        if (setUploadProgress) {
          setUploadProgress({
            current: processedCount,
            total: totalFiles,
            currentFile: file.name
          });
        }
        
        if (file.name.startsWith('.') || file.name.startsWith('~')) {
          skippedFiles.push(file.name);
          activityLogger.logWarning('FILE', `Skipped hidden/temp file: ${file.name}`);
          continue;
        }
        
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          skippedFiles.push(file.name);
          activityLogger.logWarning('FILE', `Skipped unsupported file type: ${file.name}`, { extension: ext });
          continue;
        }
        
        const filePath = (file as any).webkitRelativePath || file.name;
        const existingFile = files.find(f => (f.path || f.name) === filePath);
        if (existingFile && !forceReupload) {
          skippedFiles.push(file.name);
          activityLogger.logWarning('FILE', `Skipped duplicate file: ${file.name}`);
          continue;
        }
        
        // If force reupload, remove existing file first
        if (existingFile && forceReupload) {
          console.log(`🔄 Removing old version of ${file.name}`);
          setFiles(prev => prev.filter(f => f.id !== existingFile.id));
        }
        
        try {
          activityLogger.logRAGFileUpload(file.name, file.size, file.type);
          
          const processed = await parseFile(file, forceReupload || forceUpload);
          
          activityLogger.logRAGFileParsing(file.name, processed.content?.length || 0, 0);
          
          newFiles.push(processed);
          setFiles(prev => [...prev, processed]);
          activityLogger.logFileUploaded(file.name, file.type, file.size);
          
          // ✅ AUTO-EMBED: Process file for RAG if enabled and not an image
          if (ragService.isEnabled() && processed.type !== 'image' && processed.status === 'ready') {
            try {
              console.log(`[RAG] 📦 Indexing ${file.name} for semantic search...`);
              
              await embeddingService.processFile(processed, (progress) => {
                if (setUploadProgress) {
                  setUploadProgress({
                    current: processedCount,
                    total: totalFiles,
                    currentFile: `Indexing ${file.name} (${progress.current}/${progress.total} chunks)`
                  });
                }
              });
              
              console.log(`[RAG] ✅ ${file.name} indexed for semantic search`);
              activityLogger.logInfo('RAG', `File indexed: ${file.name}`);
            } catch (error) {
              console.warn(`[RAG] ⚠️ Failed to embed ${file.name}:`, error);
              activityLogger.logWarning('RAG', `Embedding failed for ${file.name}`, { error: String(error) });
            }
          }
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          skippedFiles.push(file.name);
          activityLogger.logErrorMsg('FILE', `Failed to process file: ${file.name}`, { error: String(err) });
        }
      }
    }
    
    // console.log(`[FILE HANDLER] Scheduling clear in 2 seconds`);
    
    if (setUploadProgress) setUploadProgress(null);
    setIsProcessingFiles(false);
    
    activityLogger.logFileProcessingComplete(newFiles.length, skippedFiles.length, skippedFiles);
    
    if (setUploadFeedback) {
      setUploadFeedback({
        uploaded: newFiles.length,
        skipped: skippedFiles.length,
        skippedFiles
      });
      setTimeout(() => setUploadFeedback(null), 8000);
    }
  };

  const handleRemoveFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (file) {
      activityLogger.logFileRemoved(file.name);
      // Clear from permanent storage AND embeddings (by ID and hash) to allow reprocessing
      const { permanentStorage } = await import('../../services/permanentStorage');
      const { embeddingService } = await import('../../services/embeddingService');
      const { generateFileHash } = await import('../../services/embeddingUtils');
      
      // Delete by file ID
      await permanentStorage.deleteFile(id);
      await embeddingService.deleteFile(id);
      
      // Also delete by content hash to clear cache
      if (file.content) {
        const contentHash = await generateFileHash(file.content);
        await embeddingService.deleteFileByHash(contentHash);
      }
      
      console.log(`🗑️ Deleted ${file.name} from storage and embeddings - can now be reprocessed`);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

  const handleViewDocument = (fileName: string, page?: number, quote?: string, location?: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      activityLogger.logAction('DOCUMENT', 'Document viewer opened', { fileName, page, hasQuote: !!quote });
      setViewState({
        fileId: file.id,
        page: page || 1,
        quote,
        location
      });
    }
  };

  return {
    handleFileUpload,
    handleRemoveFile,
    handleViewDocument,
  };
};
