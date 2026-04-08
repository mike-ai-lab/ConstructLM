import { useState, useRef, useEffect } from 'react';
import { UploadedImage } from '../components/ImageUploadPanel';
import { sessionPersistence } from '../../services/sessionPersistence';

export const useInputState = (currentChatId: string | null = null) => {
  // Load draft for current chat
  const chatDraft = currentChatId ? sessionPersistence.loadChatDraft(currentChatId) : { input: '', uploadedImages: [] };
  
  const [input, setInput] = useState(chatDraft.input || '');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const [inputHeight, setInputHeight] = useState(56);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => {
    // Restore uploaded images for current chat
    return chatDraft.uploadedImages.map(img => ({
      id: img.id,
      file: new File([], img.fileName, { type: img.type }),
      preview: img.dataUrl,
      size: img.size,
      estimatedTokens: img.estimatedTokens,
    }));
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load draft when chat changes
  useEffect(() => {
    if (currentChatId) {
      const draft = sessionPersistence.loadChatDraft(currentChatId);
      setInput(draft.input || '');
      setUploadedImages(draft.uploadedImages.map(img => ({
        id: img.id,
        file: new File([], img.fileName, { type: img.type }),
        preview: img.dataUrl,
        size: img.size,
        estimatedTokens: img.estimatedTokens,
      })));
    }
  }, [currentChatId]);

  // Auto-save input draft for current chat
  useEffect(() => {
    if (!currentChatId) return;

    sessionPersistence.startAutoSave(() => ({
      chatId: currentChatId,
      input,
      uploadedImages,
    }));

    return () => {
      sessionPersistence.stopAutoSave();
    };
  }, [currentChatId, input, uploadedImages]);

  return {
    input,
    setInput,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    setMentionQuery,
    mentionIndex,
    setMentionIndex,
    isInputDragOver,
    setIsInputDragOver,
    inputHeight,
    setInputHeight,
    uploadedImages,
    setUploadedImages,
    inputRef,
  };
};
