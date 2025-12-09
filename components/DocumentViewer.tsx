import React, { useState, useEffect, useRef } from 'react';
import { ProcessedFile } from '../types';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

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
        // Reset state
        setPdfDocument(null);
        setScale(null);

        const arrayBuffer = await file.fileHandle.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (isMounted) {
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
            // Don't set loading false yet; wait for render
        }
      } catch (error) {
        console.error("Error loading PDF:", error);
        if (isMounted) setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Initial Page & Scale Setup
  useEffect(() => {
    if (!pdfDocument || !containerRef.current) return;

    const setupView = async () => {
        try {
            // Set initial page
            setPageNumber(initialPage);

            // Calculate Fit Width
            const page = await pdfDocument.getPage(initialPage);
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current?.clientWidth || 800;
            
            // Subtract padding (approx 64px) to fit comfortably
            const idealScale = (containerWidth - 64) / viewport.width;
            
            // Clamp scale between reasonable reading sizes (e.g., 0.6 to 1.5 for initial view)
            setScale(Math.max(0.6, Math.min(idealScale, 1.5)));
            
        } catch (e) {
            console.error("Setup view error", e);
            setScale(1.0);
        }
    };

    setupView();
  }, [pdfDocument, initialPage]);

  // 3. Render Page
  useEffect(() => {
    // Only render if we have a document and a calculated scale
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current || scale === null) return;

    const renderPage = async () => {
      try {
        setLoading(true);
        const page = await pdfDocument.getPage(pageNumber);
        
        // --- High DPI Support ---
        // Get the device pixel ratio (e.g., 2 for Retina)
        const outputScale = window.devicePixelRatio || 1;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!canvas || !context) return;

        // Set dimensions based on output scale for sharpness
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        
        // CSS dimensions must match the viewport exactly (visual size)
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        // Cancel previous render task if active
        if (renderTaskRef.current) {
            try { await renderTaskRef.current.cancel(); } catch (e) {}
        }

        // --- Render Canvas ---
        // If outputScale > 1, we need to apply a transform to the render context
        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // --- Render Text Layer ---
        const textContent = await page.getTextContent();
        const textLayerDiv = textLayerRef.current;
        
        if (textLayerDiv) {
            textLayerDiv.innerHTML = ''; // Clear previous text
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.width = `${viewport.width}px`;
            // Essential for PDF.js text layer CSS to work correctly
            textLayerDiv.style.setProperty('--scale-factor', String(scale));
            
            await window.pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
              textDivs: []
            }).promise;
        }

        // --- Render Highlights ---
        if (highlightQuote && highlightLayerRef.current) {
            renderHighlights(textContent, viewport, highlightQuote);
        }

        setLoading(false);

      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
            console.error("Error rendering page:", error);
            setLoading(false);
        }
      }
    };

    renderPage();
    
    return () => {
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }
    };
  }, [pageNumber, scale, pdfDocument, highlightQuote]);

  // Robust Highlight Logic
  const renderHighlights = (textContent: any, viewport: any, quote: string) => {
      if(!highlightLayerRef.current) return;
      highlightLayerRef.current.innerHTML = ''; 

      const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
      const normQuote = normalize(quote);
      
      if (!normQuote || normQuote.length < 5) return; // Ignore very short quotes to prevent noise

      // 1. Build a full text map for the page
      let fullText = "";
      const itemMap: { start: number, end: number, item: any }[] = [];
      
      textContent.items.forEach((item: any) => {
          const str = normalize(item.str);
          const start = fullText.length;
          fullText += str;
          itemMap.push({ start, end: fullText.length, item });
      });

      // 2. Find range in full text
      const matchIndex = fullText.indexOf(normQuote);
      
      if (matchIndex !== -1) {
          const matchEnd = matchIndex + normQuote.length;
          let firstMatchElement: HTMLElement | null = null;

          // 3. Highlight items that overlap with the range
          itemMap.forEach(({ start, end, item }) => {
             // Intersection check:
             // Item starts before the match ends AND item ends after the match starts
             if (start < matchEnd && end > matchIndex) {
                 const tx = window.pdfjsLib.Util.transform(
                     viewport.transform,
                     item.transform
                 );
                 
                 // Calculate dimensions
                 const fontHeight = Math.hypot(tx[2], tx[3]);
                 const fontWidth = item.width ? item.width * scale : (fontHeight * item.str.length * 0.5);

                 const rect = document.createElement('div');
                 rect.style.position = 'absolute';
                 rect.style.left = `${tx[4]}px`;
                 rect.style.top = `${tx[5] - fontHeight}px`; 
                 rect.style.width = `${Math.abs(fontWidth)}px`; 
                 rect.style.height = `${fontHeight}px`;
                 rect.style.backgroundColor = 'rgba(255, 235, 59, 0.4)'; // Highlighter Yellow
                 rect.style.mixBlendMode = 'multiply';
                 rect.style.pointerEvents = 'none'; // Allow clicking text below
                 rect.style.borderRadius = '2px';
                 
                 highlightLayerRef.current?.appendChild(rect);
                 if (!firstMatchElement) firstMatchElement = rect;
             }
          });

          // Scroll to the highlight
          if (firstMatchElement) {
              setTimeout(() => {
                  (firstMatchElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
          }
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 border-l border-gray-200 shadow-xl overflow-hidden">
      {/* Header - Flex None to prevent scaling/shrinking */}
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex flex-col overflow-hidden mr-4">
            <h3 className="font-semibold text-gray-800 truncate" title={file.name}>{file.name}</h3>
            <span className="text-xs text-gray-500">Page {pageNumber} of {numPages}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
           <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
             <button onClick={() => setScale(s => Math.max(0.5, (s || 1) - 0.2))} className="p-1 hover:bg-white rounded transition-colors"><ZoomOut size={16} /></button>
             <span className="text-xs flex items-center px-2 min-w-[3.5rem] justify-center font-medium">{Math.round((scale || 1) * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(3, (s || 1) + 0.2))} className="p-1 hover:bg-white rounded transition-colors"><ZoomIn size={16} /></button>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
             <X size={20} />
           </button>
        </div>
      </div>

      {/* Toolbar / Page Nav - Flex None */}
      <div className="flex-none bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-center items-center gap-4 z-10">
        <button 
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-gray-600">
           Page <input 
             type="number" 
             value={pageNumber} 
             onChange={(e) => setPageNumber(Math.min(numPages, Math.max(1, parseInt(e.target.value) || 1)))}
             className="w-12 text-center border border-gray-300 rounded mx-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
           /> of {numPages}
        </span>
        <button 
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* PDF Viewport */}
      {/* min-h-0 is crucial for nested flex scrolling */}
      <div ref={containerRef} className="flex-1 overflow-auto relative bg-gray-200/50 flex justify-center p-8 min-h-0">
         {loading && scale === null && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-30">
                 <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500">Loading PDF...</span>
                 </div>
             </div>
         )}
         
         {/* Container for Canvas + Text Layer. Dimensions are set by canvas size. */}
         <div className="relative shadow-lg bg-white transition-opacity duration-200" style={{ width: 'fit-content', height: 'fit-content', opacity: loading ? 0.5 : 1 }}>
            <canvas ref={canvasRef} className="block" />
            <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
            {/* ADDED 'textLayer' class here to fix the double text issue */}
            <div ref={textLayerRef} className="textLayer absolute inset-0" />
         </div>
      </div>
    </div>
  );
};

export default DocumentViewer;