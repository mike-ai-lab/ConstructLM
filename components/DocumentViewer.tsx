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
  
  // Text/Universal State
  const [loading, setLoading] = useState(isPdf);
  const [textScale, setTextScale] = useState(1.0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // --- PDF LOGIC ---
  useEffect(() => {
    if (!isPdf) {
        setLoading(false);
        return;
    }
    
    let isMounted = true;
    const loadPdf = async () => {
      if (!file.fileHandle || !window.pdfjsLib) {
          console.warn("[DocumentViewer] Missing file handle or PDF.js library");
          return;
      }
      try {
        console.log(`[DocumentViewer] Loading PDF: ${file.name}`);
        setLoading(true);
        setPdfDocument(null);
        setPdfScale(null);

        if (window.pdfWorkerReady) await window.pdfWorkerReady;

        const arrayBuffer = await file.fileHandle.arrayBuffer();
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
        const outputScale = window.devicePixelRatio || 1;
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
      console.groupCollapsed("[PDF HIGHLIGHT DEBUG]");
      
      if(!highlightLayerRef.current) {
          console.groupEnd();
          return;
      }
      highlightLayerRef.current.innerHTML = ''; 
      
      const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
      const normQuote = normalize(quote);
      
      if (!normQuote || normQuote.length < 5) {
          console.warn("Quote too short or empty after normalization");
          console.groupEnd();
          return;
      }

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
          let count = 0;
          
          itemMap.forEach(({ start, end, item }) => {
             if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
                 try {
                     // Check if Util exists
                     if (!window.pdfjsLib.Util) return;

                     const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                     const fontHeight = Math.hypot(tx[2], tx[3]);
                     
                     // FIX: Use viewport.scale directly. item.width is in User Space Units.
                     // The previous logic multiplied by scaleX (from matrix) which effectively squared the scaling factor.
                     const fontWidth = item.width * viewport.scale;
                     
                     // Calculate rotation
                     const angle = Math.atan2(tx[1], tx[0]);

                     const rect = document.createElement('div');
                     Object.assign(rect.style, {
                         position: 'absolute',
                         left: `${tx[4]}px`,
                         top: `${tx[5] - fontHeight}px`,
                         width: `${Math.abs(fontWidth)}px`,
                         height: `${fontHeight}px`,
                         backgroundColor: 'rgba(255, 235, 59, 0.4)', // Material Yellow
                         mixBlendMode: 'multiply',
                         pointerEvents: 'none',
                         transform: `rotate(${angle}rad)`,
                         transformOrigin: '0% 100%'
                     });
                     
                     highlightLayerRef.current?.appendChild(rect);
                     if (!firstMatchElement) firstMatchElement = rect;
                     count++;
                 } catch (err) {
                     console.error("Error creating highlight rect:", err);
                 }
             }
          });
          console.log(`Created ${count} highlight rectangles`);
          
          if (firstMatchElement) {
              requestAnimationFrame(() => {
                 setTimeout(() => {
                     console.log("Scrolling to highlight...");
                     (firstMatchElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }, 100);
              });
          }
      }
      console.groupEnd();
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
            setTimeout(tryScroll, 500); 
        }
    }
  }, [highlightQuote, location, isPdf, file]);

  const getFileIcon = () => {
      if (file.type === 'pdf') return <FileText size={18} />;
      if (file.type === 'excel') return <FileSpreadsheet size={18} />;
      return <FileIcon size={18} />;
  }

  // Common Zoom Handlers
  const handleZoomOut = () => {
      if (isPdf) setPdfScale(s => Math.max(0.5, (s || 1) - 0.2));
      else setTextScale(s => Math.max(0.5, s - 0.1));
  };

  const handleZoomIn = () => {
      if (isPdf) setPdfScale(s => Math.min(3, (s || 1) + 0.2));
      else setTextScale(s => Math.min(2.0, s + 0.1));
  };
  
  const currentScaleDisplay = isPdf ? (pdfScale || 1) : textScale;

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
              <div key="meta" className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 font-mono whitespace-pre-wrap">
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
              <div key={i} className="mb-8">
                  <h4 className={`text-sm font-bold mb-2 px-1 flex items-center gap-2 ${isTargetSheet ? 'text-blue-700' : 'text-gray-700'}`}>
                      <FileSpreadsheet size={14} className={isTargetSheet ? "text-blue-600" : "text-emerald-600"}/> 
                      {sheetName}
                  </h4>
                  <div className={`overflow-x-auto border rounded-lg shadow-sm ${isTargetSheet ? 'border-blue-200' : 'border-gray-200'}`}>
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <tbody className="bg-white divide-y divide-gray-100">
                              {rows.map((row, rIdx) => {
                                  const visualRowNumber = rIdx + 1;
                                  const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);

                                  return (
                                    <tr 
                                        key={rIdx} 
                                        id={isHighlightRow ? "excel-highlight-row" : undefined}
                                        className={`
                                            transition-colors duration-500
                                            ${rIdx === 0 ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50/50"}
                                            ${isHighlightRow ? "bg-amber-100 ring-2 ring-inset ring-amber-400 z-10 relative" : ""}
                                        `}
                                    >
                                        <td className={`px-2 py-2 w-8 select-none text-[10px] text-right border-r border-gray-100 bg-gray-50/50 ${isHighlightRow ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                                            {visualRowNumber}
                                        </td>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap border-r border-gray-100 last:border-none max-w-[300px] truncate" title={cell}>
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
      
      const content = file.content;
      if (!highlightQuote) {
          return (
              <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {content}
              </pre>
          );
      }
      
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = content.split(new RegExp(`(${escapeRegExp(highlightQuote)})`, 'gi'));
      
      return (
          <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {parts.map((part, i) => 
                  part.toLowerCase() === highlightQuote.toLowerCase() 
                  ? <mark key={i} id="text-highlight-match" className="bg-yellow-200 text-gray-900 rounded px-0.5 font-bold border-b-2 border-yellow-400">{part}</mark>
                  : part
              )}
          </pre>
      );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] border-l border-gray-200">
      {/* Header */}
      <div className="flex-none h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-1.5 rounded ${file.type === 'pdf' ? 'bg-rose-50 text-rose-500' : file.type === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {getFileIcon()}
            </div>
            <div className="flex flex-col overflow-hidden">
                <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[200px]" title={file.name}>{file.name}</h3>
                {isPdf ? (
                    <span className="text-[10px] text-gray-400 font-medium">Page {pageNumber} of {numPages}</span>
                ) : (
                    <span className="text-[10px] text-gray-400 font-medium">
                        {file.type === 'excel' && location ? location : (file.type === 'excel' ? 'Spreadsheet View' : 'Text View')}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200">
                 <button onClick={handleZoomOut} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomOut size={14} /></button>
                 <span className="text-[10px] w-10 text-center font-medium text-gray-600">{Math.round(currentScaleDisplay * 100)}%</span>
                 <button onClick={handleZoomIn} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomIn size={14} /></button>
             </div>
             <div className="h-4 w-px bg-gray-200"></div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Close Viewer">
               <X size={18} />
             </button>
        </div>
      </div>

      {/* Viewport */}
      <div ref={containerRef} className="flex-1 overflow-auto relative flex justify-center custom-scrollbar bg-gray-100/50">
         {isPdf && (
             <div className="p-8">
                 <div className="fixed bottom-6 z-40 bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 left-1/2 -translate-x-1/2 transform transition-opacity duration-300 opacity-0 hover:opacity-100 group-hover:opacity-100">
                    <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={20} /></button>
                    <span className="text-xs font-medium tabular-nums">{pageNumber} / {numPages}</span>
                    <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={20} /></button>
                 </div>
                 {loading && pdfScale === null && (
                     <div className="absolute inset-0 flex items-center justify-center z-30">
                        <div className="flex flex-col items-center gap-3">
                           <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                           <span className="text-xs font-medium text-gray-500">Rendering...</span>
                        </div>
                     </div>
                 )}
                 <div className="relative shadow-xl ring-1 ring-black/5 bg-white transition-opacity duration-200 origin-top" style={{ width: 'fit-content', height: 'fit-content', opacity: loading ? 0.6 : 1 }}>
                    <canvas ref={canvasRef} className="block" />
                    <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
                    <div ref={textLayerRef} className="textLayer absolute inset-0" />
                 </div>
             </div>
         )}
         {!isPdf && (
             <div className="bg-white shadow-sm border border-gray-200 w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
                <div className="p-12">{renderTextContent()}</div>
             </div>
         )}
      </div>
    </div>
  );
};

export default DocumentViewer;