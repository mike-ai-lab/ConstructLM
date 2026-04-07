import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, FileText, Mic, Sparkles, Plus, X, Eye, Loader } from 'lucide-react';
import { ProcessedFile } from '../../types';
import { contextMenuManager, createInputContextMenu } from '../../utils/uiHelpers';
import { createPortal } from 'react-dom';
import DocumentViewer from '../../components/DocumentViewer';
import TabbedWebViewer from '../../components/TabbedWebViewer';
import TabbedWebViewerElectron from '../../components/TabbedWebViewerElectron';
import { ImageUploadPanel, UploadedImage } from './ImageUploadPanel';

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
  isTranscribing: boolean;
  inputHeight: number;
  sources: any[];
  selectedSourceIds: string[];
  uploadedImages: UploadedImage[];
  activeModelId: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSendMessage: () => void;
  onFileUpload: (files: FileList) => void;
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (id: string) => void;
  onRecalculateImageTokens?: (modelId: string) => void;
  onToggleRecording: () => void;
  onInsertMention: (fileName: string) => void;
  setIsInputDragOver: (value: boolean) => void;
  setInput: (value: string) => void;
  setInputHeight: (value: number) => void;
  onAddSource: (url: string) => void;
  onDeleteSource: (id: string) => void;
  onToggleSource: (id: string) => void;
}

interface SourceWithCheck extends Record<string, any> {
  id: string;
  url: string;
  title?: string;
  checked?: boolean;
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
  isTranscribing,
  inputHeight,
  sources,
  selectedSourceIds,
  uploadedImages,
  activeModelId,
  onInputChange,
  onKeyDown,
  onPaste,
  onSendMessage,
  onFileUpload,
  onImageUpload,
  onRemoveImage,
  onRecalculateImageTokens,
  onToggleRecording,
  onInsertMention,
  setIsInputDragOver,
  setInput,
  setInputHeight,
  onAddSource,
  onDeleteSource,
  onToggleSource
}) => {
  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const [previewSource, setPreviewSource] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const cancelRef = useRef(false);

  // Check if current model supports images
  const [modelSupportsImages, setModelSupportsImages] = React.useState(true);
  
  React.useEffect(() => {
    const checkModelSupport = async () => {
      const { MODEL_REGISTRY } = await import('../../services/modelRegistry');
      const currentModel = MODEL_REGISTRY.find(m => m.id === activeModelId);
      const supportsImages = currentModel?.supportsImages ?? false;
      setModelSupportsImages(supportsImages);
      
      // Recalculate image token estimates when model changes
      if (uploadedImages.length > 0 && onRecalculateImageTokens) {
        onRecalculateImageTokens(activeModelId);
      }
    };
    checkModelSupport();
  }, [activeModelId, uploadedImages.length, onRecalculateImageTokens]);

  useEffect(() => {
    if (showSourcePopup && sourceInputRef.current) {
      sourceInputRef.current.focus();
    }
  }, [showSourcePopup]);

  const handleAddSource = () => {
    if (sourceUrl.trim()) {
      onAddSource(sourceUrl.trim());
      setSourceUrl('');
    }
  };

  const handlePreview = (source: any) => {
    console.log('🔍 PREVIEW CLICKED:', source);
    console.log('  - URL:', source.url);
    console.log('  - Title:', source.title);
    console.log('  - Has content:', !!source.content);
    console.log('  - Content length:', source.content?.length || 0);
    console.log('  - Status:', source.status);
    cancelRef.current = false;
    setIsLoadingPreview(true);
    setPreviewSource(source);
  };

  const handleClosePreview = () => {
    console.log('❌ CLOSE PREVIEW');
    cancelRef.current = true;
    setPreviewSource(null);
    setIsLoadingPreview(false);
  };

  useEffect(() => {
    if (previewSource) {
      console.log('📺 PORTAL CONDITION CHECK:');
      console.log('  - previewSource exists:', !!previewSource);
      console.log('  - previewSource.content exists:', !!previewSource.content);
      console.log('  - isLoadingPreview:', isLoadingPreview);
      console.log('  - Should render portal:', !!(previewSource && previewSource.content));
    }
  }, [previewSource, isLoadingPreview]);

  const handlePreviewLoaded = useCallback(() => {
    console.log('✅ Preview loaded callback triggered');
    setIsLoadingPreview(false);
  }, []);

  const checkedCount = sources.filter(s => s.selected !== false).length;
  const totalCount = sources.length;

  // Handle file input change to separate images from documents
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const fileList = e.target.files;
    const imageFiles: File[] = [];
    const documentFiles: File[] = [];
    
    Array.from(fileList).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else {
        documentFiles.push(file);
      }
    });
    
    // Handle images separately
    if (imageFiles.length > 0) {
      const imageDataTransfer = new DataTransfer();
      imageFiles.forEach(file => imageDataTransfer.items.add(file));
      onImageUpload(imageDataTransfer.files);
    }
    
    // Handle documents
    if (documentFiles.length > 0) {
      const docDataTransfer = new DataTransfer();
      documentFiles.forEach(file => docDataTransfer.items.add(file));
      onFileUpload(docDataTransfer.files);
    }
    
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="w-full relative">
      {/* Source Popup List */}
      {showSourcePopup && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-[200] w-[350px]">
          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
            {sources.map((source: SourceWithCheck) => (
              <div key={source.id} className="flex items-center justify-between bg-white dark:bg-[#3C3C3C] border-2 border-[#0078d4] px-4 py-2 rounded-full shadow-lg flex-shrink-0">
                <div className="flex items-center flex-1 overflow-hidden">
                  <div
                    onClick={() => onToggleSource(source.id)}
                    className={`w-[18px] h-[18px] border-2 border-[#0078d4] rounded-full mr-2 cursor-pointer flex items-center justify-center flex-shrink-0 ${
                      source.selected !== false ? 'bg-[#0078d4]' : 'bg-transparent'
                    }`}
                  >
                    {source.selected !== false && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-[#1a1a1a] dark:text-white text-sm">
                    {source.title || source.url}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {source.content && source.status === 'fetched' && (
                    <button
                      onClick={() => handlePreview(source)}
                      className="text-blue-600 hover:text-blue-800 w-5 h-5 flex items-center justify-center flex-shrink-0"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteSource(source.id)}
                    className="text-[#0078d4] hover:text-[#1a1a1a] dark:hover:text-white text-xl w-5 h-5 flex items-center justify-center flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <input
            ref={sourceInputRef}
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSource();
              } else if (e.key === 'Escape') {
                setShowSourcePopup(false);
                setSourceUrl('');
              }
            }}
            placeholder="Paste source link here..."
            className="bg-white dark:bg-[#3C3C3C] border-2 border-[#0078d4] rounded-full px-4 py-2 text-[#1a1a1a] dark:text-white text-sm outline-none w-full shadow-lg mt-2"
          />
        </div>
      )}
      
      {/* Badges Container - Aligned horizontally */}
      <div className="flex justify-between items-center mb-2">
        {/* Source Indicator - Left Side */}
        <div>
          {checkedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-4 py-1 bg-[#0078D4] text-white text-xs font-semibold rounded-xl shadow-sm">
              {checkedCount}/{totalCount} LINKS USED
            </span>
          )}
        </div>
        
        {/* File/Token Count - Right Side */}
        <div>
          {!isInputDragOver && (() => {
            const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
            const totalFileTokens = mentionedFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
            const totalImageTokens = uploadedImages.reduce((sum, img) => sum + img.estimatedTokens, 0);
            const totalTokens = totalFileTokens + totalImageTokens;
            const totalItems = mentionedFiles.length + uploadedImages.length;
            const isOverLimit = totalTokens > 30000;
            
            if (totalItems === 0) return null;
            
            // Smart token display: full numbers under 10k, abbreviated above
            const tokenDisplay = totalTokens < 10000 
              ? `${totalTokens} tokens`
              : `${(totalTokens / 1000).toFixed(1)}k tokens`;
            
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded text-[11px] font-medium shadow-sm ${isOverLimit ? 'text-[#ef4444]' : 'text-[#4485d1]'}`}>
                <Sparkles size={10} /> {totalItems} item(s) • ~{tokenDisplay}
                {isOverLimit && ' ⚠️'}
              </span>
            );
          })()}
        </div>
      </div>
      
      {/* Image Upload Panel */}
      <ImageUploadPanel 
        images={uploadedImages} 
        onRemoveImage={onRemoveImage}
        activeModelId={activeModelId}
        modelSupportsImages={modelSupportsImages}
      />
      
      {isInputDragOver && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium bg-[#4485d1] text-white px-3 py-1.5 rounded-full shadow-lg animate-bounce">
          Drop to add & mention
        </div>
      )}

      {/* Mention Popup Menu */}
      {showMentionMenu && filteredFiles.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] left-6 w-64 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-[200] animate-in slide-in-from-bottom-2 fade-in duration-200">
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
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          onClick={() => setShowSourcePopup(!showSourcePopup)}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none text-[#a0a0a0] hover:text-[#4485d1] transition-colors cursor-pointer flex items-center justify-center"
          title="Add source link"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
          </svg>
        </button>
        {/* <button
          onClick={onToggleRecording}
          disabled={isTranscribing}
          className={`absolute left-[50px] top-1/2 -translate-y-1/2 p-0 bg-transparent border-none transition-all ${
            isTranscribing
              ? 'text-blue-500'
              : isRecording 
              ? 'text-blue-500 scale-110' 
              : 'text-[#a0a0a0] hover:text-[#4485d1]'
          }`}
          title={isTranscribing ? 'Transcribing...' : isRecording ? 'Stop recording' : 'Voice input'}
        >
          {isTranscribing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
          )}
        </button> */}
        <label
          htmlFor="chat-file-input"
          className="absolute left-[50px] top-1/2 -translate-y-1/2 p-0 flex items-center justify-center text-[#a0a0a0] hover:text-[#4485d1] transition-colors cursor-pointer"
          title="Attach files"
        >
          <Plus size={24} />
        </label>

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
          onPaste={onPaste}
          className="floating-input-field"
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsInputDragOver(false);
            
            const cursorPos = inputRef.current?.selectionStart || input.length;
            const before = input.slice(0, cursorPos);
            const after = input.slice(cursorPos);
            const space = (before && !before.endsWith(' ')) ? ' ' : '';
            
            // Check if it's a mention drag from sidebar
            const mention = e.dataTransfer.getData('text/plain');
            if (mention && mention.startsWith('@')) {
              // Check if the mentioned file is an image
              const fileName = mention.substring(1); // Remove @
              const file = files.find(f => f.name === fileName);
              
              if (file && file.type === 'image' && file.fileHandle) {
                // It's an image - add to image panel instead of mention
                const imageDataTransfer = new DataTransfer();
                imageDataTransfer.items.add(file.fileHandle);
                await onImageUpload(imageDataTransfer.files);
                return;
              }
              
              // Not an image - add as mention
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
            
            // Handle file drops
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles.length > 0) {
              // Separate images from documents
              const imageFiles: File[] = [];
              const documentFiles: File[] = [];
              
              Array.from(droppedFiles).forEach(file => {
                if (file.type.startsWith('image/')) {
                  imageFiles.push(file);
                } else {
                  documentFiles.push(file);
                }
              });
              
              // Handle images
              if (imageFiles.length > 0) {
                const imageDataTransfer = new DataTransfer();
                imageFiles.forEach(file => imageDataTransfer.items.add(file));
                await onImageUpload(imageDataTransfer.files);
              }
              
              // Handle documents with mentions
              if (documentFiles.length > 0) {
                const docDataTransfer = new DataTransfer();
                documentFiles.forEach(file => docDataTransfer.items.add(file));
                await onFileUpload(docDataTransfer.files);
                
                const mentions = documentFiles.map(f => `@${f.name}`).join(' ');
                const newValue = before + space + mentions + ' ' + after;
                setInput(newValue);
              }
              
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
          placeholder="Ask anything"
          disabled={isGenerating}
          autoComplete="off"
          rows={1}
          style={{ height: 'auto', paddingLeft: '90px', paddingRight: '56px' }}
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
            className="bg-[#0078D4] border-none rounded-full w-[38px] h-[38px] flex justify-center items-center cursor-pointer text-white hover:bg-[#005a9e] transition-colors disabled:opacity-50 disabled:cursor-default"
            title="Send message"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 10H3v4h3v6h2v-6h3v6h2v-6h3v6h2v-6h3V10h-3V4h-2v6h-3V4h-2v6H8V4H6v6z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {previewSource && previewSource.content && (
        <>
          {console.log('DEBUG: Portal is rendering, isLoadingPreview =', isLoadingPreview)}
          {createPortal(
            <div className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" onClick={handleClosePreview}>
              <div className="h-full w-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden" style={{ width: '90vw', height: '90vh', maxWidth: '1400px' }}>
                  <PreviewContent source={previewSource} onClose={handleClosePreview} onLoaded={handlePreviewLoaded} cancelRef={cancelRef} isLoading={isLoadingPreview} />
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};

const PreviewContent: React.FC<{ source: any; onClose: () => void; onLoaded: () => void; cancelRef: React.RefObject<boolean>; isLoading?: boolean }> = ({ source, onClose, onLoaded, cancelRef, isLoading }) => {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const WebViewerComponent = isElectron ? TabbedWebViewerElectron : TabbedWebViewer;

  useEffect(() => {
    // Immediately call onLoaded since web viewer renders instantly
    onLoaded();
  }, [onLoaded]);

  return <WebViewerComponent initialUrl={source.url} onClose={onClose} onNewTabRequest={() => {}} />;
};
