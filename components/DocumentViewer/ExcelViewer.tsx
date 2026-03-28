import React, { useEffect, useRef } from 'react';
import { ProcessedFile } from '../../types';
import { FileSpreadsheet } from 'lucide-react';
import { scrollToElementById, HIGHLIGHT_CLASSES } from '@/utils/scrollUtils';

interface ExcelViewerProps {
  file: ProcessedFile;
  location?: string;
  textScale: number;
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ file, location, textScale }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  console.log('📊 [ExcelViewer] Rendered with:', { 
    fileName: file.name, 
    location, 
    hasContent: !!file.content,
    contentLength: file.content?.length 
  });

  // Listen for citation highlight events
  useEffect(() => {
    const handleCitationHighlight = (event: CustomEvent) => {
      const { fileName, quote, location: citationLocation } = event.detail;
      
      if (fileName === file.name) {
        console.log('🎯[CITE-HL] ExcelViewer: Citation highlight event received', { 
          fileName, 
          quote: quote?.substring(0, 50),
          citationLocation 
        });
        
        // Excel uses ONLY row highlighting, NOT Mark.js text highlighting
        // The row highlighting is already handled by the existing parseExcelContent logic
        // Just scroll to the highlighted row if it exists
        setTimeout(() => {
          const highlightedRow = document.getElementById('excel-highlight-row');
          if (highlightedRow) {
            console.log('🎯[CITE-HL] ExcelViewer: Scrolling to highlighted row');
            highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            console.warn('🎯[CITE-HL] ExcelViewer: No highlighted row found');
          }
        }, 300);
      }
    };

    window.addEventListener('citationHighlight', handleCitationHighlight as EventListener);
    
    return () => {
      window.removeEventListener('citationHighlight', handleCitationHighlight as EventListener);
    };
  }, [file.name]);

  useEffect(() => {
    if (location) {
      console.log('📊 [ExcelViewer] useEffect triggered - attempting scroll to:', location);
      // Use unified scroll utility with proper delay
      scrollToElementById('excel-highlight-row', 200);
    } else {
      console.log('📊 [ExcelViewer] No location provided, skipping scroll');
    }
  }, [location, file]);

  // ✅ NEW: Robust CSV Parser that handles newlines inside quotes
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;
    
    // Normalize line endings to avoid complexity with \r\n vs \n
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        // Handle escaped quotes ("") inside a quoted cell
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip the next quote since we just handled it
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } 
      else if (char === ',' && !inQuotes) {
        // Found delimiter outside of quotes -> End of Cell
        currentRow.push(currentCell);
        currentCell = "";
      } 
      else if (char === '\n' && !inQuotes) {
        // Found newline outside of quotes -> End of Row
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } 
      else {
        // Standard character
        currentCell += char;
      }
    }

    // Flush any remaining data
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return rows;
  };

  const parseExcelContent = (content: string, highlightLoc?: string) => {
    console.log('📊 [ExcelViewer.parseExcelContent] Parsing with:', {
      contentLength: content.length,
      highlightLoc,
      hasHighlight: !!highlightLoc
    });

    const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
    const parts = content.split(sheetRegex);
    
    const elements: React.ReactNode[] = [];
    let targetSheet = "";
    let targetRow = -1;

    if (highlightLoc) {
      const sheetMatch = highlightLoc.match(/Sheet:\s*[']?([^,'";|]+)[']?/i);
      if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();
      const rowMatch = highlightLoc.match(/(?:Row|Line)\s*[:#.]?\s*(\d+)/i);
      if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
      
      console.log('📊 [ExcelViewer.parseExcelContent] Extracted highlight info:', {
        targetSheet,
        targetRow,
        sheetMatch: !!sheetMatch,
        rowMatch: !!rowMatch
      });
    }

    if (parts[0].trim()) {
      elements.push(
        <div key="meta" className="mb-6 p-4 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-xs text-[#666666] dark:text-[#a0a0a0] font-mono whitespace-pre-wrap">
          {parts[0].trim()}
        </div>
      );
    }

    for (let i = 1; i < parts.length; i += 2) {
      const sheetName = parts[i];
      const csvContent = parts[i + 1] || "";
      
      // ✅ USE THE NEW PARSER HERE
      const rows = parseCSV(csvContent.trim());
      
      const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);
      
      console.log('📊 [ExcelViewer.parseExcelContent] Processing sheet:', {
        sheetName,
        isTargetSheet,
        rowCount: rows.length,
        targetRow
      });

      // Logic to find row by content if line number missing
      if (targetRow === -1 && location) {
        const quoteMatch = location.match(/["']([^"']+)["']/);
        if (quoteMatch) {
          const searchText = quoteMatch[1].toLowerCase();
          console.log('📊 [ExcelViewer.parseExcelContent] Searching for quote:', searchText);
          for (let r = 0; r < rows.length; r++) {
            const rowText = rows[r].join(' ').toLowerCase();
            if (rowText.includes(searchText)) {
              targetRow = r + 1;
              console.log('✅ [ExcelViewer.parseExcelContent] Found quote in row:', targetRow);
              break;
            }
          }
        }
      }

      elements.push(
        <div key={i} className="mb-8">
          <h4 className={`text-sm font-bold mb-2 px-1 flex items-center gap-2 ${isTargetSheet ? 'text-blue-700 dark:text-blue-400' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>
            <FileSpreadsheet size={14} className={isTargetSheet ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}/> 
            {sheetName}
          </h4>
          <div className={`overflow-auto border rounded-lg shadow-sm ${isTargetSheet ? 'border-blue-200 dark:border-blue-800' : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'}`} style={{ maxHeight: '600px' }}>
            <table className="w-full border-collapse divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)] text-xs">
              <tbody className="bg-white dark:bg-[#2a2a2a] divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)]">
                {rows.map((row, rIdx) => {
                  const visualRowNumber = rIdx + 1;
                  const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);
                  const isHeaderRow = rIdx === 0;
                  return (
                    <tr 
                      key={rIdx} 
                      id={isHighlightRow ? "excel-highlight-row" : undefined}
                      className={`transition-colors duration-500 ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a] font-semibold text-[#1a1a1a] dark:text-white sticky top-0 z-20" : "text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"} ${isHighlightRow ? `${HIGHLIGHT_CLASSES.ROW} bg-blue-200 dark:bg-blue-600/50 ring-2 ring-inset ring-blue-400 dark:ring-blue-600 z-10 relative` : ""}`}
                    >
                      <td className={`px-1 py-1 w-8 select-none text-[12px] text-right border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a]" : "bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]"} ${isHighlightRow ? "text-blue-700 dark:text-blue-400 font-bold" : "text-[#999999] dark:text-[#666666]"}`}>
                        {visualRowNumber}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-1.5 py-1 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] last:border-none whitespace-nowrap max-w-[300px] truncate" title={cell}>
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

  return (
    <div ref={containerRef} className="overflow-auto w-full h-full">
      <div className="bg-white dark:bg-[#2a2a2a] shadow-sm border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
        <div className="p-2">{parseExcelContent(file.content, location)}</div>
      </div>
    </div>
  );
};

export default ExcelViewer;