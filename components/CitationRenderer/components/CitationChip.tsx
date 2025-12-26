import React, { useState, useRef, useCallback, useEffect, useContext, createContext } from 'react';
import { ProcessedFile } from '../../../types';
import CitationPopup from './CitationPopup';

interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const CitationDepthContext = createContext(0);

const CitationChip: React.FC<CitationChipProps> = ({ index, fileName, location, quote, files, onViewDocument }) => {
  const depth = useContext(CitationDepthContext);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isInTable, setIsInTable] = useState(false);
  const fileExists = files.find(f => f.name === fileName);

  // Prevent nested citation popups beyond depth 1
  if (depth > 0) {
    return (
      <sup
        className="citation-marker cursor-not-allowed opacity-50"
        data-citation-index={index}
        title="Citation preview disabled in nested view"
      >
        {index + 1}
      </sup>
    );
  }

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left - 20 });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const tableParent = triggerRef.current.closest('table');
      setIsInTable(!!tableParent);
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen || !isInTable) return;
    
    let rafId: number;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateCoords);
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, isInTable, updateCoords]);

  const handleOpenFull = () => {
    if (!fileExists) return;
    let page = 1;
    if (location) {
      const pageMatch = location.match(/Page\s*(\d+)/i);
      if (pageMatch) page = parseInt(pageMatch[1], 10);
    }
    onViewDocument(fileName, page, quote, location);
    setIsOpen(false);
  };

  return (
    <span className="inline-block relative">
      <sup
        ref={triggerRef}
        onClick={handleToggle}
        className="citation-marker"
        data-citation-index={index}
        title={`${fileName} - ${location}`}
        aria-expanded={isOpen}
        role="button"
      >
        {index + 1}
      </sup>
      {isOpen && (
        <CitationDepthContext.Provider value={depth + 1}>
          <CitationPopup
            onClose={() => setIsOpen(false)}
            fileName={fileName}
            location={location}
            quote={quote}
            files={files}
            triggerRef={triggerRef}
            onOpenFull={handleOpenFull}
            isInTable={isInTable}
            coords={coords}
            fileNotFound={!fileExists}
          />
        </CitationDepthContext.Provider>
      )}
    </span>
  );
};

export { CitationDepthContext };
export default CitationChip;
