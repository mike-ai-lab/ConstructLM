import React, { useState, useEffect, useRef } from 'react';
import { ProcessedFile } from '../../types';
import { scrollToElementById, HIGHLIGHT_CLASSES } from '@/utils/scrollUtils';
import { highlightService } from '@/services/highlightService';

interface TextViewerProps {
  file: ProcessedFile;
  highlightQuote?: string;
  textScale: number;
}

const TextViewer: React.FC<TextViewerProps> = ({ file, highlightQuote, textScale }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  console.log('📄 [TextViewer] Rendered with:', {
    fileName: file.name,
    fileType: file.type,
    highlightQuote,
    hasContent: !!file.content,
    contentLength: file.content?.length
  });

  // Listen for citation highlight events
  useEffect(() => {
    const handleCitationHighlight = (event: CustomEvent) => {
      const { fileName, quote } = event.detail;
      
      if (fileName === file.name && contentRef.current && quote) {
        console.log('🎯[CITE-HL] TextViewer: Citation highlight event received', { 
          fileName, 
          quote: quote?.substring(0, 50)
        });
        highlightService.applyCitationHighlight(contentRef.current, quote, 'TextViewer');
      }
    };

    window.addEventListener('citationHighlight', handleCitationHighlight as EventListener);
    
    return () => {
      window.removeEventListener('citationHighlight', handleCitationHighlight as EventListener);
    };
  }, [file.name]);

  useEffect(() => {
    if (highlightQuote) {
      console.log('📄 [TextViewer] useEffect triggered - attempting scroll for quote:', highlightQuote);
      scrollToElementById('text-highlight-match', 200);
    } else {
      console.log('📄 [TextViewer] No highlight quote provided');
    }
  }, [highlightQuote, textScale]);

  const renderContent = () => {
    if (file.type === 'image') {
      return <ImageViewer file={file} />;
    }
    
    const content = file.content;
    if (!highlightQuote) {
      // Don't use inline highlighting - Mark.js will handle it via event listener
      return (
        <pre className="font-mono text-sm text-[#1a1a1a] dark:text-white whitespace-pre-wrap leading-relaxed">
          {content}
        </pre>
      );
    }
    
    // Don't use inline highlighting - Mark.js will handle it via event listener
    return (
      <pre className="font-mono text-sm text-[#1a1a1a] dark:text-white whitespace-pre-wrap leading-relaxed">
        {content}
      </pre>
    );
  };

  return (
    <div className="overflow-auto w-full h-full">
      <div 
        ref={contentRef}
        className="bg-white dark:bg-[#2a2a2a] shadow-sm border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] w-full max-w-5xl min-h-full mx-auto my-8" 
        style={{ fontSize: `${textScale * 0.875}rem` }}
      >
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
