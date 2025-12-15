import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Quote, X, Maximize2, Loader2 } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const SPLIT_REGEX = /((?:\{\{|【)citation:.*?\|.*?\|.*?(?:\}\}|】))/g;
const MATCH_REGEX = /(?:\{\{|【)citation:(.*?)\|(.*?)\|(.*?)(?:\}\}|】)/;

let citationCounter = 0;
const resetCitationCounter = () => { citationCounter = 0; };

// --- INLINE MARKDOWN HELPERS ---
const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-[#1a1a1a] dark:text-white">{part.slice(2, -2)}</strong>;
    }
    const italicParts = part.split(/(\*[^\s].*?\*)/g);
    return italicParts.map((sub, subIdx) => {
      if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
        return <em key={`${index}-${subIdx}`} className="text-[#1a1a1a] dark:text-white">{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  }).flat();
};

const SimpleMarkdown: React.FC<{ text: string; block?: boolean; files?: ProcessedFile[]; onViewDocument?: (fileName: string, page?: number, quote?: string, location?: string) => void }> = ({ text, block = true, files, onViewDocument }) => {
  // Normalize incoming <br> to newline
  const processedText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = processedText.split('\n');

  // Build elements; for inline mode we'll collect children into a single span and
  // use <br/> for empty lines to preserve breaks without forcing block-level wrappers.
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection (always block-level)
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]+\|$/)) {
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      const tableEl = (
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] text-xs">
            <thead className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
              <tr>
                {tableLines[0].split('|').filter(c => c.trim()).map((cell, idx) => (
                  <th key={idx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1 text-left font-semibold text-[#1a1a1a] dark:text-white">
                    {files && onViewDocument ? <TableCellWithCitations text={cell.trim()} files={files} onViewDocument={onViewDocument} /> : cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLines.slice(2).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]">
                  {row.split('|').filter(c => c.trim()).map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1">
                      {files && onViewDocument ? <TableCellWithCitations text={cell.trim()} files={files} onViewDocument={onViewDocument} /> : cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      elements.push(tableEl);
      i = j;
      continue;
    }

    if (!trimmed) {
      // blank line -> either spacer (block) or <br/> (inline)
      elements.push(block ? <div key={`blank-${i}`} className="h-2" /> : <br key={`br-${i}`} />);
      i++;
      continue;
    }

    if (trimmed.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)]" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const h3 = <h3 key={`h3-${i}`} className="text-sm font-bold text-[#1a1a1a] dark:text-white mt-3 mb-1">{parseInline(trimmed.slice(4))}</h3>;
      elements.push(h3);
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const h2 = <h2 key={`h2-${i}`} className="text-base font-bold text-[#1a1a1a] dark:text-white mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>;
      elements.push(h2);
      i++;
      continue;
    }

    if (trimmed.match(/^[-*]\s/)) {
      const li = (
        <div key={`li-${i}`} className="flex gap-2 ml-1 relative pl-3">
          <span className="absolute left-0 top-1.5 w-1 h-1 bg-[#666666] dark:bg-[#a0a0a0] rounded-full"></span>
          <span className="leading-relaxed">{parseInline(trimmed.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      elements.push(li);
      i++;
      continue;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      const match = trimmed.match(/^(\d+)\.\s/);
      const num = match ? match[1] : '1';
      elements.push(
        <div key={`ol-${i}`} className="flex gap-2 ml-1">
          <span className="font-mono text-xs text-[#666666] dark:text-[#a0a0a0] mt-0.5 min-w-[1.2em]">{num}.</span>
          <span className="leading-relaxed">{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Normal paragraph/line
    // For block mode we render a div paragraph, for inline mode we push inline content (span)
    if (block) {
      elements.push(<div key={`p-${i}`} className="leading-relaxed">{parseInline(lines[i])}</div>);
    } else {
      elements.push(<span key={`span-${i}`} className="leading-relaxed">{parseInline(lines[i])}</span>);
    }
    i++;
  }

  if (block) {
    return <div className="space-y-1.5 text-[#1a1a1a] dark:text-white">{elements}</div>;
  } else {
    // Inline: wrap all children in a single span so they flow inline
    return <span className="text-[#1a1a1a] dark:text-white">{elements}</span>;
  }
};

// --- MAIN CITATION RENDERER ---
const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument }) => {
  if (!text) return null;
  resetCitationCounter();

  // Remove newlines around citations to keep them inline
  const cleanedText = text.replace(/\n*((?:\{\{|【)citation:.*?(?:\}\}|】))\n*/g, '$1');
  const rawParts = cleanedText.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);

  return (
    <div className="text-sm leading-relaxed">
      {rawParts.map((part, index) => {
        const match = part.match(MATCH_REGEX);
        if (match) {
          citationCounter++;
          const fileName = match[1].trim();
          const location = match[2].trim();
          const quote = match[3].trim();
          return (
            <CitationChip
              key={`cit-${index}-${fileName}-${citationCounter}`}
              index={citationCounter - 1}
              fileName={fileName}
              location={location}
              quote={quote}
              files={files}
              onViewDocument={onViewDocument}
            />
          );
        } else {
          if (!part) return null;
          // Render inline so chips remain on the same line
          return (
            <span key={`txt-${index}`} className="align-baseline">
              <SimpleMarkdown text={part} block={false} files={files} onViewDocument={onViewDocument} />
            </span>
          );
        }
      })}
    </div>
  );
};

// Helper component to render table cells with citations
const TableCellWithCitations: React.FC<{ text: string; files: ProcessedFile[]; onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void }> = ({ text, files, onViewDocument }) => {
  const parts = text.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
  
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(MATCH_REGEX);
        if (match) {
          citationCounter++;
          const fileName = match[1].trim();
          const location = match[2].trim();
          const quote = match[3].trim();
          return (
            <CitationChip
              key={`cell-cit-${index}-${citationCounter}`}
              index={citationCounter - 1}
              fileName={fileName}
              location={location}
              quote={quote}
              files={files}
              onViewDocument={onViewDocument}
            />
          );
        }
        return <span key={`cell-txt-${index}`}>{part}</span>;
      })}
    </>
  );
};

// --- CITATION CHIP & PORTAL ---
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
      <sup
        ref={triggerRef}
        onClick={handleToggle}
        className={`inline-flex items-center justify-center w-5 h-5 text-[12px] font-bold rounded-full cursor-pointer transition-all mx-0.5
          ${isOpen
            ? 'bg-blue-600 dark:bg-blue-500 text-white scale-110'
            : 'bg-blue-500 dark:bg-blue-600 text-white hover:scale-110'
          }`}
        style={{ verticalAlign: 'super', lineHeight: '20px', aspectRatio: '1' }}
        title={`${fileName} - ${location}`}
        aria-expanded={isOpen}
        role="button"
      >
        {index + 1}
      </sup>
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
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{ handleZoom: (delta: number) => void; handleReset: () => void }>();

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
      className="fixed z-[9999] w-[450px] max-w-[90vw] bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in fade-in duration-150"
      style={{ top: coords.top, left: coords.left, maxHeight: 'min(70vh, 500px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
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
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] overflow-hidden relative flex-1">
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
    </div>,
    document.body
  );
};

// --- PDF PREVIEW (unchanged logic) ---
const PdfPagePreview: React.FC<{ file: File; pageNumber: number; quote?: string; onScaleChange: (scale: number) => void; zoomHandlerRef: React.MutableRefObject<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined> }> = ({ file, pageNumber, quote, onScaleChange, zoomHandlerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    const renderPage = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        if (window.pdfWorkerReady) await window.pdfWorkerReady;
        if (!window.pdfjsLib) { console.warn("[CitationPreview] PDF Lib missing"); return; }

        const pdf = await window.pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;

        const page = await pdf.getPage(pageNumber);

        if (renderTaskRef.current) try { await renderTaskRef.current.cancel(); } catch (e) { }

        const viewportUnscaled = page.getViewport({ scale: 1.0 });
        const baseScale = 400 / viewportUnscaled.width;
        const viewport = page.getViewport({ scale: baseScale * 10 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${viewport.width / 10}px`;
        canvas.style.height = `${viewport.height / 10}px`;

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (quote) {
          const textContent = await page.getTextContent();
          renderHighlights(textContent, viewport, quote);
        }

      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') console.error("[CitationPreview] Error:", err);
      } finally {
        setLoading(false);
      }
    };
    renderPage();
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel?.(); };
  }, [file, pageNumber, quote]);

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
    const scaleFactor = 10;

    if (matchIndex !== -1) {
      const matchEnd = matchIndex + normQuote.length;
      itemMap.forEach(({ start, end, item }) => {
        if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
          if (!window.pdfjsLib.Util) return;

          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]) / scaleFactor;
          const fontWidth = item.width * viewport.scale / scaleFactor;
          const angle = Math.atan2(tx[1], tx[0]);

          const rect = document.createElement('div');
          Object.assign(rect.style, {
            position: 'absolute',
            left: `${tx[4] / scaleFactor}px`,
            top: `${(tx[5] - Math.hypot(tx[2], tx[3])) / scaleFactor}px`,
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.003;
    const newScale = Math.min(Math.max(0.5, scale + delta), 8);

    if (containerRef.current && contentRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = (x - rect.width / 2 - position.x) * (newScale / scale - 1);
      const dy = (y - rect.height / 2 - position.y) * (newScale / scale - 1);
      setPosition({ x: position.x - dx, y: position.y - dy });
    }
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setScale(prev => {
      const newScale = Math.min(Math.max(0.5, prev + delta), 8);
      onScaleChange(newScale);
      return newScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onScaleChange(1);
  };

  useEffect(() => {
    zoomHandlerRef.current = { handleZoom, handleReset };
  }, [scale, position]);

  useEffect(() => {
    onScaleChange(scale);
  }, [scale]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center min-h-full w-full bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] relative overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
    >
      {loading && <div className="absolute inset-0 flex items-center justify-center z-20"><Loader2 size={20} className="animate-spin text-[#666666] dark:text-[#a0a0a0]" /></div>}
      <div
        ref={contentRef}
        className={`relative shadow-lg bg-white ${loading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <canvas ref={canvasRef} className="block" />
        <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" style={{ userSelect: 'none' }} />
      </div>
    </div>
  );
};

// --- TEXT CONTEXT VIEWER ---
const TextContextViewer: React.FC<{ file?: ProcessedFile; quote: string; location: string }> = ({ file, quote, location }) => {
  // Check if it's Excel and extract row data
  if (file?.type === 'excel' && location) {
    const rowMatch = location.match(/Row\s*(\d+)/i);
    const sheetMatch = location.match(/Sheet:\s*([^,]+)/i);
    
    if (rowMatch && file.content) {
      const rowNum = parseInt(rowMatch[1], 10);
      const sheetName = sheetMatch ? sheetMatch[1].trim() : null;
      const lines = file.content.split('\n');
      
      // Find the sheet section
      let sheetStartIdx = 0;
      if (sheetName) {
        const sheetHeaderIdx = lines.findIndex(l => l.includes(`[Sheet: ${sheetName}]`));
        if (sheetHeaderIdx >= 0) sheetStartIdx = sheetHeaderIdx + 1;
      }
      
      // Get headers (first line after sheet header)
      const headerLine = lines[sheetStartIdx];
      const headers = headerLine?.split('\t').map(c => c.replace(/^"|"$/g, '').trim()) || [];
      
      // Get target row (relative to sheet start)
      const targetLine = lines[sheetStartIdx + rowNum];
      
      if (targetLine && !targetLine.includes('[META:') && !targetLine.includes('---')) {
        const cells = targetLine.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
        
        return (
          <div className="p-3 space-y-2">
            <div className="text-[12px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-2">{location}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {cells.map((cell, idx) => (
                    cell && <tr key={idx} className="border-b border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)] last:border-0">
                      <td className="py-1.5 pr-3 font-semibold text-[#666666] dark:text-[#a0a0a0] align-top">{headers[idx] || `Col ${idx + 1}`}:</td>
                      <td className="py-1.5 text-[#1a1a1a] dark:text-white">{cell}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm leading-relaxed text-[#666666] dark:text-[#a0a0a0] bg-white dark:bg-[#2a2a2a] p-4 rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] font-serif shadow-sm">
        <div className="mb-2 text-[12px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{location || "Excerpt"}</div>
        <span className="bg-yellow-100 dark:bg-yellow-600/40 text-[#1a1a1a] dark:text-white p-1 rounded italic">"{quote}"</span>
      </div>
    </div>
  );
};

export default CitationRenderer;
