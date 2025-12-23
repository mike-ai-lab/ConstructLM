import React, { useEffect } from 'react';
import { ProcessedFile } from '../../types';
import { FileSpreadsheet } from 'lucide-react';

interface ExcelViewerProps {
  file: ProcessedFile;
  location?: string;
  textScale: number;
}

const parseCSV = (text: string, delimiter: string = ','): string[][] => {
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
    } else if (char === delimiter && !inQuotes) {
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

const ExcelViewer: React.FC<ExcelViewerProps> = ({ file, location, textScale }) => {
  useEffect(() => {
    if (!location) return;
    const tryScroll = () => {
      const rowEl = document.getElementById('excel-highlight-row');
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };
    const timer1 = setTimeout(tryScroll, 100);
    const timer2 = setTimeout(tryScroll, 300);
    const timer3 = setTimeout(tryScroll, 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location]);

  const parseExcelContent = (content: string, highlightLoc?: string) => {
    const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
    const parts = content.split(sheetRegex);
    const elements: React.ReactNode[] = [];
    let targetSheet = "";
    let targetRow = -1;

    if (highlightLoc) {
      const sheetMatch = highlightLoc.match(/Sheet:\s*['"]?([^,'";\|]+)['"]?/i);
      if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();
      const rowMatch = highlightLoc.match(/(?:Row|Line)\s*[:#.]?\s*(\d+)/i);
      if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
    }

    if (parts[0].trim()) {
      const metaText = parts[0].trim()
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      elements.push(
        <div key="meta" className="mb-4 p-3 bg-gray-50 dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">
          {metaText}
        </div>
      );
    }

    for (let i = 1; i < parts.length; i += 2) {
      const sheetName = parts[i];
      const csvContent = parts[i + 1] || "";
      const delimiter = csvContent.includes('\t') ? '\t' : ',';
      const rows = parseCSV(csvContent.trim(), delimiter);
      
      if (!rows.length) continue;
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const maxCols = Math.max(headers.length, ...dataRows.map(r => r.length));
      const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);

      elements.push(
        <div key={i} className="mb-6">
          <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded ${isTargetSheet ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <FileSpreadsheet size={16} className={isTargetSheet ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}/>
            <h4 className={`text-sm font-semibold ${isTargetSheet ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {sheetName}
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
              {dataRows.length} rows × {maxCols} cols
            </span>
          </div>
          <div className={`overflow-auto rounded-lg border ${isTargetSheet ? 'border-blue-300 dark:border-blue-700 shadow-md' : 'border-gray-300 dark:border-gray-700 shadow-sm'}`} style={{ maxHeight: '70vh' }}>
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
                  const visualRowNumber = rIdx + 2;
                  const isHighlightRow = isTargetSheet && visualRowNumber === targetRow;
                  return (
                    <tr
                      key={rIdx}
                      id={isHighlightRow ? "excel-highlight-row" : undefined}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors ${
                        isHighlightRow ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-inset ring-amber-500 dark:ring-amber-600' : ''
                      }`}
                    >
                      <td className={`px-2 py-1.5 text-right text-gray-400 dark:text-gray-600 font-mono text-[11px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f0f] select-none ${
                        isHighlightRow ? 'text-amber-700 dark:text-amber-400 font-bold' : ''
                      }`}>
                        {visualRowNumber}
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
      );
    }
    return elements;
  };

  return (
    <div className="overflow-auto w-full h-full">
      <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-7xl min-h-full mx-auto p-6" style={{ fontSize: `${textScale * 0.875}rem` }}>
        {parseExcelContent(file.content, location)}
      </div>
    </div>
  );
};

export default ExcelViewer;
