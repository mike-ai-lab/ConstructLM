import { ProcessedFile } from '../../types';
import { parseFile } from '../../services/fileParser';
import { ViewState } from '../types';

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
  setUploadProgress?: (progress: UploadProgress | null) => void
) => {
  const handleFileUpload = async (fileList: FileList) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];
    const skippedFiles: string[] = [];
    
    const fileArray = Array.from(fileList);
    const totalFiles = fileArray.length;
    let processedCount = 0;
    
    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE);
      
      for (const file of batch) {
        processedCount++;
        
        if (setUploadProgress) {
          setUploadProgress({
            current: processedCount,
            total: totalFiles,
            currentFile: file.name
          });
        }
        
        if (file.name.startsWith('.') || file.name.startsWith('~')) {
          skippedFiles.push(file.name);
          continue;
        }
        
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          skippedFiles.push(file.name);
          continue;
        }
        
        const filePath = (file as any).webkitRelativePath || file.name;
        if (files.some(f => (f.path || f.name) === filePath)) {
          skippedFiles.push(file.name);
          continue;
        }
        
        try {
          const processed = await parseFile(file);
          newFiles.push(processed);
          setFiles(prev => [...prev, processed]);
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          skippedFiles.push(file.name);
        }
      }
    }
    
    if (setUploadProgress) setUploadProgress(null);
    setIsProcessingFiles(false);
    
    if (setUploadFeedback) {
      setUploadFeedback({
        uploaded: newFiles.length,
        skipped: skippedFiles.length,
        skippedFiles
      });
      setTimeout(() => setUploadFeedback(null), 8000);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

  const handleViewDocument = (fileName: string, page?: number, quote?: string, location?: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
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
