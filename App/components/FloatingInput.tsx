import React from 'react';
import { Send, FileText, Mic, Sparkles, Database } from 'lucide-react';
import { ProcessedFile } from '../../types';
import { contextMenuManager, createInputContextMenu } from '../../utils/uiHelpers';

interface FloatingInputProps {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isGenerating: boolean;
  files: ProcessedFile[];
  isInputDragOver: boolean;
  showMentionMenu: boolean;
  filteredFiles: ProcessedFile[];
  mentionIndex: number;
  isRecording: boolean;
  inputHeight: number;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onFileUpload: (files: FileList) => void;
  onToggleRecording: () => void;
  onInsertMention: (fileName: string) => void;
  setIsInputDragOver: (value: boolean) => void;
  setInput: (value: string) => void;
  setInputHeight: (value: number) => void;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  input,
  inputRef,
  isGenerating,
  files,
  isInputDragOver,
  showMentionMenu,
  filteredFiles,
  mentionIndex,
  isRecording,
  inputHeight,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onFileUpload,
  onToggleRecording,
  onInsertMention,
  setIsInputDragOver,
  setInput,
  setInputHeight
}) => {
  return (
    <div className="w-full relative">
      {/* Context Indicator */}
      {isInputDragOver && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium bg-[#4485d1] text-white px-3 py-1.5 rounded-full shadow-lg animate-bounce">
          Drop to add & mention
        </div>
      )}
      {!isInputDragOver && input.trim() && files.length > 0 && (() => {
        const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
        const totalTokens = mentionedFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
        const isOverLimit = totalTokens > 30000;
        
        return (
          <div className="absolute -top-6 left-6 text-[12px] font-medium transition-all duration-300">
            {mentionedFiles.length > 0 ? (
              <span className={`flex items-center gap-1 ${isOverLimit ? 'text-[#ef4444]' : 'text-[#4485d1]'}`}>
                <Sparkles size={10} /> {mentionedFiles.length} file(s) • ~{(totalTokens / 1000).toFixed(0)}k tokens
                {isOverLimit && ' ⚠️'}
              </span>
            ) : (
              <span className="text-[#666666] dark:text-[#a0a0a0] flex items-center gap-1">
                <Database size={10} /> No files selected - Use @ to mention
              </span>
            )}
          </div>
        );
      })()}

      {/* Mention Popup Menu */}
      {showMentionMenu && filteredFiles.length > 0 && (
        <div className="absolute bottom-full left-6 mb-2 w-64 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">
            Mention a source
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredFiles.map((f, i) => (
              <button
                key={f.id}
                onClick={() => onInsertMention(f.name)}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors ${i === mentionIndex ? 'bg-[rgba(68,133,209,0.1)] text-[#4485d1]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white'}`}
              >
                <FileText size={14} className={i === mentionIndex ? 'text-[#4485d1]' : 'text-[#a0a0a0]'} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`floating-input-wrapper transition-all ${
        isInputDragOver ? 'border-[#4485d1] ring-4 ring-[rgba(68,133,209,0.1)] bg-[rgba(68,133,209,0.05)]' : 'focus-within:ring-2 focus-within:ring-[rgba(68,133,209,0.1)]'
      }`}>
        <input
          type="file"
          id="chat-file-input"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx"
          onChange={(e) => e.target.files && onFileUpload(e.target.files)}
          className="hidden"
        />
        <label
          htmlFor="chat-file-input"
          className="absolute left-2 p-2 rounded-full text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] transition-colors cursor-pointer"
          title="Attach files"
        >
          <FileText size={20} />
        </label>
        <button
          onClick={onToggleRecording}
          className={`absolute left-12 p-2 rounded-full transition-colors ${
            isRecording 
              ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' 
              : 'text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)]'
          }`}
          title={isRecording ? 'Stop recording' : 'Voice input'}
        >
          <Mic size={20} />
        </button>

        <textarea
          ref={inputRef}
          onContextMenu={(e) => {
            e.preventDefault();
            const element = e.currentTarget;
            const menuItems = createInputContextMenu(element);
            contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'input-context-menu');
          }}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="floating-input-field"
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsInputDragOver(false);
            
            const cursorPos = inputRef.current?.selectionStart || input.length;
            const before = input.slice(0, cursorPos);
            const after = input.slice(cursorPos);
            const space = (before && !before.endsWith(' ')) ? ' ' : '';
            
            const mention = e.dataTransfer.getData('text/plain');
            if (mention && mention.startsWith('@')) {
              const newValue = before + space + mention + ' ' + after;
              setInput(newValue);
              setTimeout(() => {
                if (inputRef.current) {
                  const newPos = before.length + space.length + mention.length + 1;
                  inputRef.current.setSelectionRange(newPos, newPos);
                  inputRef.current.focus();
                }
              }, 10);
              return;
            }
            
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length > 0) {
              await onFileUpload(droppedFiles);
              const mentions = Array.from(droppedFiles).map(f => `@${f.name}`).join(' ');
              const newValue = before + space + mentions + ' ' + after;
              setInput(newValue);
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }, 100);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsInputDragOver(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsInputDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsInputDragOver(false);
          }}
          placeholder="Ask anything or mention a source"
          disabled={isGenerating}
          autoComplete="off"
          rows={1}
          style={{ height: 'auto', paddingLeft: '106px', paddingRight: '56px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const newHeight = Math.min(target.scrollHeight, 230);
            target.style.height = newHeight + 'px';
            setInputHeight(newHeight + 32);
          }}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <button
            onClick={onSendMessage}
            disabled={!input.trim() || isGenerating}
            className={`floating-send-button ${
              !input.trim() || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isGenerating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
