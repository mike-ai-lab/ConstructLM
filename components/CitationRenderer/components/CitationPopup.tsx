import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, Maximize2 } from 'lucide-react';
import { ProcessedFile } from '../../../types';
import PdfPagePreview from './PdfPagePreview';
import TextContextViewer from './TextContextViewer';

interface CitationPopupProps {
  onClose: () => void;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  triggerRef: React.RefObject<HTMLSpanElement>;
  onOpenFull: () => void;
  isInTable: boolean;
  coords?: { top: number; left: number };
}

const CitationPopup: React.FC<CitationPopupProps> = ({ 
  onClose, 
  fileName, 
  location, 
  quote, 
  files, 
  triggerRef, 
  onOpenFull,
  isInTable,
  coords
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined>(undefined);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const foundFile = files.find(f => f.name === fileName);
    setFile(foundFile);
    if (foundFile?.type === 'pdf' && location) {
      const pageMatch = location.match(/Page\s*(\d+)/i);
      if (pageMatch) {
        setPdfPageNumber(parseInt(pageMatch[1], 10));
      } else {
        setPdfPageNumber(1);
      }
    } else {
      setPdfPageNumber(null);
    }
  }, [fileName, files, location]);

  useEffect(() => {
    if (!popoverRef.current || !triggerRef.current) return;
    
    const updatePosition = () => {
      if (!triggerRef.current || !popoverRef.current) return;
      
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 450;
      const popupHeight = Math.min(400, window.innerHeight * 0.4);
      const margin = 8;
      
      let top = triggerRect.bottom + margin;
      let left = triggerRect.left - 20;
      
      // Adjust horizontal position if overflowing right
      if (left + popupWidth > window.innerWidth - margin) {
        left = window.innerWidth - popupWidth - margin;
      }
      
      // Adjust horizontal position if overflowing left
      if (left < margin) {
        left = margin;
      }
      
      // Adjust vertical position if overflowing bottom
      if (top + popupHeight > window.innerHeight - margin) {
        // Try to position above the trigger
        const topAbove = triggerRect.top - popupHeight - margin;
        if (topAbove >= margin) {
          top = topAbove;
        } else {
          // If doesn't fit above either, position at top with max available height
          top = margin;
        }
      }
      
      setPosition({ top, left });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [triggerRef, isInTable, coords]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  const popupContent = (
    <div
      ref={popoverRef}
      className={`fixed z-[10000] w-[450px] max-w-[90vw] bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in fade-in duration-150`}
      style={{ 
        top: position?.top ?? (coords?.top ?? 0), 
        left: position?.left ?? (coords?.left ?? 0), 
        maxHeight: 'min(40vh, 400px)'
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] px-3 py-1.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <BookOpen size={12} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-xs text-[#1a1a1a] dark:text-white truncate" title={fileName}>{fileName}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">• {location}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onOpenFull} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Open Full"><Maximize2 size={12} /></button>
          <button onClick={onClose} className="text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white p-1 rounded hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"><X size={12} /></button>
        </div>
      </div>
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] relative flex-1 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
        {isPdfMode && file?.fileHandle ? (
          <PdfPagePreview file={file.fileHandle} pageNumber={pdfPageNumber as number} quote={quote} onScaleChange={setPdfScale} zoomHandlerRef={pdfZoomHandlerRef} />
        ) : (
          <TextContextViewer file={file} quote={quote} location={location} />
        )}
      </div>
      <div className="bg-white dark:bg-[#2a2a2a] px-2 py-1.5 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex-shrink-0 flex items-center justify-between">
        <p className="text-[12px] text-[#666666] dark:text-[#a0a0a0] italic line-clamp-2 flex-1">"{quote}"</p>
        {isPdfMode && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom In">+</button>
            <span className="text-[12px] px-1 text-[#666666] dark:text-[#a0a0a0]">{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom Out">−</button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded text-[12px]" title="Reset">⟲</button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
};

export default CitationPopup;
