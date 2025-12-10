
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Quote, X, Maximize2, Loader2, ZoomIn, ZoomOut, RotateCcw, Move, FileSpreadsheet } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const SPLIT_REGEX = /(\{\{citation:.*?\|.*?\|.*?\}\})/g;
const MATCH_REGEX = /\{\{citation:(.*?)\|(.*?)\|(.*?)\}\}/;

// --- Shared Matching Logic ---
const findBestRangeInNormalizedText = (fullText: string, quote: string) => {
    const normalize = (s: string) => s.replace(/[\s\r\n]+/g, '').toLowerCase();
    const normQuote = normalize(quote);
    const normFull = normalize(fullText);
    
    if (normQuote.length < 5) return null;

    const exactIdx = normFull.indexOf(normQuote);
    if (exactIdx !== -1) return { start: exactIdx, end: exactIdx + normQuote.length };

    const CHUNK_LEN = Math.min(40, Math.floor(normQuote.length / 3));
    const head = normQuote.substring(0, CHUNK_LEN);
    const headIdx = normFull.indexOf(head);
    if (headIdx !== -1) {
        const searchLimit = headIdx + normQuote.length * 1.5; 
        const tail = normQuote.substring(normQuote.length - CHUNK_LEN);
        const tailIdx = normFull.indexOf(tail, headIdx + CHUNK_LEN);
        
        if (tailIdx !== -1 && tailIdx < searchLimit) {
             return { start: headIdx, end: tailIdx + CHUNK_LEN };
        }
        return { start: headIdx, end: headIdx + CHUNK_LEN };
    }

    const midStart = Math.floor(normQuote.length / 2) - Math.floor(CHUNK_LEN / 2);
    const mid = normQuote.substring(midStart, midStart + CHUNK_LEN);
    const midIdx = normFull.indexOf(mid);
    if (midIdx !== -1) return { start: midIdx, end: midIdx + CHUNK_LEN };

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
      const POPOVER_EST_HEIGHT = 500; 
      let top = rect.bottom + 8;
      // Flip up if near bottom
      if (top + POPOVER_EST_HEIGHT > viewportHeight) {
          top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - 8);
      }
      setCoords({ top, left: Math.max(16, Math.min(rect.left - 20, window.innerWidth - 480)) });
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
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);

  useEffect(() => {
    const foundFile = files.find(f => f.name === fileName);
    setFile(foundFile);
    if (foundFile?.type === 'pdf' && location) {
        const pageMatch = location.match(/(?:Page|p\.?)\s*[:#.]?\s*(\d+)/i);
        if (pageMatch) {
            setPdfPageNumber(parseInt(pageMatch[1], 10));
        }
    }
  }, [fileName, files, location]);

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
    const handleWheel = (e: WheelEvent) => {
        if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
             // Let the specific PdfPagePreview handle prevention if needed
        }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return createPortal(
    <div 
      ref={popoverRef}
      // CRITICAL Z-INDEX FIX: z-[100000] ensures it is above everything, including other portals or fixed headers
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
            <div className="overflow-y-auto h-full custom-scrollbar">
                <TextContextViewer file={file} quote={quote} location={location} />
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

// --- ROBUST PDF PAN & ZOOM COMPONENT ---

const PdfPagePreview: React.FC<{ file: File; pageNumber: number; quote?: string }> = ({ file, pageNumber, quote }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<any>(null);

    // Zoom & Pan State
    const [scale, setScale] = useState(0.5); 
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [baseDimensions, setBaseDimensions] = useState({ w: 0, h: 0 });

    const RENDER_SCALE = 2.0; // Render at high res (2x) for clarity when zoomed

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

                // Get viewport at high resolution (2.0x)
                const viewport = page.getViewport({ scale: RENDER_SCALE });
                setBaseDimensions({ w: viewport.width, h: viewport.height });

                // Initial Fit logic
                const containerW = containerRef.current?.clientWidth || 500;
                let currentScale = scale;

                if (scale === 0.5 && position.x === 0) {
                     const initialScale = (containerW - 40) / viewport.width; 
                     currentScale = initialScale;
                     setScale(initialScale);
                     setPosition({ x: 20, y: 20 });
                }

                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const renderTask = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                if (quote) {
                    const textContent = await page.getTextContent();
                    const bounds = renderHighlights(textContent, viewport, quote);
                    if (bounds) {
                        const containerH = containerRef.current?.clientHeight || 400;
                        const centerX = (bounds.minX + bounds.maxX) / 2;
                        const centerY = (bounds.minY + bounds.maxY) / 2;
                        const newX = (containerW / 2) - (centerX * currentScale);
                        const newY = (containerH / 2) - (centerY * currentScale);
                        setPosition({ x: newX, y: newY });
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
        
        const normalize = (str: string) => str.replace(/[\s\r\n]+/g, '').toLowerCase();

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
                if (Math.max(start, match.start) < Math.min(end, match.end)) {
                    if (!window.pdfjsLib.Util) return;

                    const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontHeight = Math.hypot(tx[2], tx[3]);
                    const fontWidth = item.width * viewport.scale; // Visual width (scaled by RENDER_SCALE already)
                    const angle = Math.atan2(tx[1], tx[0]);
                    
                    const rect = document.createElement('div');
                    Object.assign(rect.style, {
                        position: 'absolute',
                        left: `${tx[4]}px`,
                        top: `${tx[5] - fontHeight}px`,
                        width: `${Math.abs(fontWidth)}px`,
                        height: `${fontHeight}px`,
                        backgroundColor: 'rgba(255, 235, 59, 0.4)',
                        mixBlendMode: 'multiply',
                        pointerEvents: 'none',
                        transform: `rotate(${angle}rad)`,
                        transformOrigin: '0% 100%'
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
         const containerW = containerRef.current?.clientWidth || 500;
         const initialScale = baseDimensions.w > 0 ? (containerW - 40) / baseDimensions.w : 0.5;
         setScale(initialScale);
         setPosition({ x: 20, y: 20 });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-500/10 relative overflow-hidden">
             {/* Toolbar Overlay */}
             <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-md border border-gray-200 rounded-lg p-1.5">
                 <button onClick={() => setScale(s => Math.min(s * 1.2, 4))} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Zoom In"><ZoomIn size={16} /></button>
                 <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Zoom Out"><ZoomOut size={16} /></button>
                 <button onClick={resetView} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Reset View"><RotateCcw size={16} /></button>
             </div>
             
             {/* Hint Overlay */}
             <div className="absolute top-4 left-4 z-30 pointer-events-none opacity-50 text-[10px] bg-black/50 text-white px-2 py-1 rounded-full flex items-center gap-1">
                 <Move size={10} /> Scroll to Zoom • Drag to Pan
             </div>

            {loading && <div className="absolute inset-0 flex items-center justify-center z-20"><Loader2 size={24} className="animate-spin text-gray-500" /></div>}
            
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
                    className={`origin-top-left transition-transform duration-75 ease-out ${loading ? 'opacity-0' : 'opacity-100'}`}
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: baseDimensions.w,
                        height: baseDimensions.h,
                        willChange: 'transform'
                    }}
                >
                     <div className="relative shadow-xl bg-white">
                        <canvas ref={canvasRef} className="block" />
                        <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
                     </div>
                </div>
            </div>
        </div>
    );
};

const TextContextViewer: React.FC<{ file?: ProcessedFile; quote: string; location: string }> = ({ file, quote, location }) => {
    // --- EXCEL PARSING & HIGHLIGHTING (Synced with DocumentViewer) ---
    const parseExcelContent = (content: string, highlightLoc?: string) => {
        const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
        const parts = content.split(sheetRegex);
        const elements: React.ReactNode[] = [];
        
        let targetSheet = "";
        let targetRow = -1;

        if (highlightLoc) {
            const sheetMatch = highlightLoc.match(/Sheet:\s*['"]?([^,'";|]+)['"]?/i);
            if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();

            const rowMatch = highlightLoc.match(/(?:Row|Line|Ln)\s*[:#.]?\s*(\d+)/i);
            if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
        }

        if (parts[0].trim()) {
            elements.push(
                <div key="meta" className="mb-4 p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-500 font-mono">
                    {parts[0].trim()}
                </div>
            );
        }

        for (let i = 1; i < parts.length; i += 2) {
            const sheetName = parts[i];
            const csvContent = parts[i + 1] || "";
            
            const rows = csvContent.trim().split('\n').map(row => {
                const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (!matches && row.length > 0) return [row]; 
                if (!matches) return [];
                return matches.map(cell => cell.replace(/^"|"$/g, '').trim()); 
            });

            const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);

            elements.push(
                <div key={i} className="mb-6">
                    <h4 className={`text-xs font-bold mb-2 flex items-center gap-2 ${isTargetSheet ? 'text-blue-700' : 'text-gray-700'}`}>
                        <FileSpreadsheet size={12} className={isTargetSheet ? "text-blue-600" : "text-emerald-600"}/> 
                        {sheetName}
                    </h4>
                    <div className={`overflow-x-auto border rounded-lg ${isTargetSheet ? 'border-blue-200' : 'border-gray-200'}`}>
                        <table className="min-w-full divide-y divide-gray-200 text-[10px]">
                            <tbody className="bg-white divide-y divide-gray-100">
                                {rows.map((row, rIdx) => {
                                    const visualRowNumber = rIdx + 1;
                                    const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);

                                    return (
                                        <tr 
                                            key={rIdx} 
                                            id={isHighlightRow ? "citation-excel-row" : undefined}
                                            className={`
                                                ${rIdx === 0 ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}
                                                ${isHighlightRow ? "bg-amber-100 ring-2 ring-inset ring-amber-400 z-10 relative scroll-mt-24" : ""}
                                            `}
                                        >
                                            <td className={`px-2 py-1 w-6 select-none text-right border-r border-gray-100 bg-gray-50/50 ${isHighlightRow ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                                                {visualRowNumber}
                                            </td>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-2 py-1 whitespace-nowrap border-r border-gray-100 last:border-none max-w-[200px] truncate" title={cell}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        return elements;
    };

    // Auto-scroll effect for Excel in Citation Popup
    useEffect(() => {
        if (file?.type === 'excel') {
            const el = document.getElementById('citation-excel-row');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [file, location]);

    if (file?.type === 'excel') {
        return (
            <div className="p-6">
                {parseExcelContent(file.content, location)}
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
                <span className="bg-yellow-100 text-gray-900 px-1 py-0.5 rounded box-decoration-clone">
                    "{quote}"
                </span>
            </div>
        </div>
    );
};

export default CitationRenderer;
