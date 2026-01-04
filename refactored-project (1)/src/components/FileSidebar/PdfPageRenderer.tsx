import React, { useRef, useEffect, useState } from 'react';

interface PdfPageRendererProps {
  pdf: any;
  pageNum: number;
  scale: number;
}

const PdfPageRenderer: React.FC<PdfPageRendererProps> = ({ pdf, pageNum, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const renderTaskRef = useRef<any>(null);

  // Lazy loading using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    const render = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        
        if (!canvas || !isMounted) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageWidth(viewport.width);
        
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
      }
    };
    render();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNum, scale, isVisible]);

  return (
    <div 
      ref={containerRef} 
      className="bg-white shadow-lg mx-auto mb-4 min-h-[400px] flex flex-col items-center justify-center"
      style={{ width: pageWidth || '100%', maxWidth: '100%' }}
    >
      {isVisible ? (
        <>
          <canvas ref={canvasRef} className="block" />
          <div className="text-center text-xs text-gray-400 py-2">Page {pageNum}</div>
        </>
      ) : (
        <div className="text-gray-400">Loading page {pageNum}...</div>
      )}
    </div>
  );
};

export default PdfPageRenderer;
