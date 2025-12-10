
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ProcessedFile } from '../types';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, FileText, FileSpreadsheet, File as FileIcon, AlertTriangle } from 'lucide-react';

interface CitationMarker {
    id: string;
    label: string;
    quote: string;
    location: string;
}

interface DocumentViewerProps {
  file: ProcessedFile;
  initialPage?: number;
  highlightQuote?: string;
  location?: string;
  citations?: CitationMarker[];
  onClose: () => void;
}

// --- Shared Matching Logic ---
// Matches text even if the middle is slightly different (hallucinated) or whitespace varies
const findBestRangeInNormalizedText = (fullText: string, quote: string) => {
    const normalize = (s: string) => s.replace(/[\s\r\n]+/g, '').toLowerCase();
    const normQuote = normalize(quote);
    const normFull = normalize(fullText);
    
    if (normQuote.length < 5) return null;

    // 1. Exact Match
    const exactIdx = normFull.indexOf(normQuote);
    if (exactIdx !== -1) return { start: exactIdx, end: exactIdx + normQuote.length };

    // 2. Head & Tail Heuristic (The "Bookend" Strategy)
    // If the start and end of the quote exist, assume the middle is the target
    const CHUNK_LEN = Math.min(40, Math.floor(normQuote.length / 3));
    const head = normQuote.substring(0, CHUNK_LEN);
    const tail = normQuote.substring(normQuote.length - CHUNK_LEN);
    
    const headIdx = normFull.indexOf(head);
    if (headIdx !== -1) {
        // Look for tail AFTER the head
        // Allow up to 50% expansion in length (model hallucinations often add words)
        const searchLimit = headIdx + normQuote.length * 1.5; 
        const tailIdx = normFull.indexOf(tail, headIdx + CHUNK_LEN);
        
        if (tailIdx !== -1 && tailIdx < searchLimit) {
             return { start: headIdx, end: tailIdx + CHUNK_LEN };
        }
        
        // Fallback: Just highlight the head if tail is missing
        return { start: headIdx, end: headIdx + CHUNK_LEN };
    }

    // 3. Middle Fallback (if start is hallucinated/wrong)
    const midStart = Math.floor(normQuote.length / 2) - Math.floor(CHUNK_LEN / 2);
    const mid = normQuote.substring(midStart, midStart + CHUNK_LEN);
    const midIdx = normFull.indexOf(mid);
    if (midIdx !== -1) return { start: midIdx, end: midIdx + CHUNK_LEN };

    // 4. Tail Fallback
    const tailIdxOnly = normFull.indexOf(tail);
    if (tailIdxOnly !== -1) return { start: tailIdxOnly, end: tailIdxOnly + CHUNK_LEN };

    return null;
};

// --- Text/Excel Fuzzy Matching ---
// Maps normalized indices back to original string indices
const findAllFuzzyMatches = (fullText: string, quote: string): { start: number, end: number }[] => {
    if (!quote || !fullText) return [];
    
    // Use the robust matcher on normalized strings
    const match = findBestRangeInNormalizedText(fullText, quote);
    if (!match) return [];

    // Map back to original indices
    // This is expensive but necessary for preserving whitespace in Text/Excel views
    const normalizeChar = (c: string) => c.toLowerCase().match(/[a-z0-9]/) ? c.toLowerCase() : '';
    
    let normIdx = 0;
    let startOriginal = -1;
    let endOriginal = -1;
    
    for(let i=0; i<fullText.length; i++) {
        if (!fullText[i].match(/[\s\r\n]/)) {
            if (normIdx === match.start) startOriginal = i;
            if (normIdx === match.end) {
                endOriginal = i;
                break;
            }
            normIdx++;
        }
    }
    
    // Edge case for end index if it matches until end of string
    if (endOriginal === -1 && normIdx === match.end) endOriginal = fullText.length;

    if (startOriginal !== -1 && endOriginal !== -1) {
        return [{ start: startOriginal, end: endOriginal }];
    }

    return [];
};

const getLineOffsets = (text: string) => {
    const offsets = [0];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') offsets.push(i + 1);
    }
    return offsets;
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, initialPage = 1, highlightQuote, location, citations = [], onClose }) => {
  const isPdf = file.type === 'pdf';
  
  // PDF State
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState<number | null>(null);
  const [pdfRenderKey, setPdfRenderKey] = useState(0); // Force re-scroll after render
  
  // Text/Universal State
  const [loading, setLoading] = useState(isPdf);
  const [textScale, setTextScale] = useState(1.0);
  const [notFound, setNotFound] = useState(false);
  
  // Computed Markers with Visual Stacking logic
  const [displayMarkers, setDisplayMarkers] = useState<{ label: string, topPercent: number, quote: string, isActive: boolean, location: string, zIndex: number }[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Reset page when file changes
  useEffect(() => {
      setPageNumber(initialPage);
  }, [file.id, initialPage]);

  // Helper: Get Line Offsets
  const lineOffsets = useMemo(() => {
    if (isPdf || file.type === 'excel') return [];
    return getLineOffsets(file.content);
  }, [file.content, isPdf, file.type]);

  // --- PDF LOGIC ---
  useEffect(() => {
    if (!isPdf) {
        setLoading(false);
        return;
    }
    
    let isMounted = true;
    const loadPdf = async () => {
      if (!file.fileHandle || !window.pdfjsLib) {
          console.warn("[DocumentViewer] Missing file handle or PDF.js library");
          return;
      }
      try {
        setLoading(true);
        setPdfDocument(null);
        setPdfScale(null);

        if (window.pdfWorkerReady) await window.pdfWorkerReady;

        const arrayBuffer = await file.fileHandle.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ 
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        }).promise;
        
        if (isMounted) {
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
        }
      } catch (error) {
        console.error("[DocumentViewer] Error loading PDF:", error);
        if (isMounted) setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file, isPdf]);

  // Initial Scale (PDF)
  useEffect(() => {
    if (!isPdf || !pdfDocument || !containerRef.current) return;

    const setupView = async () => {
        try {
            const page = await pdfDocument.getPage(pageNumber); // Use current pageNumber
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current?.clientWidth || 800;
            const idealScale = (containerWidth - 64) / viewport.width;
            setPdfScale(Math.max(0.6, Math.min(idealScale, 1.5)));
        } catch (e) {
            setPdfScale(1.0);
        }
    };
    setupView();
  }, [pdfDocument, pageNumber, isPdf]); // Re-calc scale if page changes? No, usually stable, but safer.

  // Render Page (PDF)
  useEffect(() => {
    if (!isPdf || !pdfDocument || !canvasRef.current || !textLayerRef.current || pdfScale === null) return;

    const renderPage = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const page = await pdfDocument.getPage(pageNumber);
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!canvas || !context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        if (renderTaskRef.current) {
            try { await renderTaskRef.current.cancel(); } catch (e) {}
        }

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        
        const renderTask = page.render({ canvasContext: context, transform, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // Render Text Layer
        const textContent = await page.getTextContent();
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
            textLayerDiv.innerHTML = '';
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.setProperty('--scale-factor', String(pdfScale));
            
            window.pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
              textDivs: []
            });
        }

        if (highlightQuote && highlightLayerRef.current) {
            const found = renderHighlights(textContent, viewport, highlightQuote);
            if (!found) setNotFound(true);
        }

        setLoading(false);
        setPdfRenderKey(k => k + 1); // Signal render complete
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
            console.error("[DocumentViewer] Render error:", error);
            setLoading(false);
        }
      }
    };

    renderPage();
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
  }, [pageNumber, pdfScale, pdfDocument, highlightQuote, isPdf]);

  const renderHighlights = (textContent: any, viewport: any, quote: string): boolean => {
      if(!highlightLayerRef.current) return false;
      highlightLayerRef.current.innerHTML = ''; 
      
      const normalize = (str: string) => str.replace(/[\s\r\n]+/g, '').toLowerCase();

      let fullText = "";
      const itemMap: { start: number, end: number, item: any }[] = [];
      
      // Build normalized map of the whole page
      textContent.items.forEach((item: any) => {
          const str = normalize(item.str);
          const start = fullText.length;
          fullText += str;
          itemMap.push({ start, end: fullText.length, item });
      });

      // Use the robust fuzzy matcher
      const match = findBestRangeInNormalizedText(fullText, quote);
      
      if (match) {
          let firstMatchElement: HTMLElement | null = null;
          
          itemMap.forEach(({ start, end, item }) => {
             // Check for overlap
             if (Math.max(start, match.start) < Math.min(end, match.end)) {
                 try {
                     if (!window.pdfjsLib.Util) return;
                     const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
                     const fontHeight = Math.hypot(tx[2], tx[3]);
                     const fontWidth = item.width * viewport.scale; 
                     const angle = Math.atan2(tx[1], tx[0]);

                     const rect = document.createElement('div');
                     rect.className = 'pdf-highlight-rect';
                     Object.assign(rect.style, {
                         position: 'absolute',
                         left: `${tx[4]}px`,
                         top: `${tx[5] - fontHeight}px`,
                         width: `${Math.abs(fontWidth)}px`,
                         height: `${fontHeight}px`,
                         backgroundColor: 'rgba(255, 235, 59, 0.4)',
                         mixBlendMode: 'multiply',
                         pointerEvents: 'none',
                         transform: `rotate(${angle}rad)`,
                         transformOrigin: '0% 100%'
                     });
                     highlightLayerRef.current?.appendChild(rect);
                     if (!firstMatchElement) firstMatchElement = rect;
                 } catch (err) { console.error("Error creating highlight rect:", err); }
             }
          });
          
          if (firstMatchElement) {
              (highlightLayerRef.current as any)._scrollTarget = firstMatchElement;
          }
          return true;
      }
      
      (highlightLayerRef.current as any)._scrollTarget = null;
      return false;
  };

  // --- Calculate Markers for Text Files ---
  useEffect(() => {
    if (isPdf || file.type === 'excel') {
         setDisplayMarkers([]); 
         return; 
    }

    const rawMarkers: { label: string, topPercent: number, quote: string, isActive: boolean, location: string }[] = [];
    
    citations?.forEach(cit => {
        if (!cit.quote) return;
        const matches = findAllFuzzyMatches(file.content, cit.quote);
        if (matches.length > 0) {
            let bestMatch = matches[0];
            
            const lineMatch = cit.location.match(/(?:Line|Lines|Row|Rows|L|R|Ln)\s*[:#.]?\s*(\d+)/i);
            if (lineMatch && lineOffsets.length > 0) {
                const lineNum = parseInt(lineMatch[1], 10);
                const targetIndex = lineOffsets[Math.min(lineNum - 1, lineOffsets.length - 1)];
                bestMatch = matches.reduce((prev, curr) => {
                    return (Math.abs(curr.start - targetIndex) < Math.abs(prev.start - targetIndex)) ? curr : prev;
                });
            }

            const percent = (bestMatch.start / file.content.length) * 100;
            rawMarkers.push({
                label: cit.label,
                quote: cit.quote,
                location: cit.location,
                topPercent: percent,
                isActive: cit.quote === highlightQuote && cit.location === location
            });
        }
    });

    // Handle Visual Overlap
    rawMarkers.sort((a, b) => a.topPercent - b.topPercent);
    const finalMarkers = rawMarkers.map((marker, i) => {
        let adjustment = 0;
        for (let j = i - 1; j >= 0; j--) {
            if (Math.abs(marker.topPercent - rawMarkers[j].topPercent) < 2) {
                adjustment += 2.5; 
            } else break;
        }
        return {
            ...marker,
            topPercent: Math.min(99, marker.topPercent + adjustment),
            zIndex: marker.isActive ? 50 : 10
        };
    });

    setDisplayMarkers(finalMarkers);
  }, [file, citations, highlightQuote, location, isPdf, lineOffsets]);


  // --- PDF SCROLL EFFECT ---
  // Triggered via pdfRenderKey
  useLayoutEffect(() => {
      if (!isPdf || !highlightLayerRef.current || !highlightQuote) return;
      
      const scrollTarget = (highlightLayerRef.current as any)._scrollTarget as HTMLElement;
      if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Flash effect for PDF highlight
          const anim = scrollTarget.animate([
              { transform: 'scale(1)', opacity: 0.5 },
              { transform: 'scale(1.5)', opacity: 1 },
              { transform: 'scale(1)', opacity: 0.5 }
          ], { duration: 600, iterations: 2 });
      }
  }, [pdfRenderKey, isPdf, highlightQuote]);


  // --- UNIVERSAL TEXT/EXCEL SCROLL EFFECT ---
  useLayoutEffect(() => {
    if (isPdf || !highlightQuote) return;

    const performScroll = () => {
        const targetEl = document.getElementById('active-scroll-target');
        const excelRow = document.getElementById('excel-highlight-row');

        if (excelRow) {
            excelRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            excelRow.classList.remove('bg-amber-100'); 
            excelRow.classList.add('bg-amber-300', 'transition-colors', 'duration-1000');
            setTimeout(() => {
                excelRow.classList.remove('bg-amber-300');
                excelRow.classList.add('bg-amber-100');
            }, 1000);
        } else if (targetEl) {
             targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
             targetEl.classList.add('ring-4', 'ring-blue-400/50', 'bg-yellow-300', 'scale-105', 'transition-all', 'duration-300');
             setTimeout(() => {
                targetEl.classList.remove('ring-4', 'ring-blue-400/50', 'bg-yellow-300', 'scale-105');
             }, 1500);
        }
    };

    // Use RAF for layout stability
    requestAnimationFrame(() => {
        performScroll();
        requestAnimationFrame(performScroll);
    });
    
  }, [highlightQuote, location, isPdf, file, textScale]); 

  const handleMarkerClick = (marker: typeof displayMarkers[0]) => {
      if (containerRef.current) {
          const scrollHeight = containerRef.current.scrollHeight;
          const targetTop = (marker.topPercent / 100) * scrollHeight;
          containerRef.current.scrollTo({ top: targetTop - (containerRef.current.clientHeight / 2), behavior: 'smooth' });
      }
  };

  const getFileIcon = () => {
      if (file.type === 'pdf') return <FileText size={18} />;
      if (file.type === 'excel') return <FileSpreadsheet size={18} />;
      return <FileIcon size={18} />;
  }

  const handleZoomOut = () => {
      if (isPdf) setPdfScale(s => Math.max(0.5, (s || 1) - 0.2));
      else setTextScale(s => Math.max(0.5, s - 0.1));
  };

  const handleZoomIn = () => {
      if (isPdf) setPdfScale(s => Math.min(3, (s || 1) + 0.2));
      else setTextScale(s => Math.min(2.0, s + 0.1));
  };
  
  const currentScaleDisplay = isPdf ? (pdfScale || 1) : textScale;

  // -- Content Parsers --

  const parseExcelContent = (content: string, highlightLoc?: string) => {
      const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
      const parts = content.split(sheetRegex);
      const elements: React.ReactNode[] = [];
      
      let targetSheet = "";
      let targetRow = -1;

      if (highlightLoc) {
          const sheetMatch = highlightLoc.match(/Sheet:\s*['"]?([^,'";|]+)['"]?/i);
          if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();

          const rowMatch = highlightLoc.match(/(?:Row|Line|Ln)\s*[:#.]?\s*(\d+)/i);
          if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
      }

      if (parts[0].trim()) {
          elements.push(
              <div key="meta" className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 font-mono whitespace-pre-wrap">
                  {parts[0].trim()}
              </div>
          );
      }

      for (let i = 1; i < parts.length; i += 2) {
          const sheetName = parts[i];
          const csvContent = parts[i + 1] || "";
          
          const rows = csvContent.trim().split('\n').map(row => {
              const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
              if (!matches && row.length > 0) return [row]; 
              if (!matches) return [];
              return matches.map(cell => cell.replace(/^"|"$/g, '').trim()); 
          });

          const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);

          elements.push(
              <div key={i} className="mb-8">
                  <h4 className={`text-sm font-bold mb-2 px-1 flex items-center gap-2 ${isTargetSheet ? 'text-blue-700' : 'text-gray-700'}`}>
                      <FileSpreadsheet size={14} className={isTargetSheet ? "text-blue-600" : "text-emerald-600"}/> 
                      {sheetName}
                  </h4>
                  <div className={`overflow-x-auto border rounded-lg shadow-sm ${isTargetSheet ? 'border-blue-200' : 'border-gray-200'}`}>
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <tbody className="bg-white divide-y divide-gray-100">
                              {rows.map((row, rIdx) => {
                                  const visualRowNumber = rIdx + 1;
                                  const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);

                                  return (
                                    <tr 
                                        key={rIdx} 
                                        id={isHighlightRow ? "excel-highlight-row" : undefined}
                                        className={`
                                            transition-colors duration-500
                                            ${rIdx === 0 ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50/50"}
                                            ${isHighlightRow ? "bg-amber-100 ring-2 ring-inset ring-amber-400 z-10 relative" : ""}
                                        `}
                                    >
                                        <td className={`px-2 py-2 w-8 select-none text-[10px] text-right border-r border-gray-100 bg-gray-50/50 ${isHighlightRow ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                                            {visualRowNumber}
                                        </td>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap border-r border-gray-100 last:border-none max-w-[300px] truncate" title={cell}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          );
      }
      return elements;
  };

  const renderTextContent = () => {
      if (file.type === 'excel') {
          return parseExcelContent(file.content, location);
      }
      
      const content = file.content;
      if (!highlightQuote) {
          return <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</pre>;
      }

      // Multi-match Rendering
      const matches = findAllFuzzyMatches(content, highlightQuote);
      
      if (matches.length === 0) {
           return (
              <div className="relative">
                  <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</pre>
                  <div className="sticky bottom-4 left-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-xs font-medium shadow-sm border border-amber-200">
                      <AlertTriangle size={14} /> Citation text not found in file.
                  </div>
              </div>
          );
      }

      matches.sort((a, b) => a.start - b.start);
      
      let targetMatchIndex = 0; 
      if (location) {
          const lineMatch = location.match(/(?:Line|Lines|Row|Rows|L|R|Ln)\s*[:#.]?\s*(\d+)/i);
          if (lineMatch && lineOffsets.length > 0) {
             const lineNum = parseInt(lineMatch[1], 10);
             const targetOffset = lineOffsets[Math.min(lineNum - 1, lineOffsets.length - 1)];
             let minDiff = Infinity;
             matches.forEach((m, idx) => {
                 const diff = Math.abs(m.start - targetOffset);
                 if (diff < minDiff) {
                     minDiff = diff;
                     targetMatchIndex = idx;
                 }
             });
          }
      }

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;

      matches.forEach((match, i) => {
          if (match.start < lastIndex) return;
          if (match.start > lastIndex) elements.push(content.substring(lastIndex, match.start));
          
          const isTarget = i === targetMatchIndex;
          elements.push(
              <mark 
                key={i} 
                id={isTarget ? "active-scroll-target" : undefined}
                className={`text-highlight-match bg-yellow-200 text-gray-900 rounded px-0.5 font-bold border-b-2 border-yellow-400 ${isTarget ? 'ring-2 ring-red-500 ring-offset-1 z-10 relative' : ''}`}
              >
                  {content.substring(match.start, match.end)}
              </mark>
          );
          lastIndex = match.end;
      });

      if (lastIndex < content.length) elements.push(content.substring(lastIndex));

      return <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{elements}</pre>;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] border-l border-gray-200">
      {/* Header */}
      <div className="flex-none h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-1.5 rounded ${file.type === 'pdf' ? 'bg-rose-50 text-rose-500' : file.type === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {getFileIcon()}
            </div>
            <div className="flex flex-col overflow-hidden">
                <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[200px]" title={file.name}>{file.name}</h3>
                {isPdf ? (
                    <span className="text-[10px] text-gray-400 font-medium">Page {pageNumber} of {numPages}</span>
                ) : (
                    <span className="text-[10px] text-gray-400 font-medium">
                        {file.type === 'excel' && location ? location : (file.type === 'excel' ? 'Spreadsheet View' : 'Text View')}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             {/* Not Found Indicator */}
             {notFound && isPdf && (
                 <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                     <AlertTriangle size={10} />
                     Quote not found on this page
                 </span>
             )}
             
             <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200">
                 <button onClick={handleZoomOut} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomOut size={14} /></button>
                 <span className="text-[10px] w-10 text-center font-medium text-gray-600">{Math.round(currentScaleDisplay * 100)}%</span>
                 <button onClick={handleZoomIn} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"><ZoomIn size={14} /></button>
             </div>
             <div className="h-4 w-px bg-gray-200"></div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Close Viewer">
               <X size={18} />
             </button>
        </div>
      </div>

      {/* Viewport & Markers */}
      <div className="flex-1 relative overflow-hidden flex">
          
          {/* Scrollable Content */}
          <div ref={containerRef} className="flex-1 overflow-auto relative flex justify-center custom-scrollbar bg-gray-100/50">
            {isPdf && (
                <div className="p-8">
                    <div className="fixed bottom-6 z-40 bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 left-1/2 -translate-x-1/2 transform transition-opacity duration-300 opacity-0 hover:opacity-100 group-hover:opacity-100">
                        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={20} /></button>
                        <span className="text-xs font-medium tabular-nums">{pageNumber} / {numPages}</span>
                        <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={20} /></button>
                    </div>
                    {loading && pdfScale === null && (
                        <div className="absolute inset-0 flex items-center justify-center z-30">
                            <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-medium text-gray-500">Rendering...</span>
                            </div>
                        </div>
                    )}
                    <div className="relative shadow-xl ring-1 ring-black/5 bg-white transition-opacity duration-200 origin-top" style={{ width: 'fit-content', height: 'fit-content', opacity: loading ? 0.6 : 1 }}>
                        <canvas ref={canvasRef} className="block" />
                        <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none z-10" />
                        <div ref={textLayerRef} className="textLayer absolute inset-0" />
                    </div>
                </div>
            )}
            {!isPdf && (
                <div className="bg-white shadow-sm border border-gray-200 w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
                    <div className="p-12">{renderTextContent()}</div>
                </div>
            )}
          </div>

          {/* Marker Bar (Right Side) */}
          {!isPdf && displayMarkers.length > 0 && (
             <div className="w-4 bg-gray-100 border-l border-gray-200 relative flex-shrink-0 z-10 select-none">
                 {displayMarkers.map((marker, i) => (
                     <div 
                        key={i}
                        onClick={() => handleMarkerClick(marker)}
                        className={`absolute left-0 right-0 h-1.5 cursor-pointer hover:h-2 transition-all ${marker.isActive ? 'bg-blue-600 ring-1 ring-white' : 'bg-yellow-400'}`}
                        style={{ top: `${marker.topPercent}%`, zIndex: marker.zIndex }}
                        title={`${marker.label}: ${marker.quote.substring(0, 50)}...`}
                     >
                     </div>
                 ))}
                 {displayMarkers.map((marker, i) => (
                    <div 
                        key={`label-${i}`}
                        className={`absolute right-full mr-1 text-[9px] font-bold px-1 rounded cursor-pointer transition-opacity opacity-0 hover:opacity-100 ${marker.isActive ? 'bg-blue-600 text-white opacity-100 shadow-sm' : 'bg-gray-700 text-white'}`}
                        style={{ top: `${marker.topPercent}%`, transform: 'translateY(-50%)', zIndex: marker.zIndex + 1 }}
                        onClick={() => handleMarkerClick(marker)}
                    >
                        {marker.label}
                    </div>
                 ))}
             </div>
          )}
      </div>
    </div>
  );
};

export default DocumentViewer;
