import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, Maximize2 } from 'lucide-react';
import { ProcessedFile } from '../../../types';
import PdfPagePreview from './PdfPagePreview';
import TextContextViewer from './TextContextViewer';

interface CitationPopupProps {
  onClose: () => void;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  triggerRef: React.RefObject<HTMLSpanElement>;
  onOpenFull: () => void;
  isInTable: boolean;
  coords?: { top: number; left: number };
}

/**
 * Layout constants
 * Adjust SIDE_PANEL_WIDTH if your UI changes
 */
const POPUP_WIDTH = 450;
const VIEWPORT_PADDING = 8;
const SIDE_PANEL_WIDTH = 280; // left / right panels when opened
const MAX_HEIGHT = 'min(40vh, 400px)';

const CitationPopup: React.FC<CitationPopupProps> = ({
  onClose,
  fileName,
  location,
  quote,
  files,
  triggerRef,
  onOpenFull,
  isInTable,
  coords,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<ProcessedFile | undefined>();
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{
    handleZoom: (delta: number) => void;
    handleReset: () => void;
  }>();

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  /* ---------------- File Resolution ---------------- */

  useEffect(() => {
    const found = files.find(f => f.name === fileName);
    setFile(found);

    if (found?.type === 'pdf' && location) {
      const match = location.match(/Page\s*(\d+)/i);
      setPdfPageNumber(match ? parseInt(match[1], 10) : 1);
    } else {
      setPdfPageNumber(null);
    }
  }, [fileName, files, location]);

  /* ---------------- Smart Positioning ---------------- */

  const calculatePosition = () => {
    if (isInTable && coords) {
      const viewportWidth = window.innerWidth;
      const safeLeftBoundary = SIDE_PANEL_WIDTH + VIEWPORT_PADDING;
      const safeRightBoundary = viewportWidth - SIDE_PANEL_WIDTH - VIEWPORT_PADDING;
      const availableWidth = safeRightBoundary - safeLeftBoundary;
      const effectiveWidth = Math.min(POPUP_WIDTH, availableWidth);

      let left = coords.left;
      if (left + effectiveWidth > safeRightBoundary) {
        left = safeRightBoundary - effectiveWidth;
      }
      if (left < safeLeftBoundary) {
        left = safeLeftBoundary;
      }

      setPosition({ top: coords.top, left });
    } else if (!isInTable && popoverRef.current && triggerRef.current) {
      const popup = popoverRef.current;
      const rect = popup.getBoundingClientRect();
      const chatArea = popup.closest('main') || popup.closest('[role="main"]') || document.body;
      const chatRect = chatArea.getBoundingClientRect();

      if (rect.right > chatRect.right - 10) {
        popup.style.right = '0';
        popup.style.left = 'auto';
      } else {
        popup.style.left = '-20px';
        popup.style.right = 'auto';
      }
    }
  };

  useLayoutEffect(() => {
    calculatePosition();
  }, [coords, isInTable]);

  useEffect(() => {
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInTable, coords]);

  /* ---------------- Outside Click ---------------- */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  /* ---------------- Render ---------------- */

  const popup = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
      onWheel={e => e.stopPropagation()}
      className={`
        ${isInTable ? 'fixed z-[10000]' : 'absolute z-[150]'}
        bg-white dark:bg-[#222222]
        text-[#1a1a1a] dark:text-white
        rounded-lg shadow-2xl
        border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]
        flex flex-col overflow-hidden
        animate-in fade-in duration-150
      `}
      style={{
        width: POPUP_WIDTH,
        maxWidth: `calc(100vw - ${(SIDE_PANEL_WIDTH * 2) + VIEWPORT_PADDING * 2}px)`,
        maxHeight: MAX_HEIGHT,
        ...(isInTable
          ? { top: position?.top ?? 0, left: position?.left ?? 0 }
          : { top: '100%', left: '-20px', marginTop: 8 }),
      }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen size={12} className="text-blue-600" />
          <span className="text-xs font-medium truncate">{fileName}</span>
          <span className="text-xs text-[#666] dark:text-[#a0a0a0]">
            • {location}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={onOpenFull}
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
            title="Open Full"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgba(0,0,0,0.05)]"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]"
        onWheel={e => e.stopPropagation()}
      >
        {isPdfMode && file?.fileHandle ? (
          <PdfPagePreview
            file={file.fileHandle}
            pageNumber={pdfPageNumber as number}
            quote={quote}
            onScaleChange={setPdfScale}
            zoomHandlerRef={pdfZoomHandlerRef}
          />
        ) : (
          <TextContextViewer file={file} quote={quote} location={location} />
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 border-t bg-white dark:bg-[#2a2a2a] flex items-center justify-between">
        <p className="text-xs italic text-[#666] dark:text-[#a0a0a0] line-clamp-2">
          "{quote}"
        </p>

        {isPdfMode && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)}>+</button>
            <span className="text-xs">{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)}>−</button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()}>⟲</button>
          </div>
        )}
      </div>
    </div>
  );

  return isInTable ? createPortal(popup, document.body) : popup;
};

export default CitationPopup;
