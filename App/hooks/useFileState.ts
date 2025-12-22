import { useState } from 'react';
import { ProcessedFile } from '../types';

export const useFileState = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  return {
    files,
    setFiles,
    isProcessingFiles,
    setIsProcessingFiles,
  };
};
