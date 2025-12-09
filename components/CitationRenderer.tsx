import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, MapPin, Quote, X, Search, FileText, ChevronRight, Loader2, Maximize2 } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string) => void;
}

const SPLIT_REGEX = /(\{\{citation:.*?\|.*?\|.*?\}\})/g;
const MATCH_REGEX = /\{\{citation:(.*?)\|(.*?)\|(.*?)\}\}/;

const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument }) => {
  if (!text) return null;
  const parts = text.split(SPLIT_REGEX);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const match = part.match(MATCH_REGEX);
        if (match) {
          const fileName = match[1].trim();
          const location = match[2].trim();
          const quote = match[3].trim();
          return (
            <CitationChip 
              key={`${index}-${fileName}`} 
              index={index} 
              fileName={fileName} 
              location={location} 
              quote={quote} 
              files={files} 
              onViewDocument={onViewDocument}
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string) => void;
}

const CitationChip: React.FC<CitationChipProps> = ({ index, fileName, location, quote, files, onViewDocument }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const POPOVER_EST_HEIGHT = 400; // Estimate height of popover
      
      // Calculate preferred top position (below the chip)
      // Since we use 'fixed' positioning in portal, we use rect.bottom directly (no scrollY)
      let top = rect.bottom + 8;
      
      // If adding height exceeds viewport, place ABOVE the chip
      if (top + POPOVER_EST_HEIGHT > viewportHeight) {
          top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - 8);
      }

      setCoords({
        top: top,
        left: Math.max(16, rect.left - 20) // Slight adjustment to align better
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <span 
        ref={triggerRef}
        onClick={handleToggle}
        className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 ml-1 align-middle text-[10px] font-bold rounded border transition-colors shadow-sm cursor-pointer select-none
          ${isOpen 
            ? 'bg-blue-100 border-blue-300 text-blue-800' 
            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
          }`}
      >
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isOpen ? 'bg-blue-200' : 'bg-blue-200'}`}>
            {index + 1}
        </span>
        <span className="max-w-[80px] truncate">{fileName}</span>
      </span>

      {isOpen && (
        <CitationPortal 
          onClose={() => setIsOpen(false)}
          coords={coords}
          fileName={fileName}
          location={location}
          quote={quote}
          files={files}
          triggerRef={triggerRef}
          onOpenFull={() => {
              let page = 1;
              if (location) {
                const pageMatch = location.match(/Page\s*(\d+)/i);
                if (pageMatch) page = parseInt(pageMatch[1], 10);
              }
              onViewDocument(fileName, page, quote);
              setIsOpen(false);
          }}
        />
      )}
    </>
  );
};

interface CitationPortalProps {
  onClose: () => void;
  coords: { top: number; left: number };
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  triggerRef: React.RefObject<HTMLSpanElement>;
  onOpenFull: () => void;
}

const CitationPortal: React.FC<CitationPortalProps> = ({ 
  onClose, coords, fileName, location, quote, files, triggerRef, onOpenFull
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);

  useEffect(() => {
    const foundFile = files.find(f => f.name === fileName);
    setFile(foundFile);
    if (foundFile?.type === 'pdf' && location) {
        const pageMatch = location.match(/Page\s*(\d+)/i);
        if (pageMatch) {
            setPdfPageNumber(parseInt(pageMatch[1], 10));
        }
    }
  }, [fileName, files, location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
            e.stopPropagation(); 
        }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return createPortal(
    <div 
      ref={popoverRef}
      className="fixed z-[9999] w-[450px] max-w-[90vw] bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150"
      style={{ 
         top: coords.top,
         left: Math.min(coords.left, window.innerWidth - 460),
         maxHeight: '80vh'
      }}
    >
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-gray-800 truncate" title={fileName}>{fileName}</span>
              <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                 {isPdfMode ? 'Preview' : 'Extracted Text'} <ChevronRight size={10} /> {location}
              </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
            <button 
              onClick={onOpenFull}
              className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Open Full Document"
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">Open</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
        </div>
      </div>

      <div className="bg-slate-100 overflow-y-auto relative min-h-[200px] flex-1">
        {isPdfMode && file?.fileHandle ? (
             <PdfPagePreview file={file.fileHandle} pageNumber={pdfPageNumber} />
        ) : (
             <TextContextViewer file={file} quote={quote} location={location} />
        )}
      </div>
      
      <div className="bg-white px-4 py-3 border-t border-gray-200 text-xs text-gray-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2">
            <Quote size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="italic leading-relaxed">"{quote}"</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Simplified Preview (Canvas Only) for the Popover
const PdfPagePreview: React.FC<{ file: File; pageNumber: number }> = ({ file, pageNumber }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        const renderPage = async () => {
            try {
                setLoading(true);
                const arrayBuffer = await file.arrayBuffer();
                if(window.pdfWorkerReady) await window.pdfWorkerReady;
                if(!window.pdfjsLib) return;

                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(pageNumber);

                // Cancel previous render if any
                if(renderTaskRef.current) {
                    try { await renderTaskRef.current.cancel(); } catch(e) {}
                }

                const viewportUnscaled = page.getViewport({ scale: 1.0 });
                const scale = 450 / viewportUnscaled.width; 
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderTask = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (err: any) {
                if(err?.name !== 'RenderingCancelledException') {
                    console.error(err);
                }
            } finally {
                setLoading(false);
            }
        };
        renderPage();
        
        return () => {
             if(renderTaskRef.current) {
                 renderTaskRef.current.cancel();
             }
        };
    }, [file, pageNumber]);

    return (
        <div className="flex flex-col items-center justify-start min-h-full w-full bg-gray-500/10 pb-4">
            {loading && <div className="p-8"><Loader2 size={20} className="animate-spin text-gray-500" /></div>}
            <canvas ref={canvasRef} className={`shadow-lg bg-white mt-4 ${loading ? 'opacity-0' : 'opacity-100'}`} style={{ maxWidth: '95%' }} />
        </div>
    );
};

const TextContextViewer: React.FC<{ file?: ProcessedFile; quote: string; location: string }> = ({ file, quote, location }) => {
    return (
        <div className="p-4 space-y-4">
            <div className="text-sm leading-relaxed text-gray-700 bg-white p-4 rounded-lg border border-gray-200 font-serif shadow-sm">
                <span className="bg-yellow-100 text-gray-800 p-1 rounded italic">"{quote}"</span>
            </div>
        </div>
    );
};

export default CitationRenderer;