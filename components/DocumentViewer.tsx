import React, { useState, useEffect, useRef } from 'react';
import { ProcessedFile } from '../types';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Maximize, FileText } from 'lucide-react';

interface DocumentViewerProps {
  file: ProcessedFile;
  initialPage?: number;
  highlightQuote?: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, initialPage = 1, highlightQuote, onClose }) => {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const renderTaskRef = useRef<any>(null);

  // 1. Load PDF Document
  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      if (!file.fileHandle || !window.pdfjsLib) return;
      try {
        setLoading(true);
        setPdfDocument(null);
        setScale(null);

        // Ensure worker is configured before loading
        if (window.pdfWorkerReady) {
            await window.pdfWorkerReady;
        }

        const arrayBuffer = await file.fileHandle.arrayBuffer();
        
        // Use Uint8Array and provide CMap params to avoid "Invalid PDF structure" and font errors
        const pdf = await window.pdfjsLib.getDocument({ 
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        }).promise;
        
        if (isMounted) {
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
        }
      } catch (error) {
        console.error("Error loading PDF:", error);
        if (isMounted) setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Initial Setup
  useEffect(() => {
    if (!pdfDocument || !containerRef.current) return;

    const setupView = async () => {
        try {
            setPageNumber(initialPage);
            const page = await pdfDocument.getPage(initialPage);
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current?.clientWidth || 800;
            const idealScale = (containerWidth - 64) / viewport.width;
            setScale(Math.max(0.6, Math.min(idealScale, 1.5)));
        } catch (e) {
            console.error(e);
            setScale(1.0);
        }
    };
    setupView();
  }, [pdfDocument, initialPage]);

  // 3. Render Page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current || scale === null) return;

    const renderPage = async () => {
      try {
        setLoading(true);
        const page = await pdfDocument.getPage(pageNumber);
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });
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
            textLayerDiv.style.setProperty('--scale-factor', String(scale));
            
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
        if (error.name !== 'RenderingCancelledException') setLoading(false);
      }
    };

    renderPage();
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
  }, [pageNumber, scale, pdfDocument, highlightQuote]);

  const renderHighlights = (textContent: any, viewport: any, quote: string) => {
      if(!highlightLayerRef.current) return;
      highlightLayerRef.current.innerHTML = ''; 
      const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
      const normQuote = normalize(quote);
      if (!normQuote || normQuote.length < 5) return;

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
             if (start < matchEnd && end > matchIndex) {
                 const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                 const fontHeight = Math.hypot(tx[2], tx[3]);
                 const fontWidth = item.width ? item.width * scale : (fontHeight * item.str.length * 0.5);

                 const rect = document.createElement('div');
                 Object.assign(rect.style, {
                     position: 'absolute',
                     left: `${tx[4]}px`,
                     top: `${tx[5] - fontHeight}px`,
                     width: `${Math.abs(fontWidth)}px`,
                     height: `${fontHeight}px`,
                     backgroundColor: 'rgba(255, 215, 0, 0.3)',
                     mixBlendMode: 'multiply',
                     pointerEvents: 'none',
                     borderBottom: '2px solid rgba(255, 180, 0, 0.8)'
                 });
                 
                 highlightLayerRef.current?.appendChild(rect);
                 if (!firstMatchElement) firstMatchElement = rect;
             }
          });
          if (firstMatchElement) {
              setTimeout(() => (firstMatchElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
          }
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] border-l border-gray-200">
      {/* Viewer Header */}
      <div className="flex-none h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-1.5 bg-rose-50 rounded text-rose-500">
                <FileText size={18} />
            </div>
            <div className="flex flex-col overflow-hidden">
                <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[200px]" title={file.name}>{file.name}</h3>
                <span className="text-[10px] text-gray-400 font-medium">Page {pageNumber} of {numPages}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200">
                 <button onClick={() => setScale(s => Math.max(0.5, (s || 1) - 0.2))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomOut size={14} /></button>
                 <span className="text-[10px] w-10 text-center font-medium text-gray-600">{Math.round((scale || 1) * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(3, (s || 1) + 0.2))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomIn size={14} /></button>
             </div>
             <div className="h-4 w-px bg-gray-200"></div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Close Viewer">
               <X size={18} />
             </button>
        </div>
      </div>

      {/* Viewport */}
      <div ref={containerRef} className="flex-1 overflow-auto relative flex justify-center p-8 custom-scrollbar">
         {/* Navigation Overlay */}
         <div className="fixed bottom-6 z-40 bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 left-1/2 -translate-x-1/2 transform transition-opacity duration-300 opacity-0 hover:opacity-100 group-hover:opacity-100">
            <button 
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-1 hover:text-blue-600 disabled:opacity-30"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-medium tabular-nums">{pageNumber} / {numPages}</span>
            <button 
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-1 hover:text-blue-600 disabled:opacity-30"
            >
                <ChevronRight size={20} />
            </button>
         </div>

         {loading && scale === null && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-30">
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
    </div>
  );
};

export default DocumentViewer;