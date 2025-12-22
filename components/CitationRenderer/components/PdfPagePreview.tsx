import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { renderHighlights } from '../utils/pdfUtils';

interface PdfPagePreviewProps {
  file: File;
  pageNumber: number;
  quote?: string;
  onScaleChange: (scale: number) => void;
  zoomHandlerRef: React.MutableRefObject<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined>;
}

const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({ file, pageNumber, quote, onScaleChange, zoomHandlerRef }) => {
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

        if (quote && highlightLayerRef.current) {
          const textContent = await page.getTextContent();
          renderHighlights(textContent, viewport, quote, highlightLayerRef.current, 10);
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

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
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
  }, [handleZoom, handleReset]);

  useEffect(() => {
    onScaleChange(scale);
  }, [scale, onScaleChange]);

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

export default PdfPagePreview;
