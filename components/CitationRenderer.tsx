import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Quote, X, Maximize2, Loader2 } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const SPLIT_REGEX = /(\{\{citation:.*?\|.*?\|.*?\}\})/g;
const MATCH_REGEX = /\{\{citation:(.*?)\|(.*?)\|(.*?)\}\}/;

// --- MARKDOWN PARSER ---
const parseInline = (text: string): React.ReactNode[] => {
  // 1. Split by Bold (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    
    // 2. Split by Italic (*text* or _text_) - simplistic check
    // We strictly check for *text* where text doesn't start with space to avoid confusing with lists if inline
    const italicParts = part.split(/(\*[^\s].*?\*)/g);
    return italicParts.map((sub, subIdx) => {
       if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
           return <em key={`${index}-${subIdx}`} className="text-gray-800">{sub.slice(1, -1)}</em>;
       }
       return sub;
    });
  }).flat();
};

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-1.5 text-gray-700">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />; // Paragraph break

        // Headers
        if (trimmed.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-1">{parseInline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>;
        
        // Lists (Unordered)
        if (trimmed.match(/^[-*]\s/)) {
            return (
                <div key={i} className="flex gap-2 ml-1 relative pl-3">
                    <span className="absolute left-0 top-1.5 w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span className="leading-relaxed">{parseInline(trimmed.replace(/^[-*]\s/, ''))}</span>
                </div>
            );
        }
        
        // Lists (Ordered)
        if (trimmed.match(/^\d+\.\s/)) {
            const match = trimmed.match(/^(\d+)\.\s/);
            const num = match ? match[1] : '1';
            return (
                <div key={i} className="flex gap-2 ml-1">
                    <span className="font-mono text-xs text-gray-500 mt-0.5 min-w-[1.2em]">{num}.</span>
                    <span className="leading-relaxed">{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
        }

        // Standard Paragraph
        return <div key={i} className="leading-relaxed">{parseInline(line)}</div>;
      })}
    </div>
  );
};
// -----------------------

const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument }) => {
  if (!text) return null;
  
  // We need to preserve the order of text blocks and citations
  // Split the entire text by the citation regex
  const rawParts = text.split(SPLIT_REGEX);
  
  // We will build a list of React Nodes
  // Consecutive text parts should be joined to form proper markdown blocks, 
  // but citations break the flow. However, typically citations are inline.
  // The SimpleMarkdown parses blocks.
  
  // Strategy:
  // 1. Identify parts: TEXT | CITATION | TEXT | CITATION
  // 2. Render TEXT via Markdown. 
  //    Issue: Markdown usually expects block integrity. If a bold starts in part 1 and ends in part 3, splitting breaks it.
  //    Assumption: The LLM generates citations mostly at ends of sentences or clauses, not inside bold tags.
  
  return (
    <div className="text-sm">
      {rawParts.map((part, index) => {
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
        } else {
            // It's text. Only render if not empty.
            if (!part) return null;
            // Use span for inline flow if it's short/inline, but our Markdown parser is block based.
            // For true inline mixing, we'd need a more complex AST.
            // For now, let's treat chunks as markdown blocks.
            return <div key={index} className="inline"><SimpleMarkdown text={part} /></div>;
        }
      })}
    </div>
  );
};

interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
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
      const POPOVER_EST_HEIGHT = 400; 
      
      let top = rect.bottom + 8;
      if (top + POPOVER_EST_HEIGHT > viewportHeight) {
          top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - 8);
      }

      setCoords({
        top: top,
        left: Math.max(16, rect.left - 20) 
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
            C{index + 1}
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
              onViewDocument(fileName, page, quote, location);
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

                const pdf = await window.pdfjsLib.getDocument({ 
                    data: new Uint8Array(arrayBuffer),
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                }).promise;
                
                const page = await pdf.getPage(pageNumber);

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
                 <div className="mb-2 text-[10px] text-blue-600 font-bold uppercase tracking-wider">{location || "Excerpt"}</div>
                <span className="bg-yellow-100 text-gray-800 p-1 rounded italic">"{quote}"</span>
            </div>
        </div>
    );
};

export default CitationRenderer;