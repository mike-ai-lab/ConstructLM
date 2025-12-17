import React, { useState, useEffect, useRef } from 'react';
import { ProcessedFile } from '../types';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, FileText, FileSpreadsheet, File as FileIcon } from 'lucide-react';

interface DocumentViewerProps {
  file: ProcessedFile;
  initialPage?: number;
  highlightQuote?: string;
  location?: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, initialPage = 1, highlightQuote, location, onClose }) => {
  const isPdf = file.type === 'pdf';
  
  // PDF State
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState<number | null>(null);
  const [viewScale, setViewScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  
  // Text/Universal State
  const [loading, setLoading] = useState(isPdf);
  const [textScale, setTextScale] = useState(1.0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // --- PDF LOGIC ---
  useEffect(() => {
    if (!isPdf) {
        setLoading(false);
        return;
    }
    
    let isMounted = true;
    const loadPdf = async () => {
      if (!file.fileHandle || !(file.fileHandle instanceof File) || !window.pdfjsLib) {
          console.warn("[DocumentViewer] Missing file handle or PDF.js library");
          setLoading(false);
          return;
      }
      try {
        console.log(`[DocumentViewer] Loading PDF: ${file.name}`);
        setLoading(true);
        setPdfDocument(null);
        setPdfScale(null);

        if (window.pdfWorkerReady) await window.pdfWorkerReady;

        const arrayBuffer = await (file.fileHandle as File).arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ 
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        }).promise;
        
        if (isMounted) {
            console.log(`[DocumentViewer] PDF Loaded. Pages: ${pdf.numPages}`);
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
        }
      } catch (error) {
        console.error("[DocumentViewer] Error loading PDF:", error);
        if (isMounted) setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file, isPdf]);

  // Initial Scale (PDF)
  useEffect(() => {
    if (!isPdf || !pdfDocument || !containerRef.current) return;

    const setupView = async () => {
        try {
            setPageNumber(initialPage);
            const page = await pdfDocument.getPage(initialPage);
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current?.clientWidth || 800;
            const idealScale = (containerWidth - 64) / viewport.width;
            setPdfScale(Math.max(0.6, Math.min(idealScale, 1.5)));
        } catch (e) {
            console.error("[DocumentViewer] Error setting up view:", e);
            setPdfScale(1.0);
        }
    };
    setupView();
  }, [pdfDocument, initialPage, isPdf]);

  // Render Page (PDF)
  useEffect(() => {
    if (!isPdf || !pdfDocument || !canvasRef.current || !textLayerRef.current || pdfScale === null) return;

    const renderPage = async () => {
      try {
        console.log(`[DocumentViewer] Rendering page ${pageNumber} at scale ${pdfScale}`);
        setLoading(true);
        const page = await pdfDocument.getPage(pageNumber);
        const outputScale = (window.devicePixelRatio || 1) * 5;
        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!canvas || !context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        if (renderTaskRef.current) {
            try { await renderTaskRef.current.cancel(); } catch (e) {}
        }

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        
        const renderTask = page.render({ canvasContext: context, transform, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // Render Text Layer
        const textContent = await page.getTextContent();
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
            textLayerDiv.innerHTML = '';
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.setProperty('--scale-factor', String(pdfScale));
            
            await window.pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
              textDivs: []
            }).promise;
        }

        if (highlightQuote && highlightLayerRef.current) {
            renderHighlights(textContent, viewport, highlightQuote);
        }

        setLoading(false);
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
            console.error("[DocumentViewer] Render error:", error);
            setLoading(false);
        }
      }
    };

    renderPage();
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
  }, [pageNumber, pdfScale, pdfDocument, highlightQuote, isPdf]);

  const renderHighlights = (textContent: any, viewport: any, quote: string) => {
      if(!highlightLayerRef.current) return;
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
          let firstMatchElement: HTMLElement | null = null;
          
          itemMap.forEach(({ start, end, item }) => {
             if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
                 try {
                     if (!window.pdfjsLib?.Util) return;

                     const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                     const fontHeight = Math.hypot(tx[2], tx[3]);
                     const fontWidth = item.width * viewport.scale;
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
                         transformOrigin: '0% 100%'
                     });
                     
                     highlightLayerRef.current?.appendChild(rect);
                     if (!firstMatchElement) firstMatchElement = rect;
                 } catch (err) {}
             }
          });
          
          if (firstMatchElement) {
              setTimeout(() => {
                  firstMatchElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
          }
      }
  };

  // --- TEXT/EXCEL LOGIC ---
  
  useEffect(() => {
    if (!isPdf) {
        const tryScroll = () => {
            const rowEl = document.getElementById('excel-highlight-row');
            if (rowEl) {
                rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                rowEl.classList.add('bg-amber-200');
                setTimeout(() => rowEl.classList.remove('bg-amber-200'), 1000);
                return true;
            }

            if (highlightQuote) {
                const textEl = document.getElementById('text-highlight-match');
                if (textEl) {
                    textEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return true;
                }
            }
            return false;
        };
        
        if (!tryScroll()) {
            setTimeout(tryScroll, 100);
            setTimeout(tryScroll, 300);
            setTimeout(tryScroll, 600);
        }
    }
  }, [highlightQuote, location, isPdf, file, textScale]);

  const getFileIcon = () => {
      if (file.type === 'pdf') return <FileText size={18} />;
      if (file.type === 'excel') return <FileSpreadsheet size={18} />;
      return <FileIcon size={18} />;
  }

  // Zoom & Pan Handlers
  useEffect(() => {
      if (!isPdf || !containerRef.current) return;
      
      const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) e.preventDefault();
          const delta = -e.deltaY * 0.003;
          const newScale = Math.min(Math.max(0.5, viewScale + delta), 8);
          
          if (containerRef.current && pdfContentRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const dx = (x - rect.width / 2 - position.x) * (newScale / viewScale - 1);
              const dy = (y - rect.height / 2 - position.y) * (newScale / viewScale - 1);
              setPosition({ x: position.x - dx, y: position.y - dy });
          }
          setViewScale(newScale);
      };
      
      const container = containerRef.current;
      container.addEventListener('wheel', handleWheel);
      return () => container.removeEventListener('wheel', handleWheel);
  }, [isPdf, viewScale, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!isPdf || e.button !== 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomOut = () => {
      if (isPdf) setViewScale(s => Math.max(0.5, s - 0.2));
      else setTextScale(s => Math.max(0.5, s - 0.1));
  };

  const handleZoomIn = () => {
      if (isPdf) setViewScale(s => Math.min(8, s + 0.2));
      else setTextScale(s => Math.min(2.0, s + 0.1));
  };

  const handleResetZoom = () => {
      if (isPdf) {
          setViewScale(1);
          setPosition({ x: 0, y: 0 });
      } else {
          setTextScale(1.0);
      }
  };
  
  const currentScaleDisplay = isPdf ? viewScale : textScale;

  // -- Custom Content Rendering --

  const parseExcelContent = (content: string, highlightLoc?: string) => {
      const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
      const parts = content.split(sheetRegex);
      const elements: React.ReactNode[] = [];
      
      let targetSheet = "";
      let targetRow = -1;

      if (highlightLoc) {
          const sheetMatch = highlightLoc.match(/Sheet:\s*['"]?([^,'";|]+)['"]?/i);
          if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();

          const rowMatch = highlightLoc.match(/(?:Row|Line)\s*[:#.]?\s*(\d+)/i);
          if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
      }

      if (parts[0].trim()) {
          elements.push(
              <div key="meta" className="mb-6 p-4 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-xs text-[#666666] dark:text-[#a0a0a0] font-mono whitespace-pre-wrap">
                  {parts[0].trim()}
              </div>
          );
      }

      for (let i = 1; i < parts.length; i += 2) {
          const sheetName = parts[i];
          const csvContent = parts[i + 1] || "";
          const lines = csvContent.trim().split('\n');
          
          const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
          const rows = lines.map(row => {
              const cells: string[] = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < row.length; j++) {
                  const char = row[j];
                  if (char === '"') {
                      inQuotes = !inQuotes;
                  } else if (char === delimiter && !inQuotes) {
                      cells.push(current);
                      current = '';
                  } else {
                      current += char;
                  }
              }
              cells.push(current);
              return cells;
          });


          const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);

          elements.push(
              <div key={i} className="mb-8">
                  <h4 className={`text-sm font-bold mb-2 px-1 flex items-center gap-2 ${isTargetSheet ? 'text-blue-700 dark:text-blue-400' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>
                      <FileSpreadsheet size={14} className={isTargetSheet ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}/> 
                      {sheetName}
                  </h4>
                  <div className={`overflow-auto border rounded-lg shadow-sm ${isTargetSheet ? 'border-blue-200 dark:border-blue-800' : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'}`} style={{ maxHeight: '600px' }}>
                      <table className="w-full table-auto divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)] text-xs">
                          <tbody className="bg-white dark:bg-[#2a2a2a] divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)]">
                              {rows.map((row, rIdx) => {
                                  const visualRowNumber = rIdx + 1;
                                  const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);
                                  const isHeaderRow = rIdx === 0;

                                  return (
                                    <tr 
                                        key={rIdx} 
                                        id={isHighlightRow ? "excel-highlight-row" : undefined}
                                        className={`
                                            transition-colors duration-500
                                            ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a] font-semibold text-[#1a1a1a] dark:text-white sticky top-0 z-20" : "text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"}
                                            ${isHighlightRow ? "bg-amber-100 dark:bg-amber-900/30 ring-2 ring-inset ring-amber-400 dark:ring-amber-600 z-10 relative" : ""}
                                        `}
                                    >
                                        <td className={`px-1 py-1 w-8 select-none text-[12px] text-right border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a]" : "bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]"} ${isHighlightRow ? "text-amber-700 dark:text-amber-400 font-bold" : "text-[#999999] dark:text-[#666666]"}`}>
                                            {visualRowNumber}
                                        </td>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-1.5 py-1 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] last:border-none" title={cell}>
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

  const renderTextContent = () => {
      if (file.type === 'excel') {
          return parseExcelContent(file.content, location);
      }
      
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
                  ? <mark key={i} id="text-highlight-match" className="bg-yellow-200 dark:bg-yellow-600/40 text-[#1a1a1a] dark:text-white rounded px-0.5 font-bold border-b-2 border-yellow-400 dark:border-yellow-500">{part}</mark>
                  : part
              )}
          </pre>
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

  return (
    <div className="flex flex-col h-full w-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
      {/* Header */}
      <div className="flex-none h-[65px] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-1.5 rounded ${file.type === 'pdf' ? 'bg-rose-50 text-rose-500' : file.type === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {getFileIcon()}
            </div>
            <div className="flex flex-col overflow-hidden">
                <h3 className="font-semibold text-[#1a1a1a] dark:text-white text-sm truncate max-w-[200px]" title={file.name}>{file.name}</h3>
                {isPdf ? (
                    <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] font-medium">Page {pageNumber} of {numPages}</span>
                ) : (
                    <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] font-medium">
                        {file.type === 'excel' && location ? location : (file.type === 'excel' ? 'Spreadsheet View' : 'Text View')}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg p-0.5 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
                 <button onClick={handleZoomOut} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all"><ZoomOut size={14} /></button>
                 <span className="text-[12px] w-10 text-center font-medium text-[#666666] dark:text-[#a0a0a0]">{Math.round(currentScaleDisplay * 100)}%</span>
                 <button onClick={handleZoomIn} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all"><ZoomIn size={14} /></button>
                 {isPdf && <button onClick={handleResetZoom} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all text-[12px]" title="Reset">⟲</button>}
             </div>
             <div className="h-4 w-px bg-[rgba(0,0,0,0.15)] dark:bg-[rgba(255,255,255,0.05)]"></div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-[#a0a0a0] hover:text-[#ef4444] rounded-lg transition-colors" title="Close Viewer">
               <X size={18} />
             </button>
        </div>
      </div>

      {/* Viewport */}
      <div 
          ref={containerRef} 
          className="flex-1 overflow-hidden relative flex custom-scrollbar bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]" 
          style={{ justifyContent: isPdf ? 'center' : 'unset', alignItems: isPdf ? 'center' : 'unset', cursor: isDragging ? 'grabbing' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
      >
         {isPdf && (
             <>
                 <div className="fixed bottom-6 z-20 bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 left-1/2 -translate-x-1/2 transform transition-opacity duration-300 opacity-0 hover:opacity-100 group-hover:opacity-100 pointer-events-none">
                    <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1 hover:text-blue-600 disabled:opacity-30 pointer-events-auto"><ChevronLeft size={20} /></button>
                    <span className="text-xs font-medium tabular-nums pointer-events-none">{pageNumber} / {numPages}</span>
                    <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="p-1 hover:text-blue-600 disabled:opacity-30 pointer-events-auto"><ChevronRight size={20} /></button>
                 </div>
                 {loading && pdfScale === null && (
                     <div className="absolute inset-0 flex items-center justify-center z-30">
                        <div className="flex flex-col items-center gap-3">
                           <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                           <span className="text-xs font-medium text-gray-500">Rendering...</span>
                        </div>
                     </div>
                 )}
                 <div 
                    ref={pdfContentRef}
                    className="relative isolate shadow-xl ring-1 ring-black/5 bg-white transition-opacity duration-200" 
                    style={{ 
                        width: 'fit-content', 
                        height: 'fit-content', 
                        opacity: loading ? 0.6 : 1,
                        transform: `translate(${position.x}px, ${position.y}px) scale(${viewScale})`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                 >
                    <canvas ref={canvasRef} className="block" />
                    <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" style={{ userSelect: 'none' }} />
                    <div ref={textLayerRef} className="textLayer absolute inset-0" />
                 </div>
             </>
         )}
         {!isPdf && (
             <div className="overflow-auto w-full h-full">
                 <div className="bg-white dark:bg-[#2a2a2a] shadow-sm border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
                    <div className="p-12">{renderTextContent()}</div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default DocumentViewer;
