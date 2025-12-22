import { ProcessedFile } from '../types';
import { parseFile } from '../services/fileParser';
import { ViewState } from '../types';

export const createFileHandlers = (
  files: ProcessedFile[],
  setFiles: (files: ProcessedFile[] | ((prev: ProcessedFile[]) => ProcessedFile[])) => void,
  setIsProcessingFiles: (processing: boolean) => void,
  viewState: ViewState | null,
  setViewState: (state: ViewState | null) => void
) => {
  const handleFileUpload = async (fileList: FileList) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (files.some(f => f.name === file.name)) continue;
      const processed = await parseFile(file);
      newFiles.push(processed);
    }
    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFiles(false);
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
