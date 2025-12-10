import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Quote, X, Maximize2, Loader2, ZoomIn, ZoomOut, RotateCcw, Move, FileSpreadsheet } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

// Updated Regex to support newlines and be more robust
const SPLIT_REGEX = /(\{\{citation:[\s\S]*?\}\})/g;
const MATCH_REGEX = /\{\{citation:([\s\S]*?)\|([\s\S]*?)\|([\s\S]*?)\}\}/;

// --- ROBUST MATCHING UTILS ---
const normalize = (str: string) => str.replace(/[\s\r\n\W]+/g, '').toLowerCase();

const findBestRangeInNormalizedText = (fullText: string, quote: string) => {
    if (!quote || quote.length < 3) return null;
    const normQuote = normalize(quote);
    const normFull = normalize(fullText);
    
    if (normQuote.length === 0) return null;

    // 1. Exact Match
    const exactIdx = normFull.indexOf(normQuote);
    if (exactIdx !== -1) return { start: exactIdx, end: exactIdx + normQuote.length };

    // 2. Split Match (Head & Tail) - Handles ellipsis or slight middle hallucinations
    const CHUNK_LEN = Math.min(30, Math.floor(normQuote.length / 3));
    if (CHUNK_LEN > 5) {
        const head = normQuote.substring(0, CHUNK_LEN);
        const tail = normQuote.substring(normQuote.length - CHUNK_LEN);
        
        const headIdx = normFull.indexOf(head);
        if (headIdx !== -1) {
             // Look for tail after head
             const searchStart = headIdx + CHUNK_LEN;
             // Limit search distance (e.g. quote length * 2)
             const searchLimit = Math.min(normFull.length, searchStart + normQuote.length * 2); 
             const tailIdx = normFull.indexOf(tail, searchStart);
             
             if (tailIdx !== -1 && tailIdx < searchLimit) {
                 return { start: headIdx, end: tailIdx + CHUNK_LEN };
             }
             // Fallback to just head if tail not found close by
             return { start: headIdx, end: headIdx + CHUNK_LEN };
        }
    }
    
    // 3. Middle Match fallback
    const midStart = Math.floor(normQuote.length / 2) - Math.floor(CHUNK_LEN / 2);
    const mid = normQuote.substring(midStart, midStart + CHUNK_LEN);
    if (mid.length > 5) {
        const midIdx = normFull.indexOf(mid);
        if (midIdx !== -1) return { start: midIdx, end: midIdx + CHUNK_LEN };
    }

    return null;
};

// --- MARKDOWN PARSER ---
const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
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
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-1">{parseInline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>;
        if (trimmed.match(/^[-*]\s/)) {
            return (
                <div key={i} className="flex gap-2 ml-1 relative pl-3">
                    <span className="absolute left-0 top-1.5 w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span className="leading-relaxed">{parseInline(trimmed.replace(/^[-*]\s/, ''))}</span>
                </div>
            );
        }
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
        return <div key={i} className="leading-relaxed">{parseInline(line)}</div>;
      })}
    </div>
  );
};

const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument }) => {
  if (!text) return null;
  const rawParts = text.split(SPLIT_REGEX);
  
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
            if (!part) return null;
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
      const POPOVER_EST_HEIGHT = 450; 
      let top = rect.bottom + 8;
      // Flip up if near bottom
      if (top + POPOVER_EST_HEIGHT > viewportHeight) {
          top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - 8);
      }
      // Ensure left doesn't overflow right
      const left = Math.max(16, Math.min(rect.left - 20, window.innerWidth - 520));
      setCoords({ top, left });
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
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isOpen ? 'bg-blue-200' : 'bg-blue-200'}`}>C{index + 1}</span>
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
                const pageMatch = location.match(/(?:Page|p\.?)\s*[:#.]?\s*(\d+)/i);
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

const CitationPortal: React.FC<CitationPortalProps> = ({ onClose, coords, fileName, location, quote, files, triggerRef, onOpenFull }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const file = useMemo(() => files.find(f => f.name === fileName), [files, fileName]);
  
  const pdfPageNumber = useMemo(() => {
      if (file?.type === 'pdf' && location) {
          const pageMatch = location.match(/(?:Page|p\.?)\s*[:#.]?\s*(\d+)/i);
          if (pageMatch) return parseInt(pageMatch[1], 10);
      }
      return null;
  }, [file, location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    // Trap wheel events to prevent body scrolling
    const handleWheel = (e: WheelEvent) => {
        if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
             // Let it propagate within
        }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return createPortal(
    <div 
      ref={popoverRef}
      className="fixed z-[100000] w-[500px] max-w-[90vw] bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150"
      style={{ top: coords.top, left: coords.left, height: '450px' }}
    >
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0 z-20 relative">
        <div className="flex items-center gap-2 overflow-hidden">
          <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-gray-800 truncate max-w-[200px]" title={fileName}>{fileName}</span>
              <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                 {isPdfMode ? 'PDF Preview' : 'Extracted Text'} <ChevronRight size={10} /> {location}
              </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={onOpenFull} className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-1 text-xs font-medium" title="Open Full Document"><Maximize2 size={14} /><span className="hidden sm:inline">Open</span></button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors"><X size={16} /></button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="bg-slate-100 relative flex-1 overflow-hidden w-full h-full">
        {isPdfMode && file?.fileHandle ? (
            <PdfPagePreview file={file.fileHandle} pageNumber={pdfPageNumber} quote={quote} />
        ) : (
            <div className="overflow-y-auto h-full custom-scrollbar relative">
                 {file ? (
                     <TextContextViewer file={file} quote={quote} location={location} />
                 ) : (
                    <div className="p-8 text-center text-gray-400">File not found</div>
                 )}
            </div>
        )}
      </div>

      {/* Footer Quote */}
      <div className="bg-white px-4 py-3 border-t border-gray-200 text-xs text-gray-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 relative">
        <div className="flex gap-2">
            <Quote size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="italic leading-relaxed line-clamp-2">"{quote}"</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- ROBUST PDF COMPONENT ---
const PdfPagePreview: React.FC<{ file: File; pageNumber: number; quote?: string }> = ({ file, pageNumber, quote }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<any>(null);

    // Zoom & Pan State
    const [scale, setScale] = useState(0.6); 
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // Internal viewport reference to transform coords later
    const viewportRef = useRef<any>(null);

    const RENDER_QUALITY = 1.5; 

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

                if(renderTaskRef.current) try { await renderTaskRef.current.cancel(); } catch(e) {}

                // Render at a fixed high quality for the canvas texture
                const viewport = page.getViewport({ scale: RENDER_QUALITY });
                viewportRef.current = viewport;

                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                // We control visual size via CSS transform scale on parent, so canvas is native res

                const renderTask = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                if (quote) {
                    const textContent = await page.getTextContent();
                    const bounds = renderHighlights(textContent, viewport, quote);
                    
                    // Auto-Center logic
                    if (bounds && containerRef.current) {
                        const containerW = containerRef.current.clientWidth;
                        const containerH = containerRef.current.clientHeight;

                        // Calculate visual center of the highlight relative to unscaled viewport
                        const highlightCenterX = (bounds.minX + bounds.maxX) / 2;
                        const highlightCenterY = (bounds.minY + bounds.maxY) / 2;
                        
                        // We want: position.x + (highlightCenterX * scale) = containerW / 2
                        // But remember the transform origin is top-left
                        
                        // Let's reset scale to see the whole width usually
                        const fitScale = Math.min((containerW - 40) / viewport.width, 0.8);
                        
                        // Or if we want to zoom into text? Let's use fitScale mostly for previews
                        setScale(fitScale);
                        
                        // Center the highlight
                        const newX = (containerW / 2) - (highlightCenterX * fitScale);
                        const newY = (containerH / 2) - (highlightCenterY * fitScale);
                        
                        setPosition({ x: newX, y: newY });
                    } else {
                         // Default fit width
                         const fitScale = (containerRef.current.clientWidth - 40) / viewport.width;
                         setScale(Math.min(fitScale, 0.6));
                         setPosition({ x: 20, y: 20 });
                    }
                }

            } catch (err: any) {
                if(err?.name !== 'RenderingCancelledException') console.error("[CitationPreview] Error:", err);
            } finally {
                setLoading(false);
            }
        };
        renderPage();
        return () => { if(renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [file, pageNumber, quote]);

    const renderHighlights = (textContent: any, viewport: any, quote: string): { minX: number, minY: number, maxX: number, maxY: number } | null => {
        if (!highlightLayerRef.current) return null;
        highlightLayerRef.current.innerHTML = '';
        
        let fullText = "";
        const itemMap: { start: number, end: number, item: any }[] = [];
        
        textContent.items.forEach((item: any) => {
            const str = normalize(item.str);
            const start = fullText.length;
            fullText += str;
            itemMap.push({ start, end: fullText.length, item });
        });

        const match = findBestRangeInNormalizedText(fullText, quote);

        if (match) {
            let found = false;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            itemMap.forEach(({ start, end, item }) => {
                // Check intersection
                if (Math.max(start, match.start) < Math.min(end, match.end)) {
                    if (!window.pdfjsLib.Util) return;

                    const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontHeight = Math.hypot(tx[2], tx[3]);
                    const fontWidth = item.width * viewport.scale; // Width in canvas pixels
                    const angle = Math.atan2(tx[1], tx[0]);
                    
                    const rect = document.createElement('div');
                    Object.assign(rect.style, {
                        position: 'absolute',
                        left: `${tx[4]}px`,
                        top: `${tx[5] - fontHeight}px`,
                        width: `${Math.abs(fontWidth)}px`,
                        height: `${fontHeight}px`,
                        backgroundColor: 'rgba(255, 235, 59, 0.5)',
                        mixBlendMode: 'multiply',
                        pointerEvents: 'none',
                        transform: `rotate(${angle}rad)`,
                        transformOrigin: '0% 100%',
                        borderBottom: '2px solid rgba(245, 127, 23, 0.8)'
                    });
                    highlightLayerRef.current?.appendChild(rect);

                    minX = Math.min(minX, tx[4]);
                    minY = Math.min(minY, tx[5] - fontHeight);
                    maxX = Math.max(maxX, tx[4] + Math.abs(fontWidth));
                    maxY = Math.max(maxY, tx[5]);
                    found = true;
                }
            });
            if(found) return { minX, minY, maxX, maxY };
        }
        return null;
    };

    // --- PAN & ZOOM HANDLERS ---
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, scale + delta), 4);

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Zoom towards pointer
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / scale;
        const newX = mouseX - (mouseX - position.x) * scaleRatio;
        const newY = mouseY - (mouseY - position.y) * scaleRatio;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
    }, [scale, position]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        containerRef.current?.style.setProperty('cursor', 'grabbing');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        containerRef.current?.style.setProperty('cursor', 'grab');
    };

    const resetView = () => {
         if (!viewportRef.current || !containerRef.current) return;
         const containerW = containerRef.current.clientWidth;
         const initialScale = (containerW - 40) / viewportRef.current.width;
         setScale(initialScale);
         setPosition({ x: 20, y: 20 });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-500/10 relative overflow-hidden select-none">
             {/* Toolbar Overlay */}
             <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-md border border-gray-200 rounded-lg p-1.5">
                 <button onClick={() => setScale(s => Math.min(s * 1.2, 4))} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Zoom In"><ZoomIn size={16} /></button>
                 <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Zoom Out"><ZoomOut size={16} /></button>
                 <button onClick={resetView} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Reset View"><RotateCcw size={16} /></button>
             </div>
             
            {loading && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><Loader2 size={24} className="animate-spin text-gray-500" /></div>}
            
            {/* Viewport Container */}
            <div 
                ref={containerRef}
                className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing touch-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div 
                    className={`origin-top-left transition-transform duration-75 ease-out`}
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        willChange: 'transform'
                    }}
                >
                     <div className="relative shadow-xl bg-white inline-block">
                        <canvas ref={canvasRef} className="block" />
                        <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
                     </div>
                </div>
            </div>
        </div>
    );
};

const TextContextViewer: React.FC<{ file?: ProcessedFile; quote: string; location: string }> = ({ file, quote, location }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollAttempts = useRef(0);

    const scrollToHighlight = useCallback(() => {
        if (!containerRef.current) return;
        
        // Find by attribute
        const el = containerRef.current.querySelector('#scroll-target-primary') || containerRef.current.querySelector('[data-highlighted="true"]');
        
        if (el) {
            // Using inline: 'nearest' to prevent unwanted horizontal centering of the Excel view
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            scrollAttempts.current = 0; // Reset
        } else if (scrollAttempts.current < 10) {
            // DOM might not be ready (especially for large Excel tables)
            scrollAttempts.current++;
            requestAnimationFrame(scrollToHighlight);
        }
    }, []);

    // Trigger scroll when file/location changes
    useEffect(() => {
        scrollAttempts.current = 0;
        // Small delay to allow react render cycle to flush
        const t = setTimeout(() => scrollToHighlight(), 150);
        return () => clearTimeout(t);
    }, [file, location, quote, scrollToHighlight]);

    const parseCSVLine = (text: string) => {
        const result: string[] = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                result.push(text.substring(start, i));
                start = i + 1;
            }
        }
        result.push(text.substring(start));
        
        return result.map(s => {
            let cell = s.trim();
            if (cell.startsWith('"') && cell.endsWith('"') && cell.length >= 2) {
                cell = cell.substring(1, cell.length - 1);
            }
            return cell.replace(/""/g, '"');
        });
    };

    const parseExcelContent = (content: string, highlightLoc?: string, quote?: string) => {
        const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
        const parts = content.split(sheetRegex);
        const elements: React.ReactNode[] = [];
        
        // 1. Parsing Citation Targets
        let targetSheetName = "";
        let targetRowStart = -1;
        let targetRowEnd = -1;
        let targetColIndices: Set<number> = new Set();
        let hasColumnTarget = false;

        if (highlightLoc) {
            const lowerLoc = highlightLoc.toLowerCase();
            const sheetMatch = lowerLoc.match(/sheet\s*[:#.]?\s*['"]?([^,'";|]+)['"]?/i);
            if (sheetMatch) targetSheetName = sheetMatch[1].trim();

            const rowMatch = lowerLoc.match(/(?:rows?|lines?|lns?|r)\s*[:#.]?\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
            if (rowMatch) {
                targetRowStart = parseInt(rowMatch[1], 10);
                targetRowEnd = rowMatch[2] ? parseInt(rowMatch[2], 10) : targetRowStart;
            }
            
            const colSectionMatch = lowerLoc.match(/(?:cols?|columns?|c)\s*[:#.]?\s*([^;\n|]+)/i);
            if (colSectionMatch) {
                const rawCols = colSectionMatch[1];
                const colClean = rawCols.split(/(?:,?\s*(?:rows?|lines?))/i)[0];
                const colParts = colClean.split(',').map(s => s.trim());
                colParts.forEach(p => {
                    const cleanP = p.replace(/^['"]|['"]$/g, '');
                    if (/^\d+$/.test(cleanP)) {
                         targetColIndices.add(parseInt(cleanP, 10) - 1);
                         hasColumnTarget = true;
                    } else if (/^[A-Za-z]+$/.test(cleanP) && cleanP.length < 4) {
                         let idx = 0;
                         const upper = cleanP.toUpperCase();
                         for (let k = 0; k < upper.length; k++) idx = idx * 26 + (upper.charCodeAt(k) - 64);
                         targetColIndices.add(idx - 1);
                         hasColumnTarget = true;
                    } else {
                         hasColumnTarget = true;
                    }
                });
            }
        }

        // 2. Token Matching Helper
        const quoteTokens = quote ? quote.toLowerCase().split(/[\W_]+/).filter(t => t.length > 2) : [];
        const isTokenMatch = (rowCells: string[]) => {
            if (quoteTokens.length === 0) return false;
            const rowStr = rowCells.join(" ").toLowerCase();
            const hits = quoteTokens.filter(t => rowStr.includes(t)).length;
            return hits / quoteTokens.length > 0.7;
        };

        const normQuote = quote ? normalize(quote) : "";
        
        if (parts[0].trim()) {
            elements.push(
                <div key="meta" className="mb-4 p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-500 font-mono">
                    {parts[0].trim()}
                </div>
            );
        }

        let hasFoundScrollTarget = false;

        for (let i = 1; i < parts.length; i += 2) {
            const sheetName = parts[i];
            const csvContent = parts[i + 1] || "";
            
            let lines = csvContent.split('\n');
            if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

            const rows = lines.map(row => parseCSVLine(row));
            const headers = rows[0] || [];

            const sheetTargetCols = new Set(targetColIndices);
            if (hasColumnTarget) {
                 const lowerLoc = highlightLoc?.toLowerCase() || "";
                 const colSectionMatch = lowerLoc.match(/(?:cols?|columns?|c)\s*[:#.]?\s*([^;\n|]+)/i);
                 if (colSectionMatch) {
                     const colParts = colSectionMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                     colParts.forEach(name => {
                         const hIdx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
                         if (hIdx !== -1) sheetTargetCols.add(hIdx);
                     });
                 }
            }
            
            if (sheetTargetCols.size === 0 && quote && targetRowStart === -1) {
                headers.forEach((h, idx) => {
                    if (normalize(h) === normQuote || (h.length > 3 && normalize(h).includes(normQuote))) {
                        sheetTargetCols.add(idx);
                        hasColumnTarget = true;
                    }
                });
            }

            const sheetNameMatch = targetSheetName 
                ? normalize(sheetName).includes(normalize(targetSheetName)) || normalize(targetSheetName).includes(normalize(sheetName))
                : true;

            if (sheetNameMatch || rows.length < 100) {
                elements.push(
                    <div key={i} className="mb-6">
                        <h4 className={`text-xs font-bold mb-2 flex items-center gap-2 ${sheetNameMatch ? 'text-blue-700' : 'text-gray-700'}`}>
                            <FileSpreadsheet size={12} className={sheetNameMatch ? "text-blue-600" : "text-emerald-600"}/> 
                            {sheetName}
                        </h4>
                        <div className={`overflow-x-auto border rounded-lg ${sheetNameMatch ? 'border-blue-200' : 'border-gray-200'}`}>
                            <table className="min-w-full divide-y divide-gray-200 text-[10px]">
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {rows.map((row, rIdx) => {
                                        const visualRowNumber = rIdx + 1;
                                        let isHighlightRow = false;

                                        if (targetRowStart !== -1 && sheetNameMatch) {
                                            if (visualRowNumber >= targetRowStart && visualRowNumber <= targetRowEnd) {
                                                isHighlightRow = true;
                                            }
                                        }

                                        if (!isHighlightRow && !hasColumnTarget && quote && targetRowStart === -1) {
                                            if (isTokenMatch(row)) {
                                                isHighlightRow = true;
                                            }
                                        }

                                        let rowId = undefined;
                                        if (isHighlightRow && !hasFoundScrollTarget) {
                                            rowId = "scroll-target-primary";
                                            hasFoundScrollTarget = true;
                                        }

                                        return (
                                            <tr 
                                                key={rIdx} 
                                                id={rowId}
                                                data-highlighted={isHighlightRow ? "true" : "false"}
                                                className={`
                                                    ${rIdx === 0 ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}
                                                    ${isHighlightRow ? "bg-amber-100 ring-2 ring-inset ring-amber-400 z-10 relative" : ""}
                                                `}
                                            >
                                                <td className={`px-2 py-1 w-6 select-none text-right border-r border-gray-100 bg-gray-50/50 ${isHighlightRow ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                                                    {visualRowNumber}
                                                </td>
                                                {row.map((cell, cIdx) => {
                                                    const isHighlightCol = sheetNameMatch && sheetTargetCols.has(cIdx);
                                                    return (
                                                        <td 
                                                            key={cIdx} 
                                                            data-highlighted={isHighlightCol && rIdx === 0 ? "true" : undefined}
                                                            className={`
                                                                px-2 py-1 whitespace-nowrap border-r border-gray-100 last:border-none max-w-[200px] truncate
                                                                ${isHighlightCol ? 'bg-blue-50/50 border-l border-r border-blue-100' : ''}
                                                                ${isHighlightCol && rIdx === 0 ? 'bg-blue-100 text-blue-800 font-bold ring-2 ring-inset ring-blue-300' : ''}
                                                            `} 
                                                            title={cell}
                                                        >
                                                            {cell}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            }
        }
        return elements;
    };

    if (file?.type === 'excel') {
        return (
            <div className="p-6" ref={containerRef}>
                {parseExcelContent(file.content, location, quote)}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <div className="text-sm leading-relaxed text-gray-700 bg-white p-6 rounded-lg border border-gray-200 font-serif shadow-sm">
                 <div className="mb-4 pb-2 border-b border-gray-100 text-xs text-blue-600 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Quote size={12} />
                    {location || "Excerpt"}
                 </div>
                <div className="bg-yellow-50 p-2 rounded text-gray-900 border-l-4 border-yellow-400 italic">
                    "{quote}"
                </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
                (Preview only. Open full document for context.)
            </p>
        </div>
    );
};

export default CitationRenderer;