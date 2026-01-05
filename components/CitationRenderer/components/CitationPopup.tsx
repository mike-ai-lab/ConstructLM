import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, Maximize2, Globe, ExternalLink } from 'lucide-react';
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
  fileNotFound?: boolean;
  isUrl?: boolean;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
}

const POPUP_WIDTH = 450;
const VIEWPORT_PADDING = 8;
const SIDE_PANEL_WIDTH = 280;
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
  fileNotFound,
  isUrl,
  onOpenWebViewer,
  onOpenWebViewerNewTab,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<ProcessedFile | undefined>();
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const [popupWidth, setPopupWidth] = useState(POPUP_WIDTH);
  const pdfZoomHandlerRef = useRef<{
    handleZoom: (delta: number) => void;
    handleReset: () => void;
  } | undefined>(undefined);

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  useEffect(() => {
    const found = files.find(f => {
      const normalizedFileName = fileName.toLowerCase().trim();
      const normalizedFilename = f.name.toLowerCase().trim();
      
      if (normalizedFilename === normalizedFileName) return true;
      
      const fileNameWithoutExt = normalizedFileName.replace(/\.[^.]+$/, '');
      const fNameWithoutExt = normalizedFilename.replace(/\.[^.]+$/, '');
      if (fileNameWithoutExt === fNameWithoutExt) return true;
      
      const fileNameBase = fileNameWithoutExt.replace(/\s*\(\d+\)$/, '');
      const fNameBase = fNameWithoutExt.replace(/\s*\(\d+\)$/, '');
      if (fileNameBase === fNameBase) return true;
      
      if (normalizedFilename.includes(normalizedFileName) || normalizedFileName.includes(normalizedFilename)) return true;
      
      return false;
    });
    
    setFile(found);

    if (found?.type === 'pdf' && location) {
      const match = location.match(/Page\s*(\d+)/i);
      setPdfPageNumber(match ? parseInt(match[1], 10) : 1);
    } else {
      setPdfPageNumber(null);
    }
  }, [fileName, files, location]);

  const calculatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const chatArea = trigger.closest('.max-w-3xl');
    const chatRect = chatArea?.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const popupHeight = popoverRef.current?.offsetHeight || 400;
    const calculatedWidth = Math.min(POPUP_WIDTH, (chatRect?.width || window.innerWidth) - VIEWPORT_PADDING * 2);
    setPopupWidth(calculatedWidth);

    const safeLeft = (chatRect?.left || VIEWPORT_PADDING) + VIEWPORT_PADDING;
    const safeRight = (chatRect?.right || window.innerWidth) - VIEWPORT_PADDING;
    const safeTop = (chatRect?.top || VIEWPORT_PADDING) + VIEWPORT_PADDING;
    const safeBottom = (chatRect?.bottom || window.innerHeight) - VIEWPORT_PADDING;

    let left = isInTable && coords ? coords.left : triggerRect.left - 20;
    let top = isInTable && coords ? coords.top : triggerRect.bottom + 8;

    if (left + calculatedWidth > safeRight) left = safeRight - calculatedWidth;
    if (left < safeLeft) left = safeLeft;
    if (top + popupHeight > safeBottom) top = Math.max(safeTop, triggerRect.top - popupHeight - 8);
    if (top < safeTop) top = safeTop;

    setPosition({ top, left });
  }, [coords, isInTable, triggerRef]);

  useLayoutEffect(() => calculatePosition(), [coords, isInTable, file, pdfPageNumber, calculatePosition]);

  useEffect(() => {
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const popup = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      className="
        fixed z-[9]
        bg-white dark:bg-[#222]
        rounded-lg shadow-2xl
        border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]
        flex flex-col overflow-hidden
      "
      style={{
        width: popupWidth || POPUP_WIDTH,
        maxHeight: MAX_HEIGHT,
        top: position?.top ?? 0,
        left: position?.left ?? 0,
      }}
    >
      {/* Compact Header */}
      <div className="px-2 py-[3px] flex items-center justify-between border-b text-[12px] bg-[rgba(0,0,0,0.02)] dark:bg-[#262626]">
        <div className="flex items-center gap-1 min-w-0">
          {isUrl ? (
            <Globe size={12} className="text-blue-600 shrink-0" />
          ) : (
            <BookOpen size={12} className="text-blue-600 shrink-0" />
          )}
          <span className="truncate font-medium">{isUrl ? new URL(fileName).hostname : fileName}</span>
          <span className="text-[#777] dark:text-[#aaa] truncate">• {location}</span>
        </div>
        <div className="flex gap-0.5">
          {isUrl ? (
            <>
              <button onClick={() => { onOpenWebViewer?.(fileName); onClose(); }} className="p-0.5 hover:text-blue-600" title="Open in web viewer">
                <Maximize2 size={12} />
              </button>
            </>
          ) : (
            <button onClick={onOpenFull} className="p-0.5 hover:text-blue-600" title="Open full view">              <Maximize2 size={12} />
            </button>
          )}
          <button onClick={onClose} className="p-0.5 hover:text-red-500">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isUrl ? (
          <div className="p-4 space-y-3">
            <div className="text-sm">
              <div className="font-semibold text-[#1a1a1a] dark:text-white mb-1">Source</div>
              <a href={fileName} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all flex items-center gap-1">
                {fileName}
                <ExternalLink size={10} />
              </a>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-[#1a1a1a] dark:text-white mb-1">Location</div>
              <div className="text-xs text-[#666] dark:text-[#aaa]">{location}</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-[#1a1a1a] dark:text-white mb-1">Quote</div>
              <div className="text-xs italic text-[#666] dark:text-[#aaa] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] p-2 rounded">"{quote}"</div>
            </div>
          </div>
        ) : isPdfMode && file?.fileHandle ? (
          <PdfPagePreview
            file={file.fileHandle}
            pageNumber={pdfPageNumber}
            quote={quote}
            onScaleChange={setPdfScale}
            zoomHandlerRef={pdfZoomHandlerRef}
          />
        ) : file ? (
          <TextContextViewer file={file} quote={quote} location={location} />
        ) : (
          <div className="p-4 text-center text-[#999]">
            File not found
          </div>
        )}
      </div>

      {/* Compact Footer */}
      <div className="px-2 py-[3px] border-t flex items-center justify-between text-[11px] bg-[rgba(0,0,0,0.02)] dark:bg-[#262626]">
        <span className="italic text-[#777] dark:text-[#aaa] truncate">
          “{quote}”
        </span>

        {isPdfMode && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)}>+</button>
            <span>{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)}>−</button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()}>⟲</button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(popup, document.body);
};

export default CitationPopup;
