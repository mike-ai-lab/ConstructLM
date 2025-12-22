import { useState, useRef } from 'react';

export const useInputState = () => {
  const [input, setInput] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const [inputHeight, setInputHeight] = useState(56);
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
    inputRef,
  };
};
