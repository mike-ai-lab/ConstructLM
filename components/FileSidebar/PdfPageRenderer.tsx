import React, { useRef, useState, useEffect } from 'react';

interface PdfPageRendererProps {
  pdf: any;
  pageNum: number;
  scale: number;
}

const PdfPageRenderer: React.FC<PdfPageRendererProps> = ({ pdf, pageNum, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
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
  }, [pdf, pageNum, scale]);

  return (
    <div className="bg-white shadow-lg mx-auto" style={{ width: pageWidth || 'auto' }}>
      <canvas ref={canvasRef} className="block" />
      <div className="text-center text-xs text-gray-400 py-2">Page {pageNum}</div>
    </div>
  );
};

export default PdfPageRenderer;
