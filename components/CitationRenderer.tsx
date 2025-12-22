import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronRight, Quote, X, Maximize2, Loader2, ChevronDown } from 'lucide-react';
import { ProcessedFile } from '../types';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const SPLIT_REGEX = /((?:\{\{|【)citation:[^}】]*(?:\}\}|】))/g;
const MATCH_REGEX = /(?:\{\{|【)citation:([^|]*?)\|([^|]*?)\|([^}】]*?)(?:\}\}|】)/s;

let citationCounter = 0;
const resetCitationCounter = () => { citationCounter = 0; };

// --- HELPER: Handle Table Splitting with Citations ---
const safeSplitTableLine = (line: string): string[] => {
  const placeholders: string[] = [];
  const citationRegex = /(?:\{\{|【)citation:[^}】]+(?:\}\}|】)/g;
  
  const maskedLine = line.replace(citationRegex, (match) => {
    placeholders.push(match);
    return `__CITATION_MASK_${placeholders.length - 1}__`;
  });

  return maskedLine
    .split('|')
    .filter(cell => cell.trim())
    .map(cell => {
      return cell.trim().replace(/__CITATION_MASK_(\d+)__/g, (_, index) => {
        return placeholders[parseInt(index, 10)];
      });
    });
};

// --- INLINE MARKDOWN HELPERS ---
const parseInline = (text: string): React.ReactNode[] => {
  // Handle bold (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-[#1a1a1a] dark:text-white">{part.slice(2, -2)}</strong>;
    }
    // Handle italic (*text*) - but not ** which is already handled
    const italicParts = part.split(/((?<!\*)\*(?!\*)[^\s*].*?(?<!\*)\*(?!\*))/g);
    return italicParts.map((sub, subIdx) => {
      if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2 && !sub.startsWith('**')) {
        return <em key={`${index}-${subIdx}`} className="italic text-[#1a1a1a] dark:text-white">{sub.slice(1, -1)}</em>;
      }
      // Handle inline code (`code`)
      const codeParts = sub.split(/(`[^`]+`)/g);
      return codeParts.map((code, codeIdx) => {
        if (code.startsWith('`') && code.endsWith('`')) {
          return <code key={`${index}-${subIdx}-${codeIdx}`} className="px-1.5 py-0.5 bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] rounded text-[13px] font-mono text-[#1a1a1a] dark:text-white">{code.slice(1, -1)}</code>;
        }
        return code;
      });
    }).flat();
  }).flat();
};

const SimpleMarkdown: React.FC<{ text: string; block?: boolean; files?: ProcessedFile[]; onViewDocument?: (fileName: string, page?: number, quote?: string, location?: string) => void }> = ({ text, block = true, files, onViewDocument }) => {
  // Normalize incoming <br> to newline
  const processedText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = processedText.split('\n');

  // Build elements; for inline mode we'll collect children into a single span and
  // use <br/> for empty lines to preserve breaks without forcing block-level wrappers.
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection (always block-level)
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]+\|$/)) {
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      
      const delimiter = tableLines[0].includes('\t') ? '\t' : ',';
      const headers = safeSplitTableLine(tableLines[0]);
      
      const tableEl = (
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] text-xs">
            <thead className="bg-gray-100 dark:bg-[#2a2a2a] sticky top-0 z-10">
              <tr>
                {headers.map((cell, idx) => (
                  <th key={idx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1 text-left font-semibold text-[#1a1a1a] dark:text-white bg-gray-100 dark:bg-[#2a2a2a]">
                    {files && onViewDocument ? <TableCellWithCitations text={cell} files={files} onViewDocument={onViewDocument} /> : cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLines.slice(2).map((row, rowIdx) => {
                const cells = safeSplitTableLine(row);
                return (
                  <tr key={rowIdx} className="hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]">
                    {cells.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1">
                        {files && onViewDocument ? <TableCellWithCitations text={cell} files={files} onViewDocument={onViewDocument} /> : cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      elements.push(tableEl);
      i = j;
      continue;
    }

    if (!trimmed) {
      // blank line -> either spacer (block) or <br/> (inline)
      elements.push(block ? <div key={`blank-${i}`} className="h-2" /> : <br key={`br-${i}`} />);
      i++;
      continue;
    }

    if (trimmed.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)]" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      const h4 = <h4 key={`h4-${i}`} className="text-sm font-semibold text-[#1a1a1a] dark:text-white mt-2 mb-1">{parseInline(trimmed.slice(5))}</h4>;
      elements.push(h4);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const h3 = <h3 key={`h3-${i}`} className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white mt-3 mb-1.5">{parseInline(trimmed.slice(4))}</h3>;
      elements.push(h3);
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const h2 = <h2 key={`h2-${i}`} className="text-base font-bold text-[#1a1a1a] dark:text-white mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>;
      elements.push(h2);
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      const h1 = <h1 key={`h1-${i}`} className="text-lg font-bold text-[#1a1a1a] dark:text-white mt-5 mb-2.5">{parseInline(trimmed.slice(2))}</h1>;
      elements.push(h1);
      i++;
      continue;
    }

    if (trimmed.match(/^[-*]\s/)) {
      const content = trimmed.replace(/^[-*]\s/, '');
      const parts = content.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
      const contentElements = parts.map((part, partIdx) => {
        const citMatch = part.match(MATCH_REGEX);
        if (citMatch) {
          citationCounter++;
          return (
            <CitationChip
              key={`li-cit-${i}-${partIdx}`}
              index={citationCounter - 1}
              fileName={citMatch[1].trim()}
              location={citMatch[2].trim()}
              quote={citMatch[3].trim()}
              files={files || []}
              onViewDocument={onViewDocument || (() => {})}
            />
          );
        }
        return <span key={`li-txt-${i}-${partIdx}`}>{parseInline(part)}</span>;
      });
      elements.push(
        <div key={`li-${i}`} className="flex gap-2.5 ml-0 my-1">
          <span className="text-[#666666] dark:text-[#a0a0a0] mt-1.5 flex-shrink-0">•</span>
          <span className="leading-7 flex-1">{contentElements}</span>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      const match = trimmed.match(/^(\d+)\.\s/);
      const num = match ? match[1] : '1';
      const content = trimmed.replace(/^\d+\.\s/, '');
      const parts = content.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
      const contentElements = parts.map((part, partIdx) => {
        const citMatch = part.match(MATCH_REGEX);
        if (citMatch) {
          citationCounter++;
          return (
            <CitationChip
              key={`ol-cit-${i}-${partIdx}`}
              index={citationCounter - 1}
              fileName={citMatch[1].trim()}
              location={citMatch[2].trim()}
              quote={citMatch[3].trim()}
              files={files || []}
              onViewDocument={onViewDocument || (() => {})}
            />
          );
        }
        return <span key={`ol-txt-${i}-${partIdx}`}>{parseInline(part)}</span>;
      });
      elements.push(
        <div key={`ol-${i}`} className="flex gap-2.5 ml-0 my-1">
          <span className="font-medium text-[#666666] dark:text-[#a0a0a0] mt-0.5 min-w-[1.5em] flex-shrink-0">{num}.</span>
          <span className="leading-7 flex-1">{contentElements}</span>
        </div>
      );
      i++;
      continue;
    }

    // Code blocks (```)
    if (trimmed.startsWith('```')) {
      const codeLines = [trimmed.slice(3)];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) j++; // Skip closing ```
      
      const codeContent = codeLines.join('\n').trim();
      elements.push(
        <pre key={`code-${i}`} className="bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] rounded-lg p-3 my-2 overflow-x-auto">
          <code className="text-[13px] font-mono text-[#1a1a1a] dark:text-white">{codeContent}</code>
        </pre>
      );
      i = j;
      continue;
    }

    // Normal paragraph/line - handle citations
    const lineContent = lines[i];
    const lineParts = lineContent.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
    const lineElements = lineParts.map((part, partIdx) => {
      const citMatch = part.match(MATCH_REGEX);
      if (citMatch) {
        citationCounter++;
        const fileName = citMatch[1].trim();
        const location = citMatch[2].trim();
        const quote = citMatch[3].trim();
        return (
          <CitationChip
            key={`line-cit-${i}-${partIdx}`}
            index={citationCounter - 1}
            fileName={fileName}
            location={location}
            quote={quote}
            files={files || []}
            onViewDocument={onViewDocument || (() => {})}
          />
        );
      }
      return <span key={`line-txt-${i}-${partIdx}`}>{parseInline(part)}</span>;
    });
    
    if (block) {
      elements.push(<div key={`p-${i}`} className="leading-7 my-1">{lineElements}</div>);
    } else {
      elements.push(<span key={`span-${i}`} className="leading-7">{lineElements}</span>);
    }
    i++;
  }

  if (block) {
    return <div className="space-y-2 text-[#1a1a1a] dark:text-white">{elements}</div>;
  } else {
    // Inline: wrap all children in a single span so they flow inline
    return <span className="text-[#1a1a1a] dark:text-white leading-7">{elements}</span>;
  }
};

// --- THINKING BLOCK COMPONENT ---
const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc] transition-colors mb-2"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs italic">Model Reasoning</span>
      </button>
      {isExpanded && (
        <div className="border-l-2 border-[#cccccc] dark:border-[#444444] pl-4 italic text-[#666666] dark:text-[#a0a0a0] text-sm">
          <SimpleMarkdown text={content} block={true} />
        </div>
      )}
    </div>
  );
};

// --- MAIN CITATION RENDERER ---
const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument }) => {
  if (!text) return null;
  resetCitationCounter();

  // Decode HTML entities first
  let decodedText = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  
  // Extract thinking blocks
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkingBlocks: { content: string; index: number }[] = [];
  let match;
  let textWithoutThinking = decodedText;
  
  while ((match = thinkRegex.exec(decodedText)) !== null) {
    thinkingBlocks.push({ content: match[1].trim(), index: match.index });
  }
  
  // Remove thinking blocks from text
  textWithoutThinking = decodedText.replace(thinkRegex, '');
  
  // Remove newlines around citations to keep them inline
  const cleanedText = textWithoutThinking.replace(/\n*((?:\{\{|【)citation:[^}】]+(?:\}\}|】))\n*/g, '$1');

  // Extract unique source files from citations
  const citationMatches = cleanedText.match(/(?:\{\{|【)citation:[^}】]+(?:\}\}|】)/g) || [];
  const sourceFiles = new Set<string>();
  
  citationMatches.forEach((citation: string) => {
    const match = citation.match(MATCH_REGEX);
    if (match) {
      sourceFiles.add(match[1].trim());
    }
  });

  return (
    <div className="text-sm leading-relaxed">
      {thinkingBlocks.map((block, idx) => (
        <ThinkingBlock key={`think-${idx}`} content={block.content} />
      ))}
      <SimpleMarkdown text={cleanedText} block={true} files={files} onViewDocument={onViewDocument} />
      {sourceFiles.size > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]">
          <div className="text-xs text-[#666666] dark:text-[#a0a0a0] flex items-center gap-2">
            <span className="font-medium">Sources:</span>
            {Array.from(sourceFiles).map((fileName, idx) => (
              <span key={fileName} className="inline-flex items-center">
                {idx > 0 && <span className="mx-1">•</span>}
                <span className="font-mono">{fileName}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const parseCSVLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
          inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
          cells.push(current);
          current = '';
      } else {
          current += char;
      }
  }
  cells.push(current);
  return cells;
};

// Helper component to render table cells with citations
const TableCellWithCitations: React.FC<{ text: string; files: ProcessedFile[]; onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void }> = ({ text, files, onViewDocument }) => {
  let decodedText = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const parts = decodedText.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
  
  return (
    <span className="inline">
      {parts.map((part, index) => {
        const match = part.match(MATCH_REGEX);
        if (match) {
          citationCounter++;
          const fileName = match[1].trim();
          const location = match[2].trim();
          const quote = match[3].trim();
          return (
            <CitationChip
              key={`cell-cit-${index}-${citationCounter}`}
              index={citationCounter - 1}
              fileName={fileName}
              location={location}
              quote={quote}
              files={files}
              onViewDocument={onViewDocument}
            />
          );
        }
        return <span key={`cell-txt-${index}`} className="inline">{part}</span>;
      })}
    </span>
  );
};

// --- CITATION CHIP & PORTAL ---
interface CitationChipProps {
  index: number;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const CitationChip: React.FC<CitationChipProps> = ({ index, fileName, location, quote, files, onViewDocument }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isInTable, setIsInTable] = useState(false);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popupHeight = Math.min(viewportHeight * 0.6, 600);
      const popupWidth = Math.min(viewportWidth * 0.9, 450);
      
      let top = rect.bottom + 8;
      let left = rect.left - 20;
      
      // Adjust if overflows bottom
      if (top + popupHeight > viewportHeight) {
        top = Math.max(10, rect.top - popupHeight - 8);
      }
      
      // Adjust if overflows right
      if (left + popupWidth > viewportWidth) {
        left = viewportWidth - popupWidth - 10;
      }
      
      // Adjust if overflows left
      if (left < 10) {
        left = 10;
      }
      
      setCoords({ top, left });
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
        isInTable ? (
          <CitationPortal
            onClose={() => setIsOpen(false)}
            coords={coords}
            fileName={fileName}
            location={location}
            quote={quote}
            files={files}
            triggerRef={triggerRef}
            onOpenFull={() => {
              let page = 1;
              if (location) {
                const pageMatch = location.match(/Page\s*(\d+)/i);
                if (pageMatch) page = parseInt(pageMatch[1], 10);
              }
              onViewDocument(fileName, page, quote, location);
              setIsOpen(false);
            }}
          />
        ) : (
          <CitationPopup
            onClose={() => setIsOpen(false)}
            fileName={fileName}
            location={location}
            quote={quote}
            files={files}
            triggerRef={triggerRef}
            onOpenFull={() => {
              let page = 1;
              if (location) {
                const pageMatch = location.match(/Page\s*(\d+)/i);
                if (pageMatch) page = parseInt(pageMatch[1], 10);
              }
              onViewDocument(fileName, page, quote, location);
              setIsOpen(false);
            }}
          />
        )
      )}
    </span>
  );
};

interface CitationPortalProps {
  onClose: () => void;
  coords: { top: number; left: number };
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  triggerRef: React.RefObject<HTMLSpanElement>;
  onOpenFull: () => void;
}

const CitationPortal: React.FC<CitationPortalProps> = ({ onClose, coords, fileName, location, quote, files, triggerRef, onOpenFull }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined>(undefined);

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
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[10000] w-[450px] max-w-[90vw] bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in fade-in duration-150"
      style={{ top: coords.top, left: coords.left, maxHeight: 'min(40vh, 400px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] px-3 py-1.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <BookOpen size={12} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-xs text-[#1a1a1a] dark:text-white truncate" title={fileName}>{fileName}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">• {location}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onOpenFull} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Open Full"><Maximize2 size={12} /></button>
          <button onClick={onClose} className="text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white p-1 rounded hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"><X size={12} /></button>
        </div>
      </div>
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] relative flex-1 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
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
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom In">+</button>
            <span className="text-[12px] px-1 text-[#666666] dark:text-[#a0a0a0]">{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom Out">−</button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded text-[12px]" title="Reset">⟲</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

interface CitationPopupProps {
  onClose: () => void;
  fileName: string;
  location: string;
  quote: string;
  files: ProcessedFile[];
  triggerRef: React.RefObject<HTMLSpanElement>;
  onOpenFull: () => void;
}

const CitationPopup: React.FC<CitationPopupProps> = ({ onClose, fileName, location, quote, files, triggerRef, onOpenFull }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<ProcessedFile | undefined>(undefined);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfZoomHandlerRef = useRef<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined>(undefined);

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
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const isPdfMode = file?.type === 'pdf' && pdfPageNumber !== null;

  return (
    <div
      ref={popoverRef}
      className="absolute z-[150] w-[450px] max-w-[90vw] bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in fade-in duration-150"
      style={{ 
        top: '100%', 
        left: '-20px', 
        marginTop: '8px',
        maxHeight: 'min(40vh, 400px)'
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Citation for ${fileName}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] px-3 py-1.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <BookOpen size={12} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-xs text-[#1a1a1a] dark:text-white truncate" title={fileName}>{fileName}</span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">• {location}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onOpenFull} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Open Full"><Maximize2 size={12} /></button>
          <button onClick={onClose} className="text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white p-1 rounded hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"><X size={12} /></button>
        </div>
      </div>
      <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] relative flex-1 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
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
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom In">+</button>
            <span className="text-[12px] px-1 text-[#666666] dark:text-[#a0a0a0]">{Math.round(pdfScale * 100)}%</span>
            <button onClick={() => pdfZoomHandlerRef.current?.handleZoom(-0.2)} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded" title="Zoom Out">−</button>
            <button onClick={() => pdfZoomHandlerRef.current?.handleReset()} className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222] rounded text-[12px]" title="Reset">⟲</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- PDF PREVIEW (unchanged logic) ---
const PdfPagePreview: React.FC<{ file: File; pageNumber: number; quote?: string; onScaleChange: (scale: number) => void; zoomHandlerRef: React.MutableRefObject<{ handleZoom: (delta: number) => void; handleReset: () => void } | undefined> }> = ({ file, pageNumber, quote, onScaleChange, zoomHandlerRef }) => {
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

        if (quote) {
          const textContent = await page.getTextContent();
          renderHighlights(textContent, viewport, quote);
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
    const scaleFactor = 10;

    if (matchIndex !== -1) {
      const matchEnd = matchIndex + normQuote.length;
      itemMap.forEach(({ start, end, item }) => {
        if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
          if (!window.pdfjsLib.Util) return;

          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]) / scaleFactor;
          const fontWidth = item.width * viewport.scale / scaleFactor;
          const angle = Math.atan2(tx[1], tx[0]);

          const rect = document.createElement('div');
          Object.assign(rect.style, {
            position: 'absolute',
            left: `${tx[4] / scaleFactor}px`,
            top: `${(tx[5] - Math.hypot(tx[2], tx[3])) / scaleFactor}px`,
            width: `${fontWidth}px`,
            height: `${fontHeight}px`,
            backgroundColor: 'rgba(255, 235, 59, 0.4)',
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            transform: `rotate(${angle}rad)`,
            transformOrigin: '0% 100%'
          });
          highlightLayerRef.current?.appendChild(rect);
        }
      });
    } else {
      console.warn("[CitationPreview] Quote not found in text content");
    }
  };

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

// --- TEXT CONTEXT VIEWER ---
const TextContextViewer: React.FC<{ file?: ProcessedFile; quote: string; location: string }> = ({ file, quote, location }) => {
  const tableRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const scrollToRow = () => {
      if (tableRef.current) {
        const highlightedRow = tableRef.current.querySelector('.highlighted-row');
        if (highlightedRow) {
          highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
      }
      return false;
    };
    
    if (!scrollToRow()) {
      setTimeout(scrollToRow, 100);
    }
  }, [file, location]);
  
  if (file?.type === 'excel' && location) {
    const rowMatch = location.match(/Row\s*(\d+)/i);
    const sheetMatch = location.match(/Sheet:\s*([^,]+)/i);
    
    if (rowMatch && file.content) {
      const targetRowNum = parseInt(rowMatch[1], 10);
      const sheetName = sheetMatch ? sheetMatch[1].trim() : null;
      const lines = file.content.split('\n');
      
      let sheetStartIdx = 0;
      if (sheetName) {
        const sheetHeaderIdx = lines.findIndex(l => l.includes(`[Sheet: ${sheetName}]`));
        if (sheetHeaderIdx >= 0) sheetStartIdx = sheetHeaderIdx + 1;
      }
      
      const headerLine = lines[sheetStartIdx];
      const delimiter = headerLine?.includes('\t') ? '\t' : ',';
      
      const parseCSVLine = (line: string) => {
          const cells: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                  inQuotes = !inQuotes;
              } else if (char === delimiter && !inQuotes) {
                  cells.push(current.trim());
                  current = '';
              } else {
                  current += char;
              }
          }
          cells.push(current.trim());
          return cells;
      };
      
      const headers = parseCSVLine(headerLine || '');
      const dataLines = lines.slice(sheetStartIdx + 1).filter(l => l && !l.includes('[META:') && !l.includes('---') && !l.includes('[Sheet:'));
      const rows = dataLines.map(line => parseCSVLine(line));
      
      return (
    <div ref={tableRef} className="overflow-auto p-2" style={{ maxHeight: '400px' }} onWheel={(e) => e.stopPropagation()}>
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-[#2a2a2a] z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1.5 text-left font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap bg-gray-100 dark:bg-[#2a2a2a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={`${rowIdx + 2 === targetRowNum ? 'highlighted-row bg-yellow-100 dark:bg-yellow-600/40' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]'}`}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1.5 text-[#1a1a1a] dark:text-white">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm leading-relaxed text-[#666666] dark:text-[#a0a0a0] bg-white dark:bg-[#2a2a2a] p-4 rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] font-serif shadow-sm">
        <div className="mb-2 text-[12px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{location || "Excerpt"}</div>
        <span className="bg-yellow-100 dark:bg-yellow-600/40 text-[#1a1a1a] dark:text-white p-1 rounded italic">"{quote}"</span>
      </div>
    </div>
  );
};

export default CitationRenderer;
