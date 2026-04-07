import React from 'react';
import { ProcessedFile } from '../../types';
import { UploadedImage } from '../components/ImageUploadPanel';

// Estimate tokens for an image based on size and model's handling method
const estimateImageTokens = (file: File, modelId?: string): number => {
  // If no model specified, use conservative estimate
  if (!modelId) {
    return 1000;
  }
  
  // Check model's image handling method
  // Gemini uses File API (~10 tokens per image regardless of size)
  if (modelId.includes('gemini')) {
    return 10;
  }
  
  // OpenAI, OpenRouter, and other base64 models
  // Token usage varies by image size and resolution
  const sizeInMB = file.size / (1024 * 1024);
  
  // Base tokens for image processing
  const baseTokens = 85; // Minimum for a small image
  
  // Additional tokens based on size
  // Roughly 500-1500 tokens per MB for base64 images
  const sizeTokens = Math.round(sizeInMB * 1000);
  
  // Cap at reasonable maximum
  return Math.min(baseTokens + sizeTokens, 2000);
};

export const createInputHandlers = (
  input: string,
  setInput: (input: string) => void,
  files: ProcessedFile[],
  setShowMentionMenu: (show: boolean) => void,
  setMentionQuery: (query: string) => void,
  setMentionIndex: (index: number) => void,
  inputRef: React.RefObject<HTMLTextAreaElement>,
  filteredFiles: ProcessedFile[],
  mentionIndex: number,
  showMentionMenu: boolean,
  handleSendMessage: () => void,
  uploadedImages: UploadedImage[],
  setUploadedImages: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void,
  activeModelId: string
) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart || 0;
    const lastAt = val.lastIndexOf('@', cursor - 1);
    
    if (lastAt !== -1) {
      const query = val.slice(lastAt + 1, cursor);
      if (!query.includes(' ')) {
        setShowMentionMenu(true);
        setMentionQuery(query.toLowerCase());
        setMentionIndex(0);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (fileName: string) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const lastAt = input.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1) {
      const before = input.slice(0, lastAt);
      const after = input.slice(cursor);
      const newValue = `${before}@${fileName} ${after}`;
      setInput(newValue);
      setShowMentionMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionMenu && filteredFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredFiles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredFiles[mentionIndex].name);
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    for (const file of imageFiles) {
      // Check for duplicates and auto-rename
      let fileName = file.name;
      let counter = 1;
      
      while (uploadedImages.some(img => img.file.name === fileName)) {
        const nameParts = file.name.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        fileName = `${baseName}-(${counter}).${extension}`;
        counter++;
      }
      
      // Create a new File object with the potentially renamed name
      const renamedFile = fileName !== file.name 
        ? new File([file], fileName, { type: file.type })
        : file;
      
      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(renamedFile);
      const estimatedTokens = estimateImageTokens(renamedFile, activeModelId);

      const uploadedImage: UploadedImage = {
        id,
        file: renamedFile,
        preview,
        size: renamedFile.size,
        estimatedTokens,
      };

      setUploadedImages(prev => [...prev, uploadedImage]);
    }
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageItems.push(file);
        }
      }
    }

    if (imageItems.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      imageItems.forEach(file => dataTransfer.items.add(file));
      await handleImageUpload(dataTransfer.files);
    }
  };

  const recalculateImageTokens = (modelId: string) => {
    setUploadedImages(prev => 
      prev.map(img => ({
        ...img,
        estimatedTokens: estimateImageTokens(img.file, modelId)
      }))
    );
  };

  return {
    handleInputChange,
    insertMention,
    handleKeyDown,
    handleImageUpload,
    handleRemoveImage,
    handlePaste,
    recalculateImageTokens,
  };
};
