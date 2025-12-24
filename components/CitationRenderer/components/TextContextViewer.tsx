import React, { useRef, useEffect } from 'react';
import { ProcessedFile } from '../../../types';
import { parseCSVLine } from '../utils/tableUtils';

interface TextContextViewerProps {
  file?: ProcessedFile;
  quote: string;
  location: string;
}

const TextContextViewer: React.FC<TextContextViewerProps> = ({ file, quote, location }) => {
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
    
    setTimeout(() => scrollToRow(), 100);
    setTimeout(() => scrollToRow(), 300);
    setTimeout(() => scrollToRow(), 600);
  }, [file, location, quote]);
  
  if (file?.type === 'excel' && location) {
    const rowMatch = location.match(/Row\s*(\d+)/i);
    const sheetMatch = location.match(/Sheet:\s*[']?([^,'";\|]+)[']?/i);
    
    if (file.content) {
      const targetRowNum = rowMatch ? parseInt(rowMatch[1], 10) : -1;
      const sheetName = sheetMatch ? sheetMatch[1].trim() : null;
      
      const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
      const parts = file.content.split(sheetRegex);
      
      let sheetContent = '';
      if (sheetName) {
        for (let i = 1; i < parts.length; i += 2) {
          if (parts[i].toLowerCase().includes(sheetName.toLowerCase())) {
            sheetContent = parts[i + 1] || '';
            break;
          }
        }
      }
      
      if (!sheetContent && parts.length > 2) {
        sheetContent = parts[2];
      }
      
      if (!sheetContent) {
        sheetContent = file.content;
      }
      
      const lines = sheetContent.trim().split('\n').filter(l => l.trim());
      const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
      
      const parseRow = (row: string) => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < row.length; j++) {
          const char = row[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            cells.push(current.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        return cells;
      };
      
      const headers = parseRow(lines[0] || '');
      const rows = lines.slice(1).map(line => parseRow(line));
      
      // If no row number, try to find by quote
      let finalTargetRow = targetRowNum;
      if (finalTargetRow === -1 && quote) {
        const quoteNorm = quote.toLowerCase();
        for (let i = 0; i < rows.length; i++) {
          const rowText = rows[i].join(' ').toLowerCase();
          if (rowText.includes(quoteNorm)) {
            finalTargetRow = i + 2;
            break;
          }
        }
      }
      
      return (
        <div ref={tableRef} className="overflow-auto" style={{ maxHeight: '400px' }} onWheel={(e) => e.stopPropagation()}>
          <table className="w-full text-[9px] border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-[#2a2a2a] z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-left font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const visualRowNum = rowIdx + 2;
                const isHighlight = visualRowNum === finalTargetRow;
                return (
                  <tr key={rowIdx} className={`${isHighlight ? 'highlighted-row bg-yellow-300 dark:bg-yellow-700 ring-2 ring-yellow-500' : 'hover:bg-gray-50 dark:hover:bg-[#222222]'}`}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[#1a1a1a] dark:text-white">{cell}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  }
  
  return (
    <div className="p-2">
      <div className="text-sm leading-relaxed text-[#666666] dark:text-[#a0a0a0] bg-white dark:bg-[#2a2a2a] p-2 rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] font-serif">
        <div className="mb-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{location || "Excerpt"}</div>
        <span className="bg-yellow-100 dark:bg-yellow-600/40 text-[#1a1a1a] dark:text-white p-1 rounded italic text-xs">"{quote}"</span>
      </div>
    </div>
  );
};

export default TextContextViewer;
