import React, { useState, useEffect } from 'react';
import { ProcessedFile } from '../../types';

interface TextViewerProps {
  file: ProcessedFile;
  highlightQuote?: string;
  textScale: number;
}

const TextViewer: React.FC<TextViewerProps> = ({ file, highlightQuote, textScale }) => {
  useEffect(() => {
    if (highlightQuote) {
      const tryScroll = () => {
        const textEl = document.getElementById('text-highlight-match');
        if (textEl) {
          textEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };
      if (!tryScroll()) {
        setTimeout(tryScroll, 100);
        setTimeout(tryScroll, 300);
        setTimeout(tryScroll, 600);
      }
    }
  }, [highlightQuote, textScale]);

  const renderContent = () => {
    if (file.type === 'image') {
      return <ImageViewer file={file} />;
    }
    
    const content = file.content;
    if (!highlightQuote) {
      return (
        <pre className="font-mono text-sm text-[#1a1a1a] dark:text-white whitespace-pre-wrap leading-relaxed">
          {content}
        </pre>
      );
    }
    
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = content.split(new RegExp(`(${escapeRegExp(highlightQuote)})`, 'gi'));
    
    return (
      <pre className="font-mono text-sm text-[#1a1a1a] dark:text-white whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => 
          part.toLowerCase() === highlightQuote.toLowerCase() 
            ? <mark key={i} id="text-highlight-match" className="bg-[#9ce8d6]/40 dark:bg-[#5bd8bb]/20 text-[#1a1a1a] dark:text-white rounded px-0.5 font-bold border-b-2 border-[#25b5cd]">{part}</mark>
            : part
        )}
      </pre>
    );
  };

  return (
    <div className="overflow-auto w-full h-full">
      <div className="bg-white dark:bg-[#2a2a2a] shadow-sm border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
        <div className="p-12">{renderContent()}</div>
      </div>
    </div>
  );
};

const ImageViewer: React.FC<{ file: ProcessedFile }> = ({ file }) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const imageUrl = file.fileHandle instanceof File ? URL.createObjectURL(file.fileHandle) : '';

  if (!imageUrl) {
    return <div className="text-center text-gray-500 p-8">Image not available</div>;
  }

  return (
    <>
      <div className="flex items-center justify-center p-8">
        <img
          src={imageUrl}
          alt={file.name}
          className="max-w-full h-auto rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '400px' }}
          onClick={() => setIsEnlarged(true)}
        />
      </div>
      {isEnlarged && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsEnlarged(false)}
        >
          <img
            src={imageUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default TextViewer;
