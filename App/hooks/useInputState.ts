import { useState, useRef } from 'react';
import { UploadedImage } from '../components/ImageUploadPanel';

export const useInputState = () => {
  const [input, setInput] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const [inputHeight, setInputHeight] = useState(56);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
