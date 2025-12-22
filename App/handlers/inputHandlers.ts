import React from 'react';
import { ProcessedFile } from '../../types';

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
  handleSendMessage: () => void
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

  return {
    handleInputChange,
    insertMention,
    handleKeyDown,
  };
};
