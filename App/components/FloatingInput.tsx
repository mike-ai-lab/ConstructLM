import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight, Mic, Square, Loader2, FileText, Lightbulb, Sparkles, BookOpen, Code } from 'lucide-react';
import { ImageUploadPanel, UploadedImage } from './ImageUploadPanel';
import { getAllModels } from '../../services/modelRegistry';

interface Suggestion {
  icon: React.ReactNode;
  text: string;
  color: string;
}

interface FloatingInputProps {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isGenerating: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent) => void; // Paste handler for images
  onSendMessage: () => void;
  onFileUpload?: (files: FileList) => void;
  onImageUpload?: (files: FileList) => void; // Handler for image uploads
  onToggleRecording?: () => void;
  isRecording?: boolean;
  isTranscribing?: boolean;
  setInput: (value: string) => void;
  showSuggestions?: boolean; // Control whether to show template suggestions
  uploadedImages?: UploadedImage[]; // Images uploaded by user
  onRemoveImage?: (id: string) => void; // Handler to remove an image
  activeModelId?: string; // Current active model ID
  [key: string]: any;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  input,
  inputRef,
  isGenerating,
  onInputChange,
  onKeyDown,
  onPaste, // Add paste handler
  onSendMessage,
  onFileUpload,
  onImageUpload, // Add this to destructuring
  onToggleRecording,
  isRecording = false,
  isTranscribing = false,
  setInput,
  showSuggestions = false, // Default to false (no suggestions)
  uploadedImages = [], // Default to empty array
  onRemoveImage,
  activeModelId,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open panel when images are added
  React.useEffect(() => {
    if (uploadedImages && uploadedImages.length > 0) {
      setIsPanelOpen(true);
    }
  }, [uploadedImages?.length]);

  // Check if current model supports images
  const modelSupportsImages = React.useMemo(() => {
    if (!activeModelId) return false;
    const allModels = getAllModels();
    const model = allModels.find(m => m.id === activeModelId);
    return model?.supportsImages || false;
  }, [activeModelId]);

  // DEBUG: Log image state
  React.useEffect(() => {
    console.log('[FloatingInput] uploadedImages:', uploadedImages);
    console.log('[FloatingInput] uploadedImages.length:', uploadedImages?.length);
    console.log('[FloatingInput] onRemoveImage exists:', !!onRemoveImage);
    console.log('[FloatingInput] Should render panel:', uploadedImages && uploadedImages.length > 0 && onRemoveImage);
  }, [uploadedImages, onRemoveImage]);

  // Template suggestions for ConstructLM
  const suggestions: Suggestion[] = [
    { icon: <FileText size={16} />, text: "Analyze documents", color: "text-blue-400" },
    { icon: <Sparkles size={16} />, text: "Summarize", color: "text-purple-400" },
    { icon: <BookOpen size={16} />, text: "Find citations", color: "text-amber-400" }
  ];

  // Robust Height Calculation - Match Gemini sizing
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    // Min: 44px (single line), Max: 180px (about 6-7 lines)
    // This gives container: Min ~92px, Max ~228px (similar to Gemini)
    const newHeight = Math.min(Math.max(44, scrollHeight), 180);
    textarea.style.height = `${newHeight}px`;
  }, [input, inputRef]);

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = e.target.files;
    const imageFiles: File[] = [];
    const documentFiles: File[] = [];
    
    // Separate images from documents
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else {
        documentFiles.push(file);
      }
    });
    
    // Handle images
    if (imageFiles.length > 0 && onImageUpload) {
      const imageDataTransfer = new DataTransfer();
      imageFiles.forEach(file => imageDataTransfer.items.add(file));
      onImageUpload(imageDataTransfer.files);
    }
    
    // Handle documents
    if (documentFiles.length > 0 && onFileUpload) {
      const docDataTransfer = new DataTransfer();
      documentFiles.forEach(file => docDataTransfer.items.add(file));
      onFileUpload(docDataTransfer.files);
    }
    
    e.target.value = '';
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Delegate all key handling to parent (including Enter key)
    // This prevents double submission when Enter is pressed
    onKeyDown(e);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const imageFiles: File[] = [];
    const documentFiles: File[] = [];
    
    // Separate images from documents
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else {
        documentFiles.push(file);
      }
    });
    
    // Handle images
    if (imageFiles.length > 0 && onImageUpload) {
      const imageDataTransfer = new DataTransfer();
      imageFiles.forEach(file => imageDataTransfer.items.add(file));
      onImageUpload(imageDataTransfer.files);
    }
    
    // Handle documents
    if (documentFiles.length > 0 && onFileUpload) {
      const docDataTransfer = new DataTransfer();
      documentFiles.forEach(file => docDataTransfer.items.add(file));
      onFileUpload(docDataTransfer.files);
    }
  };

  return (
    <div className="w-full relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(68, 133, 209, 0.3); border-radius: 10px; }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(68, 133, 209, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(68, 133, 209, 0); }
          100% { box-shadow: 0 0 0 0 rgba(68, 133, 209, 0); }
        }
        .animate-recording { animation: pulse-blue 2s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .smooth-shadow { transition: border-color 0.4s ease, box-shadow 0.4s ease; }
        .floating-suggestions { transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-full space-y-4">
        {/* Container with relative positioning for absolute panel */}
        <div className="relative">
          {/* Image Upload Panel - Positioned above input */}
          {uploadedImages && uploadedImages.length > 0 && onRemoveImage && (
            <ImageUploadPanel
              images={uploadedImages}
              onRemoveImage={onRemoveImage}
              isOpen={isPanelOpen}
              onToggle={() => setIsPanelOpen(!isPanelOpen)}
            />
          )}

          <div className={`smooth-shadow relative flex flex-col bg-white dark:bg-[#1a1a1a] border rounded-[32px] ${
            isFocused 
              ? 'border-[#4485d1]/40 shadow-[0_0_80px_-20px_rgba(68,133,209,0.3)]' 
              : 'border-gray-300 dark:border-[rgba(255,255,255,0.1)] shadow-lg'
          }`}>
          <div className="flex items-center p-3 gap-2 cursor-default select-none">
            <button
              onClick={handleAttach}
              aria-label="Add Attachment"
              className="p-2.5 text-gray-500 dark:text-slate-500 hover:text-[#4485d1] hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all flex-shrink-0 active:scale-90 group/plus self-end"
            >
              <Plus size={22} className="group-hover/plus:rotate-90 transition-transform duration-300" />
            </button>

            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={inputRef}
                placeholder="Ask anything..."
                className="custom-scrollbar w-full bg-transparent border-none outline-none text-[17px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 py-3 resize-none leading-[1.5] overflow-y-auto transition-[height] duration-200"
                style={{ minHeight: '44px' }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={input}
                onChange={onInputChange}
                onKeyDown={handleKeyDownInternal}
                onPaste={onPaste}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                disabled={isGenerating}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 self-end">
              {input && (
                <span className="text-[10px] text-gray-500 dark:text-slate-600 font-mono mr-2 animate-in fade-in duration-500 tracking-widest">
                  {input.length}
                </span>
              )}

              {onToggleRecording && (
                <button
                  aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                  onClick={onToggleRecording}
                  disabled={isTranscribing}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${
                    isRecording 
                      ? 'bg-[#4485d1] text-white animate-recording' 
                      : 'bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-slate-400 hover:text-[#4485d1] hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 size={18} className="animate-spin text-[#4485d1]" />
                  ) : isRecording ? (
                    <Square size={14} fill="currentColor" />
                  ) : (
                    <Mic size={18} strokeWidth={2} />
                  )}
                </button>
              )}

              <button
                aria-label="Send message"
                onClick={onSendMessage}
                disabled={!input.trim() || isTranscribing || isGenerating}
                className={`flex items-center justify-center rounded-full bg-[#4485d1] text-white shadow-xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  input && !isTranscribing && !isGenerating
                    ? 'w-10 h-10 opacity-100 scale-100' 
                    : 'w-0 h-10 opacity-0 scale-50 pointer-events-none'
                }`}
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ChevronRight size={22} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Floating Suggestions - Only show when showSuggestions is true */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={`floating-suggestions flex flex-row justify-center gap-2 px-4 relative z-20 ${
            (!input && !isTranscribing && !isGenerating) 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
          }`}>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(item.text)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/5 rounded-full text-[12px] font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm active:scale-95 group whitespace-nowrap"
              >
                <span className={`${item.color} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </span>
                {item.text}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
