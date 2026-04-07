import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Image as ImageIcon, AlertTriangle } from 'lucide-react';

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
  activeModelId?: string;
  modelSupportsImages?: boolean;
}

export const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({ 
  images, 
  onRemoveImage, 
  activeModelId,
  modelSupportsImages = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (images.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalTokens = images.reduce((sum, img) => sum + img.estimatedTokens, 0);

  return (
    <div className={`mb-2 border rounded-lg shadow-sm overflow-hidden ${
      modelSupportsImages 
        ? 'bg-white dark:bg-[#2a2a2a] border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.1)]'
        : 'bg-[#fff3cd] dark:bg-[#664d03] border-[#ffc107]'
    }`}>
      {/* Vision Warning Banner */}
      {!modelSupportsImages && (
        <div className="px-3 py-2 bg-[#ffc107] dark:bg-[#856404] border-b border-[#ffb300] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#664d03] dark:text-[#fff3cd] flex-shrink-0" />
          <span className="text-xs font-medium text-[#664d03] dark:text-[#fff3cd]">
            Current model doesn't support images, switch to a Vision model to send your image/s
          </span>
        </div>
      )}
      
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${
          modelSupportsImages
            ? 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.05)]'
            : 'hover:bg-[#ffe69c] dark:hover:bg-[#7a5c04]'
        }`}
      >
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className={modelSupportsImages ? 'text-[#0078d4]' : 'text-[#664d03] dark:text-[#fff3cd]'} />
          <span className={`text-sm font-medium ${
            modelSupportsImages 
              ? 'text-[#1a1a1a] dark:text-white'
              : 'text-[#664d03] dark:text-[#fff3cd]'
          }`}>
            {images.length} {images.length === 1 ? 'Image' : 'Images'} Attached
          </span>
          <span className={`text-xs ${
            modelSupportsImages
              ? 'text-[#666] dark:text-[#a0a0a0]'
              : 'text-[#664d03] dark:text-[#fff3cd]'
          }`}>
            ~{totalTokens} tokens
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Image List */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 max-h-[300px] overflow-y-auto">
          {images.map((image) => (
            <div
              key={image.id}
              className="flex items-center gap-3 p-2 bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] rounded-lg hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.05)]">
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">
                  {image.file.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#666] dark:text-[#a0a0a0]">
                  <span>{formatFileSize(image.size)}</span>
                  <span>•</span>
                  <span>~{image.estimatedTokens} tokens</span>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemoveImage(image.id)}
                className="flex-shrink-0 p-1 text-[#666] hover:text-[#ef4444] dark:text-[#a0a0a0] dark:hover:text-[#ef4444] transition-colors rounded hover:bg-[rgba(239,68,68,0.1)]"
                title="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
