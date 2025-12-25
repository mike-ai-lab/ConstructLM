import React, { useState, useEffect, useRef } from 'react';
import { ProcessedFile } from '../../types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface PdfViewerProps {
  file: ProcessedFile;
  initialPage: number;
  highlightQuote?: string;
  viewScale: number;
  setViewScale: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file, initialPage, highlightQuote, viewScale, setViewScale, onZoomIn, onZoomOut, onResetZoom }) => {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState<number | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      if (!file.fileHandle || !window.pdfjsLib) {
        console.warn('[PdfViewer] Missing fileHandle or pdfjsLib');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        if (window.pdfWorkerReady) await window.pdfWorkerReady;
        const arrayBuffer = await file.fileHandle.arrayBuffer();
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
        console.error("PDF load error:", error);
        if (isMounted) setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  useEffect(() => {
    if (!pdfDocument || !containerRef.current) return;
    const setupView = async () => {
      try {
        setPageNumber(initialPage);
        const page = await pdfDocument.getPage(initialPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current?.clientWidth || 800;
        const idealScale = (containerWidth - 64) / viewport.width;
        setPdfScale(Math.max(0.6, Math.min(idealScale, 1.5)));
      } catch (e) {
        setPdfScale(1.0);
      }
    };
    setupView();
  }, [pdfDocument, initialPage]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current || pdfScale === null) return;
    const renderPage = async () => {
      try {
        setLoading(true);
        const page = await pdfDocument.getPage(pageNumber);
        const outputScale = (window.devicePixelRatio || 1) * 5;
        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
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
          setLoading(false);
        }
      }
    };
    renderPage();
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
  }, [pageNumber, pdfScale, pdfDocument, highlightQuote]);

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
          } catch (err) {}
        }
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
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
  }, [viewScale, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1) return;
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

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-hidden relative flex custom-scrollbar bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]" 
      style={{ justifyContent: 'center', alignItems: 'center', cursor: isDragging ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
    </div>
  );
};

export default PdfViewer;
