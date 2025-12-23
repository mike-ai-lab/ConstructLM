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

const HORIZONTAL_MARGIN = 8; // px margin from viewport edges

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
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined>(undefined);

  // position state: top/left styles (numbers in px) and whether we should use fixed positioning
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    const foundFile = files.find(f => f.name === fileName);
    setFile(foundFile);
    if (foundFile?.type === 'pdf' && location) {
      const pageMatch = location.match(/Page\s*(\d+)/i);
      if (pageMatch) {
        setPdfPageNumber(parseInt(pageMatch[1], 10));
      } else {
        setPdfPageNumber(1);
      }
    } else {
      setPdfPageNumber(null);
    }
  }, [fileName, files, location]);

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

  // Helper: get the nearest positioned offset parent (like element.offsetParent)
  const getOffsetParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    // Use native offsetParent for reliable positioned ancestor
    // fallback to document.body
    return (el.offsetParent as HTMLElement) || document.body;
  };

  // Compute and set position for the popup (keeps it anchored to trigger, clamps left/right)
  const computePosition = () => {
    const trigger = triggerRef.current;
    const popup = popoverRef.current;
    if (!trigger || !popup) {
      setPositionStyle(null);
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Preferred horizontally: center the popup on the trigger's center
    let preferredLeftInViewport = triggerRect.left + triggerRect.width / 2 - popupRect.width / 2;

    // Clamp horizontally to viewport edges with margin
    const minLeft = HORIZONTAL_MARGIN;
    const maxLeft = viewportWidth - popupRect.width - HORIZONTAL_MARGIN;
    let clampedLeftInViewport = Math.min(Math.max(preferredLeftInViewport, minLeft), Math.max(minLeft, maxLeft));

    // Determine vertical placement: prefer below the trigger; if not enough space below, place above.
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const preferBelow = spaceBelow >= Math.min(popupRect.height, Math.max(150, popupRect.height / 2));

    // We'll compute top in viewport coordinates then convert to offsetParent coords if needed
    const verticalMargin = 8;
    let topInViewport: number;
    if (preferBelow) {
      topInViewport = triggerRect.bottom + verticalMargin;
    } else {
      topInViewport = triggerRect.top - popupRect.height - verticalMargin;
      // if placing above would push it too far up, clamp to margin
      if (topInViewport < verticalMargin) topInViewport = verticalMargin;
    }

    // If the popup is meant to be positioned relative to a container (i.e., not using portal),
    // translate viewport coords into the offsetParent's coordinate system so 'position: absolute' will align correctly.
    // We'll detect the offsetParent of the trigger (closest positioned ancestor).
    const anchorOffsetParent = getOffsetParent(trigger);
    if (anchorOffsetParent && anchorOffsetParent !== document.body && anchorOffsetParent !== document.documentElement) {
      const parentRect = anchorOffsetParent.getBoundingClientRect();
      // Convert viewport coordinates to offsetParent's local coords (document scroll is accounted by getBoundingClientRect)
      const leftRelativeToParent = clampedLeftInViewport - parentRect.left + (anchorOffsetParent.scrollLeft || 0);
      const topRelativeToParent = topInViewport - parentRect.top + (anchorOffsetParent.scrollTop || 0);

      setPositionStyle({
        position: 'absolute',
        left: Math.round(leftRelativeToParent),
        top: Math.round(topRelativeToParent),
        // keep max widths consistent with tailwind max-width
        maxWidth: '90vw',
        width: popupRect.width ? undefined : 450,
      });
    } else {
      // No positioned ancestor or parent is body -> use fixed coordinates (will not be clipped by containers)
      setPositionStyle({
        position: 'fixed',
        left: Math.round(clampedLeftInViewport),
        top: Math.round(topInViewport),
        maxWidth: '90vw',
      });
    }
  };

  // Recompute position on layout changes, resize, scroll. Use layout effect so measurement happens after DOM updates.
  useLayoutEffect(() => {
    // initial compute
    computePosition();

    // listeners
    const onResize = () => computePosition();
    const onScroll = () => computePosition();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Also observe changes to the trigger or popup size (use ResizeObserver)
    const ResizeObserverClass = (window as any).ResizeObserver;
    const ro = ResizeObserverClass ? new ResizeObserverClass(() => computePosition()) : null;
    try {
      if (triggerRef.current) ro?.observe(triggerRef.current);
      if (popoverRef.current) ro?.observe(popoverRef.current);
    } catch {
      // ignore; ResizeObserver may not be present in very old browsers
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      try {
        if (triggerRef.current) ro?.unobserve(triggerRef.current);
        if (popoverRef.current) ro?.unobserve(popoverRef.current);
        ro?.disconnect();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef, fileName, isInTable, coords, quote, file, pdfPageNumber]);

  // If the popup was provided explicit coords (isInTable case), we still clamp left/right against viewport
  useEffect(() => {
    if (!isInTable || !coords) return;
    const popup = popoverRef.current;
    if (!popup) return;

    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    let leftInViewport = coords.left;

    // clamp to viewport edges
    const minLeft = HORIZONTAL_MARGIN;
    const maxLeft = viewportWidth - popupRect.width - HORIZONTAL_MARGIN;
    leftInViewport = Math.min(Math.max(leftInViewport, minLeft), Math.max(minLeft, maxLeft));

    setPositionStyle(prev => ({
      ...(prev || {}),
      position: 'fixed',
      left: Math.round(leftInViewport),
      top: Math.round(coords.top),
      maxWidth: '90vw',
    }));
    // Re-run when coords change
  }, [isInTable, coords]);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  const popupContent = (
    <div
      ref={popoverRef}
      className={`z-[40] w-[450px] max-w-[90vw] bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in fade-in duration-150`}
      style={
        // if isInTable and coords were given we use the positionStyle computed above (fixed) otherwise default to computed positionStyle
        isInTable
          ? positionStyle || { position: 'fixed', top: coords?.top ?? 0, left: coords?.left ?? 0, maxHeight: 'min(80vh, 600px)' }
          : positionStyle || { position: 'absolute', top: '100%', left: '-20px', marginTop: '8px', maxHeight: 'min(50vh, 500px)' }
      }
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
      onWheel={e => e.stopPropagation()}
    >
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] px-3 py-1.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <BookOpen size={12} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-xs text-[#1a1a1a] dark:text-white truncate" title={fileName}>
            {fileName}
          </span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">• {location}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onOpenFull}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="Open Full"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white p-1 rounded hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] relative flex-1 overflow-y-auto overscroll-contain" onWheel={e => e.stopPropagation()}>
        {isPdfMode && file?.fileHandle ? (
          <PdfPagePreview file={file.fileHandle} pageNumber={pdfPageNumber as number} quote={quote} onScaleChange={setPdfScale} zoomHandlerRef={pdfZoomHandlerRef} />
        ) : (
          <TextContextViewer file={file} quote={quote} location={location} />
        )}
      </div>

      <div className="bg-white dark:bg-[#2a2a2a] px-2 py-1.5 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex-shrink-0 flex items-center justify-between">
        <p className="text-[12px] text-[#666666] dark:text-[#a0a0a0] italic line-clamp-2 flex-1">"{quote}"</p>
        {isPdfMode && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom In">
              +
            </button>
            <span className="text-[12px] px-1 text-[#666666] dark:text-[#a0a0a0]">{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom Out">
              −
            </button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded text-[12px]" title="Reset">
              ⟲
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Keep original portal behavior only for table mode (keeps existing code paths intact).
  return isInTable ? createPortal(popupContent, document.body) : popupContent;
};

export default CitationPopup;
