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
      
      const headers = parseCSVLine(headerLine || '', delimiter);
      const dataLines = lines.slice(sheetStartIdx + 1).filter(l => l && !l.includes('[META:') && !l.includes('---') && !l.includes('[Sheet:'));
      const rows = dataLines.map(line => parseCSVLine(line, delimiter));
      
      return (
        <div ref={tableRef} className="overflow-auto p-2" style={{ maxHeight: '400px', transform: 'scale(0.85)', transformOrigin: 'top left', width: '117.65%' }} onWheel={(e) => e.stopPropagation()}>
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-gray-100/80 dark:bg-[#2a2a2a]/80 backdrop-blur-md z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-1.5 py-1 text-left font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap bg-gray-100 dark:bg-[#2a2a2a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={`${rowIdx + 2 === targetRowNum ? 'highlighted-row bg-[#9ce8d6]/30 dark:bg-[#5bd8bb]/10' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]'}`}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-1.5 py-1 text-[#1a1a1a] dark:text-white">{cell}</td>
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
      <div className="text-sm leading-relaxed text-[#666666] dark:text-[#a0a0a0] bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md p-4 rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] font-serif shadow-sm">
        <div className="mb-2 text-[12px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{location || "Excerpt"}</div>
        <span className="bg-[#9ce8d6]/30 dark:bg-[#5bd8bb]/10 text-[#1a1a1a] dark:text-white p-1 rounded italic">"{quote}"</span>
      </div>
    </div>
  );
};

export default TextContextViewer;
