# Citation Components - Reusable Code Snippets

This document contains clean, reusable code snippets for the citation chip and popup components. You can integrate these into any application and customize the styling.

## Table of Contents
1. [Core Types](#core-types)
2. [Citation Chip Component](#citation-chip-component)
3. [Citation Popup Component](#citation-popup-component)
4. [Utility Functions](#utility-functions)
5. [Styling Guide](#styling-guide)
6. [Usage Example](#usage-example)

---

## Core Types

```typescript
// types.ts
export interface ProcessedFile {
  name: string;
  type: 'pdf' | 'excel' | 'csv' | 'markdown' | 'text' | string;
  content?: string;
  fileHandle?: File;
}

export interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
}

export interface CitationPopupProps {
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
```

---

## Citation Chip Component

The clickable citation chip that appears inline in text.

```typescript
// CitationChip.tsx
import React, { useState, useRef, useCallback, useEffect, useContext, createContext } from 'react';

// Context to prevent nested citations
const CitationDepthContext = createContext(0);

// Global state to track open citations (only one open at a time)
let currentOpenCitationId: string | null = null;

const CitationChip: React.FC<CitationChipProps> = ({ 
  index, 
  fileName, 
  location, 
  quote, 
  files, 
  onViewDocument, 
  onOpenWebViewer, 
  onOpenWebViewerNewTab 
}) => {
  const depth = useContext(CitationDepthContext);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isInTable, setIsInTable] = useState(false);
  const citationId = useRef(`${fileName}-${index}-${Date.now()}`).current;
  
  // Check if citation is a URL
  const isUrl = fileName.startsWith('http://') || fileName.startsWith('https://');
  
  // Find matching file (case-insensitive, handles duplicates)
  const fileExists = isUrl ? true : files.find(f => {
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

  // Register/unregister when opened/closed
  useEffect(() => {
    if (isOpen) {
      currentOpenCitationId = citationId;
    } else if (currentOpenCitationId === citationId) {
      currentOpenCitationId = null;
    }
  }, [isOpen, citationId]);

  // Prevent nested citation popups beyond depth 1
  if (depth > 0) {
    const cleanQuote = quote.replace(/^['"`]+|['"`]+$/g, '').trim();
    const displayText = cleanQuote || `Citation ${index + 1}`;
    return (
      <span
        className="citation-text cursor-not-allowed opacity-50 underline decoration-dotted underline-offset-2"
        data-citation-index={index}
        title="Citation preview disabled in nested view"
      >
        {displayText}
      </span>
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
    
    // Close any other open citation
    if (currentOpenCitationId && currentOpenCitationId !== citationId) {
      setIsOpen(false);
    }
    
    // Open this one
    if (triggerRef.current) {
      const tableParent = triggerRef.current.closest('table');
      setIsInTable(!!tableParent);
      updateCoords();
    }
    setIsOpen(true);
  };

  // Update position on scroll
  useEffect(() => {
    if (!isOpen) return;
    
    let rafId: number;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateCoords);
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll, true);
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
    
    // Find the actual file
    const actualFile = files.find(f => {
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
    
    if (!actualFile) return;
    
    // Extract page number from location
    let page = 1;
    if (location) {
      const pageMatch = location.match(/Page\s*(\d+)/i);
      if (pageMatch) page = parseInt(pageMatch[1], 10);
    }
    
    onViewDocument(actualFile.name, page, quote, location);
    setIsOpen(false);
  };

  // Right-click context menu for URLs
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

  // Clean the quote text
  const cleanQuote = quote.replace(/^['"`]+|['"`]+$/g, '').trim();
  const displayText = cleanQuote.includes(',') 
    ? cleanQuote.split(',')[0].trim() 
    : (cleanQuote || `Citation ${index + 1}`);

  return (
    <span className="inline-block relative">
      <span
        ref={triggerRef}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        className={`citation-text cursor-pointer underline decoration-dotted underline-offset-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors ${isUrl ? 'citation-url' : ''}`}
        data-citation-index={index}
        title={isUrl ? `${fileName} - ${location}` : `${fileName} - ${location}`}
        aria-expanded={isOpen}
        role="button"
      >
        {displayText}
      </span>
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
```

---

## Citation Popup Component

The floating popup window that appears when clicking a citation chip.

```typescript
// CitationPopup.tsx
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, Maximize2, Globe } from 'lucide-react';

const POPUP_WIDTH = 450;
const VIEWPORT_PADDING = 8;
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
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<ProcessedFile | undefined>();
  const [popupWidth, setPopupWidth] = useState(POPUP_WIDTH);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Find matching file
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
  }, [fileName, files]);

  // Calculate popup position
  const calculatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const chatArea = trigger.closest('.max-w-3xl');
    const chatRect = chatArea?.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const popupHeight = 400;
    const calculatedWidth = Math.min(POPUP_WIDTH, (chatRect?.width || window.innerWidth) - VIEWPORT_PADDING * 2);
    setPopupWidth(calculatedWidth);

    const safeLeft = (chatRect?.left || VIEWPORT_PADDING) + VIEWPORT_PADDING;
    const safeRight = (chatRect?.right || window.innerWidth) - VIEWPORT_PADDING;
    const safeTop = (chatRect?.top || VIEWPORT_PADDING) + VIEWPORT_PADDING;
    const safeBottom = (chatRect?.bottom || window.innerHeight) - VIEWPORT_PADDING;

    let left = isInTable && coords ? coords.left : triggerRect.left - 20;
    let top = isInTable && coords ? coords.top : triggerRect.bottom + 8;

    // Keep within bounds
    if (left + calculatedWidth > safeRight) left = safeRight - calculatedWidth;
    if (left < safeLeft) left = safeLeft;
    if (top + popupHeight > safeBottom) top = Math.max(safeTop, triggerRect.top - popupHeight - 8);
    if (top < safeTop) top = safeTop;

    setPosition({ top, left });
  }, [coords, isInTable, triggerRef]);

  // Initial position calculation
  useLayoutEffect(() => {
    if (position === null) calculatePosition();
  }, [coords, isInTable, file, calculatePosition, position]);

  // Update position on resize/scroll
  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculatePosition);
    };
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculatePosition);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [calculatePosition]);

  // Close on click outside
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
        fixed z-[9999]
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
      {/* Header */}
      <div className="px-2 py-[3px] flex items-center justify-between border-b text-[12px] bg-[rgba(0,0,0,0.02)] dark:bg-[#262626]">
        <div className="flex items-center gap-1 min-w-0">
          {isUrl ? (
            <Globe size={12} className="text-blue-600 shrink-0" />
          ) : (
            <BookOpen size={12} className="text-blue-600 shrink-0" />
          )}
          <span className="truncate font-medium">
            {isUrl ? new URL(fileName).hostname : fileName}
          </span>
          <span className="text-[#777] dark:text-[#aaa] truncate">• {location}</span>
        </div>
        <div className="flex gap-0.5">
          <button 
            onClick={onOpenFull} 
            className="p-0.5 hover:text-blue-600" 
            title="Open full view"
          >
            <Maximize2 size={12} />
          </button>
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
              <a 
                href={fileName} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
              >
                {fileName}
              </a>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-[#1a1a1a] dark:text-white mb-1">Location</div>
              <div className="text-xs text-[#666] dark:text-[#aaa]">{location}</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-[#1a1a1a] dark:text-white mb-1">Quote</div>
              <div className="text-xs italic text-[#666] dark:text-[#aaa] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] p-2 rounded">
                "{quote}"
              </div>
            </div>
          </div>
        ) : file ? (
          <div className="p-4">
            {/* Add your custom content viewer here */}
            <div className="text-sm text-[#666] dark:text-[#aaa]">
              <div className="font-semibold mb-2">{location}</div>
              <div className="italic bg-yellow-100 dark:bg-yellow-600/40 p-2 rounded">
                "{quote}"
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-[#999]">
            File not found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-[3px] border-t flex items-center justify-between text-[11px] bg-[rgba(0,0,0,0.02)] dark:bg-[#262626]">
        <span className="italic text-[#777] dark:text-[#aaa] truncate">
          "{quote}"
        </span>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
};

export default CitationPopup;
```

---

## Utility Functions

```typescript
// citationUtils.ts

// Regex patterns for parsing citations
export const SPLIT_REGEX = /((?:\{\{|【)citation:[^}】]*(?:\}\}|】))/g;
export const MATCH_REGEX = /(?:\{\{|【)citation:([^|]*?)\|([^|]*?)\|([^}】]*?)(?:\}\}|】)/s;

// Citation counter for numbering
let citationCounter = 0;

export const resetCitationCounter = () => { 
  citationCounter = 0; 
};

export const incrementCitationCounter = () => {
  citationCounter++;
  return citationCounter - 1;
};

export const getCitationCounter = () => citationCounter;

// Check if citation source is a URL
export const isUrlCitation = (source: string): boolean => {
  return source.startsWith('http://') || source.startsWith('https://');
};

// Extract all source files from text containing citations
export const extractSourceFiles = (text: string): Set<string> => {
  const citationMatches = text.match(/(?:\{\{|【)citation:[^}】]+(?:\}\}|】)/g) || [];
  const sourceFiles = new Set<string>();
  
  citationMatches.forEach((citation: string) => {
    const match = citation.match(MATCH_REGEX);
    if (match) {
      sourceFiles.add(match[1].trim());
    }
  });
  
  return sourceFiles;
};
```

---

## Styling Guide

### Required Tailwind Classes

The components use Tailwind CSS. Here are the key styling patterns:

**Citation Chip:**
- `text-blue-600 dark:text-blue-400` - Link color
- `underline decoration-dotted underline-offset-2` - Underline style
- `hover:text-blue-800 dark:hover:text-blue-300` - Hover state

**Citation Popup:**
- `fixed z-[9999]` - Positioning
- `bg-white dark:bg-[#222]` - Background
- `rounded-lg shadow-2xl` - Shape and shadow
- `border border-[rgba(0,0,0,0.15)]` - Border

### Custom CSS (Optional)

```css
/* citation-styles.css */

/* Smooth transitions */
.citation-text {
  transition: color 0.2s ease, opacity 0.2s ease;
}

/* Highlight effect */
.highlight-target {
  animation: pulse-highlight 1s ease-in-out;
}

@keyframes pulse-highlight {
  0%, 100% { background-color: rgb(253 224 71); }
  50% { background-color: rgb(254 240 138); }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .highlight-target {
    background-color: rgb(161 98 7 / 0.4);
  }
}
```

---

## Usage Example

```typescript
// App.tsx or your main component
import React, { useState } from 'react';
import CitationChip from './CitationChip';

function App() {
  const [files] = useState<ProcessedFile[]>([
    {
      name: 'document.pdf',
      type: 'pdf',
      content: 'Sample content...',
    }
  ]);

  const handleViewDocument = (fileName: string, page?: number, quote?: string, location?: string) => {
    console.log('Opening document:', { fileName, page, quote, location });
    // Implement your document viewer logic here
  };

  const handleOpenWebViewer = (url: string) => {
    console.log('Opening URL:', url);
    // Implement your web viewer logic here
  };

  return (
    <div className="p-4">
      <p>
        This is some text with a{' '}
        <CitationChip
          index={0}
          fileName="document.pdf"
          location="Page 5"
          quote="important information"
          files={files}
          onViewDocument={handleViewDocument}
          onOpenWebViewer={handleOpenWebViewer}
        />{' '}
        citation.
      </p>
    </div>
  );
}

export default App;
```

### Parsing Citations from Text

```typescript
// Parse text with citation markers
function parseCitationsInText(text: string, files: ProcessedFile[]) {
  const parts = text.split(SPLIT_REGEX);
  let citationIndex = 0;
  
  return parts.map((part, idx) => {
    const match = part.match(MATCH_REGEX);
    if (match) {
      const [, fileName, location, quote] = match;
      return (
        <CitationChip
          key={idx}
          index={citationIndex++}
          fileName={fileName.trim()}
          location={location.trim()}
          quote={quote.trim()}
          files={files}
          onViewDocument={handleViewDocument}
          onOpenWebViewer={handleOpenWebViewer}
        />
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// Usage
const textWithCitations = "This is text {{citation:document.pdf|Page 5|important quote}} with citations.";
const rendered = parseCitationsInText(textWithCitations, files);
```

---

## Customization Tips

### 1. Change Colors
Replace `text-blue-600` with your brand color:
```typescript
className="text-purple-600 dark:text-purple-400"
```

### 2. Adjust Popup Size
Modify the constants:
```typescript
const POPUP_WIDTH = 500; // Wider popup
const MAX_HEIGHT = 'min(50vh, 500px)'; // Taller popup
```

### 3. Custom Icons
Replace Lucide icons with your own:
```typescript
import { YourIcon } from 'your-icon-library';
<YourIcon size={12} />
```

### 4. Add Animation
```typescript
className="transition-all duration-200 hover:scale-105"
```

### 5. Custom Content Viewer
Replace the content section in `CitationPopup` with your own viewer component.

---

## Dependencies

Required packages:
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "lucide-react": "^0.263.1"
}
```

Optional (for PDF support):
```json
{
  "pdfjs-dist": "^3.11.174"
}
```

---

## Notes

- The components use React portals to render popups outside the DOM hierarchy
- Only one citation popup can be open at a time (managed via global state)
- Nested citations are prevented (depth tracking via Context)
- Position updates automatically on scroll/resize
- Supports both file citations and URL citations
- Dark mode support via Tailwind's `dark:` prefix
- Fully accessible with ARIA attributes

---

## License

These components are extracted from ConstructLM and can be freely used and modified for your projects.
