import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  size: number;
  estimatedTokens: number;
}

interface ImageUploadPanelProps {
  images: UploadedImage[];
  onRemoveImage: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({ 
  images, 
  onRemoveImage,
  isOpen,
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Internal state for expand/collapse

  if (images.length === 0) return null;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalTokens = images.reduce((sum, img) => sum + img.estimatedTokens, 0);

  return (
    <div className={`absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-[rgba(255,255,255,0.15)] overflow-hidden transition-all duration-300 transform ${
      isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}>
      {/* Header - Clickable to toggle expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#2a2a2a] border-b-2 border-slate-200 dark:border-[rgba(255,255,255,0.1)] flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#333] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            Attached Assets ({images.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
            Total: ~{totalTokens} Tokens
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      {/* Image List - Collapsible */}
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-[rgba(255,255,255,0.05)]">
          {images.map((img) => (
            <div 
              key={img.id} 
              className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail */}
                <img 
                  src={img.preview} 
                  className="w-10 h-10 rounded shadow-sm object-cover border border-slate-200 dark:border-[rgba(255,255,255,0.1)]" 
                  alt="preview" 
                />
                
                {/* File Info */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {img.file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatSize(img.size)} • {img.estimatedTokens} tkn
                  </span>
                </div>
              </div>

              {/* Remove Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(img.id);
                }} 
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
