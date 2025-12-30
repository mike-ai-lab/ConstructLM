import React, { useState, useRef, useCallback, useEffect, useContext, createContext } from 'react';
import { ProcessedFile } from '../../../types';
import CitationPopup from './CitationPopup';
import { isUrlCitation } from '../utils/citationUtils';

interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
}

const CitationDepthContext = createContext(0);

// Global state to track open citations
let currentOpenCitationId: string | null = null;

const CitationChip: React.FC<CitationChipProps> = ({ index, fileName, location, quote, files, onViewDocument, onOpenWebViewer, onOpenWebViewerNewTab }) => {
  const depth = useContext(CitationDepthContext);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isInTable, setIsInTable] = useState(false);
  const citationId = useRef(`${fileName}-${index}-${Date.now()}`).current;
  const isUrl = isUrlCitation(fileName);
  
  // More robust file matching: case-insensitive and handles partial matches
  const fileExists = isUrl ? true : files.find(f => {
    const normalizedFileName = fileName.toLowerCase().trim();
    const normalizedFilename = f.name.toLowerCase().trim();
    
    // Exact match
    if (normalizedFilename === normalizedFileName) return true;
    
    // Match without extension
    const fileNameWithoutExt = normalizedFileName.replace(/\.[^.]+$/, '');
    const fNameWithoutExt = normalizedFilename.replace(/\.[^.]+$/, '');
    if (fileNameWithoutExt === fNameWithoutExt) return true;
    
    // Handle duplicate suffixes like " (1)", " (2)", etc.
    const fileNameBase = fileNameWithoutExt.replace(/\s*\(\d+\)$/, '');
    const fNameBase = fNameWithoutExt.replace(/\s*\(\d+\)$/, '');
    if (fileNameBase === fNameBase) return true;
    
    // Partial match (citation might have truncated name)
    if (normalizedFilename.includes(normalizedFileName) || normalizedFileName.includes(normalizedFilename)) return true;
    
    return false;
  });
  
  // Debug logging
  if (!isUrl && !fileExists) {
    console.warn(`Citation file not found: "${fileName}". Available files:`, files.map(f => f.name));
  }

  // Register close function when opened
  useEffect(() => {
    if (isOpen) {
      currentOpenCitationId = citationId;
    } else if (currentOpenCitationId === citationId) {
      currentOpenCitationId = null;
    }
  }, [isOpen, citationId]);

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
    
    // If clicking on an already open citation, just close it
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    
    // Close any other open citation via global state
    if (currentOpenCitationId && currentOpenCitationId !== citationId) {
      // Force close by triggering a re-render
      setIsOpen(false);
    }
    
    // Then open this one
    if (triggerRef.current) {
      const tableParent = triggerRef.current.closest('table');
      setIsInTable(!!tableParent);
      updateCoords();
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [isOpen, updateCoords]);

  const handleOpenFull = () => {
    if (isUrl) {
      if (onOpenWebViewer) {
        onOpenWebViewer(fileName);
      } else {
        window.open(fileName, '_blank', 'noopener,noreferrer');
      }
      setIsOpen(false);
      return;
    }
    if (!fileExists) return;
    
    // Find the actual file using the same robust matching
    const actualFile = files.find(f => {
      const normalizedFileName = fileName.toLowerCase().trim();
      const normalizedFilename = f.name.toLowerCase().trim();
      
      if (normalizedFilename === normalizedFileName) return true;
      
      const fileNameWithoutExt = normalizedFileName.replace(/\.[^.]+$/, '');
      const fNameWithoutExt = normalizedFilename.replace(/\.[^.]+$/, '');
      if (fileNameWithoutExt === fNameWithoutExt) return true;
      
      // Handle duplicate suffixes
      const fileNameBase = fileNameWithoutExt.replace(/\s*\(\d+\)$/, '');
      const fNameBase = fNameWithoutExt.replace(/\s*\(\d+\)$/, '');
      if (fileNameBase === fNameBase) return true;
      
      if (normalizedFilename.includes(normalizedFileName) || normalizedFileName.includes(normalizedFilename)) return true;
      
      return false;
    });
    
    if (!actualFile) return;
    
    let page = 1;
    if (location) {
      const pageMatch = location.match(/Page\s*(\d+)/i);
      if (pageMatch) page = parseInt(pageMatch[1], 10);
    }
    onViewDocument(actualFile.name, page, quote, location);
    setIsOpen(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isUrl) return;
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'fixed bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-lg shadow-lg z-[9999] py-1 min-w-[180px]';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    
    const openNewTabOption = document.createElement('button');
    openNewTabOption.textContent = 'Open in New Tab';
    openNewTabOption.className = 'w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 text-[13px] transition-colors';
    openNewTabOption.onclick = () => {
      if (onOpenWebViewerNewTab) {
        onOpenWebViewerNewTab(fileName);
      }
      document.body.removeChild(menu);
    };
    
    const openExternalOption = document.createElement('button');
    openExternalOption.textContent = 'Open in External Browser';
    openExternalOption.className = 'w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 text-[13px] border-t border-black/10 dark:border-white/10 transition-colors';
    openExternalOption.onclick = () => {
      window.open(fileName, '_blank', 'noopener,noreferrer');
      document.body.removeChild(menu);
    };
    
    menu.appendChild(openNewTabOption);
    menu.appendChild(openExternalOption);
    document.body.appendChild(menu);
    
    // Close menu on click outside
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };
    
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  };

  return (
    <span className="inline-block relative">
      <sup
        ref={triggerRef}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        className={`citation-marker ${isUrl ? 'citation-url' : ''}`}
        data-citation-index={index}
        title={isUrl ? `${fileName} - ${location}` : `${fileName} - ${location}`}
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
            isUrl={isUrl}
            onOpenWebViewer={onOpenWebViewer}
            onOpenWebViewerNewTab={onOpenWebViewerNewTab}
          />
        </CitationDepthContext.Provider>
      )}
    </span>
  );
};

export { CitationDepthContext };
export default CitationChip;
