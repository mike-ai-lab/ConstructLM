import React, { useEffect } from 'react';
import { ProcessedFile } from '../../types';
import { FileSpreadsheet } from 'lucide-react';

interface ExcelViewerProps {
  file: ProcessedFile;
  location?: string;
  textScale: number;
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ file, location, textScale }) => {
  useEffect(() => {
    const tryScroll = () => {
      const rowEl = document.getElementById('excel-highlight-row');
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };
    setTimeout(tryScroll, 100);
    setTimeout(tryScroll, 300);
    setTimeout(tryScroll, 600);
  }, [location, file]);

  const parseExcelContent = (content: string, highlightLoc?: string) => {
    console.log('🔍 EXCEL CONTENT:', content.substring(0, 500));
    console.log('🔍 CONTENT LENGTH:', content.length);
    
    const sheetRegex = /--- \[Sheet: (.*?)\] ---/g;
    const parts = content.split(sheetRegex);
    console.log('🔍 PARTS:', parts.length, parts.map((p, i) => `[${i}]: ${p.substring(0, 100)}`));
    
    const elements: React.ReactNode[] = [];
    let targetSheet = "";
    let targetRow = -1;

    if (highlightLoc) {
      const sheetMatch = highlightLoc.match(/Sheet:\s*[']?([^,'";\|]+)[']?/i);
      if (sheetMatch) targetSheet = sheetMatch[1].trim().toLowerCase();
      const rowMatch = highlightLoc.match(/(?:Row|Line)\s*[:#.]?\s*(\d+)/i);
      if (rowMatch) targetRow = parseInt(rowMatch[1], 10);
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
      console.log(`📊 SHEET ${sheetName}:`, csvContent.substring(0, 200));
      
      const lines = csvContent.trim().split('\n');
      console.log(`📊 LINES COUNT:`, lines.length, 'First line:', lines[0]);
      
      const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
      console.log(`📊 DELIMITER:`, delimiter === '\t' ? 'TAB' : 'COMMA');
      
      const rows = lines.map(row => {
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
      });
      
      console.log(`📊 ROWS:`, rows.length, 'First row:', rows[0]);
      console.log(`📊 Sample cells:`, rows[1]?.slice(0, 3));

      const isTargetSheet = targetSheet && sheetName.toLowerCase().includes(targetSheet);
      
      // If no row number, try to find by quote in location
      if (targetRow === -1 && location) {
        const quoteMatch = location.match(/["']([^"']+)["']/);
        if (quoteMatch) {
          const searchText = quoteMatch[1].toLowerCase();
          for (let i = 0; i < rows.length; i++) {
            const rowText = rows[i].join(' ').toLowerCase();
            if (rowText.includes(searchText)) {
              targetRow = i + 1;
              console.log('📊 Found quote match at row:', targetRow);
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
            <table className="w-full table-auto divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)] text-xs">
              <tbody className="bg-white dark:bg-[#2a2a2a] divide-y divide-[rgba(0,0,0,0.15)] dark:divide-[rgba(255,255,255,0.05)]">
                {rows.map((row, rIdx) => {
                  const visualRowNumber = rIdx + 1;
                  const isHighlightRow = isTargetSheet && (visualRowNumber === targetRow);
                  const isHeaderRow = rIdx === 0;
                  return (
                    <tr 
                      key={rIdx} 
                      id={isHighlightRow ? "excel-highlight-row" : undefined}
                      className={`transition-colors duration-500 ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a] font-semibold text-[#1a1a1a] dark:text-white sticky top-0 z-20" : "text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]"} ${isHighlightRow ? "bg-yellow-200 dark:bg-yellow-600/50 ring-2 ring-inset ring-yellow-400 dark:ring-yellow-600 z-10 relative" : ""}`}
                    >
                      <td className={`px-1 py-1 w-8 select-none text-[12px] text-right border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] ${isHeaderRow ? "bg-gray-100 dark:bg-[#1a1a1a]" : "bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]"} ${isHighlightRow ? "text-yellow-700 dark:text-yellow-400 font-bold" : "text-[#999999] dark:text-[#666666]"}`}>
                        {visualRowNumber}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-1.5 py-1 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] last:border-none" title={cell}>
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
    <div className="overflow-auto w-full h-full">
      <div className="bg-white dark:bg-[#2a2a2a] shadow-sm border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] w-full max-w-5xl min-h-full mx-auto my-8" style={{ fontSize: `${textScale * 0.875}rem` }}>
        <div className="p-12">{parseExcelContent(file.content, location)}</div>
      </div>
    </div>
  );
};

export default ExcelViewer;
