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
  const elements: React.ReactNode[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    
    // Table detection
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]+\|$/)) {
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-gray-300 text-xs">
            <thead className="bg-gray-100">
              <tr>
                {tableLines[0].split('|').filter(c => c.trim()).map((cell, idx) => (
                  <th key={idx} className="border border-gray-300 px-2 py-1 text-left font-semibold">{cell.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLines.slice(2).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {row.split('|').filter(c => c.trim()).map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-gray-300 px-2 py-1">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j;
      continue;
    }
    
    if (!trimmed) { elements.push(<div key={i} className="h-2" />); i++; continue; }
    if (trimmed.startsWith('---')) { elements.push(<hr key={i} className="my-3 border-gray-300" />); i++; continue; }
    if (trimmed.startsWith('### ')) { elements.push(<h3 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-1">{parseInline(trimmed.slice(4))}</h3>); i++; continue; }
    if (trimmed.startsWith('## ')) { elements.push(<h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>); i++; continue; }
    if (trimmed.match(/^[-*]\s/)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 relative pl-3">
          <span className="absolute left-0 top-1.5 w-1 h-1 bg-gray-400 rounded-full"></span>
          <span className="leading-relaxed">{parseInline(trimmed.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      i++;
      continue;
    }
    if (trimmed.match(/^\d+\.\s/)) {
      const match = trimmed.match(/^(\d+)\.\s/);
      const num = match ? match[1] : '1';
      elements.push(
        <div key={i} className="flex gap-2 ml-1">
          <span className="font-mono text-xs text-gray-500 mt-0.5 min-w-[1.2em]">{num}.</span>
          <span className="leading-relaxed">{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      i++;
      continue;
    }
    elements.push(<div key={i} className="leading-relaxed">{parseInline(lines[i])}</div>);
    i++;
  }
  
  return <div className="space-y-1.5 text-gray-700">{elements}</div>;
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
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const popupHeight = Math.min(vh * 0.7, 500);
      const popupWidth = 450;
      
      let top = rect.bottom + 8;
      let left = rect.left - 20;
      
      if (top + popupHeight > vh - 20) {
        top = Math.max(20, rect.top - popupHeight - 8);
      }
      if (left + popupWidth > vw - 20) {
        left = vw - popupWidth - 20;
      }
      left = Math.max(20, left);
      top = Math.max(20, top);
      
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

const CitationPortal: React.FC<CitationPortalProps> = ({ onClose, coords, fileName, location, quote, files, triggerRef, onOpenFull }) => {
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
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);



  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return createPortal(
    <div 
      ref={popoverRef}
      className="fixed z-[9999] w-[450px] max-w-[90vw] bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in duration-150"
      style={{ top: coords.top, left: coords.left, maxHeight: 'min(70vh, 500px)' }}
    >
      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <BookOpen size={12} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-xs text-gray-800 truncate" title={fileName}>{fileName}</span>
          <span className="text-[9px] text-gray-400">• {location}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onOpenFull} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" title="Open Full"><Maximize2 size={12} /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100"><X size={12} /></button>
        </div>
      </div>
      <div className="bg-slate-100 overflow-hidden relative flex-1">
        {isPdfMode && file?.fileHandle ? <PdfPagePreview file={file.fileHandle} pageNumber={pdfPageNumber} quote={quote} /> : <TextContextViewer file={file} quote={quote} location={location} />}
      </div>
      <div className="bg-white px-2 py-1.5 border-t border-gray-200 flex-shrink-0">
        <p className="text-[10px] text-gray-600 italic line-clamp-2">"{quote}"</p>
      </div>
    </div>,
    document.body
  );
};

const PdfPagePreview: React.FC<{ file: File; pageNumber: number; quote?: string }> = ({ file, pageNumber, quote }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        const renderPage = async () => {
            try {
                console.log(`[CitationPreview] Rendering Page ${pageNumber}`);
                setLoading(true);
                const arrayBuffer = await file.arrayBuffer();
                if(window.pdfWorkerReady) await window.pdfWorkerReady;
                if(!window.pdfjsLib) { console.warn("[CitationPreview] PDF Lib missing"); return; }

                const pdf = await window.pdfjsLib.getDocument({ 
                    data: new Uint8Array(arrayBuffer),
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                }).promise;
                
                const page = await pdf.getPage(pageNumber);

                if(renderTaskRef.current) try { await renderTaskRef.current.cancel(); } catch(e) {}

                const viewportUnscaled = page.getViewport({ scale: 1.0 });
                const baseScale = 420 / viewportUnscaled.width;
                const viewport = page.getViewport({ scale: baseScale * 5 });

                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const renderTask = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                if (quote) {
                    const textContent = await page.getTextContent();
                    renderHighlights(textContent, viewport, quote);
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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const renderHighlights = (textContent: any, viewport: any, quote: string) => {
        if (!highlightLayerRef.current) return;
        highlightLayerRef.current.innerHTML = '';
        
        const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
        const normQuote = normalize(quote);
        if (!normQuote || normQuote.length < 3) return;

        let fullText = "";
        const itemMap: { start: number, end: number, item: any }[] = [];
        textContent.items.forEach((item: any) => {
            const str = normalize(item.str);
            const start = fullText.length;
            fullText += str;
            itemMap.push({ start, end: fullText.length, item });
        });

        const matchIndex = fullText.indexOf(normQuote);

        if (matchIndex !== -1) {
            const matchEnd = matchIndex + normQuote.length;
            itemMap.forEach(({ start, end, item }) => {
                if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
                    if (!window.pdfjsLib.Util) return;

                    const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontHeight = Math.hypot(tx[2], tx[3]);
                    const fontWidth = item.width * viewport.scale;
                    const angle = Math.atan2(tx[1], tx[0]);
                    
                    const rect = document.createElement('div');
                    Object.assign(rect.style, {
                        position: 'absolute',
                        left: `${tx[4]}px`,
                        top: `${tx[5] - fontHeight}px`,
                        width: `${fontWidth}px`,
                        height: `${fontHeight}px`,
                        backgroundColor: 'rgba(255, 235, 59, 0.4)',
                        mixBlendMode: 'multiply',
                        pointerEvents: 'none',
                        transform: `rotate(${angle}rad)`,
                        transformOrigin: '0% 100%'
                    });
                    highlightLayerRef.current?.appendChild(rect);
                }
            });
        } else {
             console.warn("[CitationPreview] Quote not found in text content");
        }
    };

    return (
        <div 
            ref={containerRef}
            className="flex items-center justify-center min-h-full w-full bg-gray-500/10 relative overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
            {loading && <div className="absolute inset-0 flex items-center justify-center z-20"><Loader2 size={20} className="animate-spin text-gray-500" /></div>}
            <div 
                className={`relative shadow-lg bg-white ${loading ? 'opacity-0' : 'opacity-100'}`}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center center' }}
            >
                 <canvas ref={canvasRef} className="block" />
                 <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
            </div>
            {scale !== 1 && (
                <button 
                    onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
                    className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium border border-gray-200 transition-all z-30"
                >
                    Reset View
                </button>
            )}
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