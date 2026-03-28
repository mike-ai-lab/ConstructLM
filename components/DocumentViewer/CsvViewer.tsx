import React, { useEffect, useRef } from 'react';
import { ProcessedFile } from '../../types';
import { Table } from 'lucide-react';
import { scrollToElementById, HIGHLIGHT_CLASSES } from '@/utils/scrollUtils';

interface CsvViewerProps {
  file: ProcessedFile;
  textScale: number;
  highlightQuote?: string;
  location?: string;
}

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(cell.trim());
      if (row.some(c => c)) rows.push(row);
      row = [];
      cell = '';
      if (next === '\r') i++;
    } else if (char === '\r' && next === '\n' && !inQuotes) {
      row.push(cell.trim());
      if (row.some(c => c)) rows.push(row);
      row = [];
      cell = '';
      i++;
    } else {
      cell += char;
    }
  }
  
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(c => c)) rows.push(row);
  }
  
  return rows;
};

const CsvViewer: React.FC<CsvViewerProps> = ({ file, textScale, highlightQuote, location }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  console.log('📊 [CsvViewer] Rendered with:', { 
    fileName: file.name, 
    highlightQuote,
    location,
    hasContent: !!file.content,
    contentLength: file.content?.length 
  });

  const rows = parseCSV(file.content);
  
  // Listen for citation highlight events
  useEffect(() => {
    const handleCitationHighlight = (event: CustomEvent) => {
      const { fileName, quote } = event.detail;
      
      if (fileName === file.name) {
        console.log('🎯[CITE-HL] CsvViewer: Citation highlight event received', { 
          fileName, 
          quote: quote?.substring(0, 50)
        });
        
        // CSV uses ONLY row highlighting, NOT Mark.js text highlighting
        // The row highlighting is already handled by the existing logic
        // Just scroll to the highlighted row if it exists
        setTimeout(() => {
          const highlightedRow = document.getElementById('csv-highlight-row');
          if (highlightedRow) {
            console.log('🎯[CITE-HL] CsvViewer: Scrolling to highlighted row');
            highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            console.warn('🎯[CITE-HL] CsvViewer: No highlighted row found');
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
    if (location || highlightQuote) {
      console.log('📊 [CsvViewer] useEffect triggered - attempting scroll');
      scrollToElementById('csv-highlight-row', 200);
    } else {
      console.log('📊 [CsvViewer] No location/quote provided, skipping scroll');
    }
  }, [location, highlightQuote, file]);
  
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No data to display
      </div>
    );
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const maxCols = Math.max(headers.length, ...dataRows.map(r => r.length));
  
  // Find highlight row if quote provided
  let highlightRowIndex = -1;
  if (highlightQuote) {
    const searchTerm = highlightQuote.toLowerCase();
    console.log('📊 [CsvViewer] Searching for quote:', searchTerm);
    highlightRowIndex = dataRows.findIndex(row => 
      row.join(' ').toLowerCase().includes(searchTerm)
    );
    console.log('📊 [CsvViewer] Highlight row index:', highlightRowIndex);
  }

  return (
    <div ref={containerRef} className="overflow-auto w-full h-full">
      <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-7xl min-h-full mx-auto p-2" style={{ fontSize: `${textScale * 0.875}rem` }}>
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5">
          <Table size={16} className="text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {file.name}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
            {dataRows.length} rows × {maxCols} cols
          </span>
        </div>
        <div className="overflow-auto rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm" style={{ maxHeight: '70vh' }}>
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-[#1a1a1a]">
              <tr>
                <th className="px-2 py-2 text-right text-gray-500 dark:text-gray-500 font-medium border-b-2 border-r border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#0f0f0f] w-12">
                  #
                </th>
                {headers.map((header, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-800 dark:text-gray-200 border-b-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                    {header || `Column ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1e1e1e]">
              {dataRows.map((row, rIdx) => {
                const isHighlight = rIdx === highlightRowIndex;
                return (
                  <tr
                    key={rIdx}
                    id={isHighlight ? 'csv-highlight-row' : undefined}
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors ${isHighlight ? `${HIGHLIGHT_CLASSES.ROW} bg-blue-200 dark:bg-blue-600/50 ring-2 ring-inset ring-blue-400 dark:ring-blue-600` : ''}`}
                  >
                    <td className="px-2 py-1.5 text-right text-gray-400 dark:text-gray-600 font-mono text-[11px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f0f] select-none">
                      {rIdx + 2}
                    </td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const cell = row[cIdx] || '';
                      return (
                        <td key={cIdx} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0" title={cell}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CsvViewer;
