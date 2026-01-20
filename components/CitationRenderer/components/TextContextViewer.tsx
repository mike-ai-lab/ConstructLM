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
  
  console.log('📝 TEXT VIEWER DEBUG:');
  console.log('  File:', file?.name, 'Type:', file?.type);
  console.log('  Quote:', quote);
  console.log('  Location:', location);
  console.log('  Has content:', !!file?.content);
  
  useEffect(() => {
    const scrollToRow = () => {
      if (tableRef.current) {
        const highlightedRow = tableRef.current.querySelector('.highlighted-row, .highlight-target');
        if (highlightedRow) {
          highlightedRow.scrollIntoView({ behavior: 'instant', block: 'center' });
          return true;
        }
      }
      return false;
    };
    
    requestAnimationFrame(() => scrollToRow());
  }, [file, location, quote]);
  
  if ((file?.type === 'excel' || file?.type === 'csv') && location) {
    const rowMatch = location.match(/Row\s*(\d+)/i);
    const sheetMatch = location.match(/Sheet:\s*[']?([^,'";|]+)[']?/i);
    
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
      
      const decodeHtmlEntities = (text: string) => {
        return text
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
      };
      
      const parseRow = (row: string) => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < row.length; j++) {
          const char = row[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            cells.push(decodeHtmlEntities(current));
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(decodeHtmlEntities(current));
        return cells;
      };
      
      const headers = parseRow(lines[0] || '');
      const rows = lines.slice(1).map(line => parseRow(line));
      
      console.log('  📋 Excel/CSV parsing:');
      console.log('    Headers:', headers);
      console.log('    Total rows:', rows.length);
      console.log('    Target row:', targetRowNum);
      console.log('    Quote (encoded):', quote);
      console.log('    Quote (decoded):', decodeHtmlEntities(quote));
      
      // If no row number, try to find by quote
      let finalTargetRow = targetRowNum;
      if (finalTargetRow === -1 && quote) {
        const quoteNorm = decodeHtmlEntities(quote).toLowerCase().trim();
        for (let i = 0; i < rows.length; i++) {
          const rowText = decodeHtmlEntities(rows[i].join(' ')).toLowerCase().trim();
          if (rowText.includes(quoteNorm)) {
            finalTargetRow = i + 2;
            break;
          }
        }
      }
      
      // Show only context rows (target ±5 rows)
      const contextRange = 5;
      const targetIdx = finalTargetRow > 0 ? finalTargetRow - 2 : 0;
      const startIdx = Math.max(0, targetIdx - contextRange);
      const endIdx = Math.min(rows.length, targetIdx + contextRange + 1);
      const contextRows = rows.slice(startIdx, endIdx);
      
      return (
        <table ref={tableRef} className="w-full text-[9px] border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-[#2a2a2a] z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-left font-semibold text-[#1a1a1a] dark:text-white whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contextRows.map((row, rowIdx) => {
                const visualRowNum = startIdx + rowIdx + 2;
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
      );
    }
  }
  
  if ((file?.type === 'markdown' || file?.name.endsWith('.md')) && file.content) {
    const parseMarkdown = (md: string): string => {
      const lines = md.split('\n');
      const result: string[] = [];
      let inCodeBlock = false;
      let codeBlockContent: string[] = [];

      const processInline = (text: string, shouldHighlight: boolean = false): string => {
        let processed = text
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto" />')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.*?)__/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          .replace(/~~(.*?)~~/g, '<del>$1</del>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">$1</code>');
        
        if (shouldHighlight) {
          processed = `<span class="bg-yellow-100 dark:bg-yellow-600/40 text-[#1a1a1a] dark:text-white p-1 rounded">${processed}</span>`;
        }
        return processed;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
          if (inCodeBlock) {
            result.push(`<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto my-2"><code class="text-xs">${codeBlockContent.join('\n')}</code></pre>`);
            codeBlockContent = [];
            inCodeBlock = false;
          } else {
            inCodeBlock = true;
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockContent.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
          continue;
        }

        if (trimmed.startsWith('####')) {
          result.push(`<h4 class="text-sm font-semibold mt-2 mb-1">${processInline(trimmed.slice(4).trim())}</h4>`);
        } else if (trimmed.startsWith('###')) {
          result.push(`<h3 class="text-base font-semibold mt-3 mb-1">${processInline(trimmed.slice(3).trim())}</h3>`);
        } else if (trimmed.startsWith('##')) {
          result.push(`<h2 class="text-lg font-bold mt-3 mb-2">${processInline(trimmed.slice(2).trim())}</h2>`);
        } else if (trimmed.startsWith('#')) {
          result.push(`<h1 class="text-xl font-bold mt-4 mb-2">${processInline(trimmed.slice(1).trim())}</h1>`);
        } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
          result.push('<hr class="my-2 border-gray-300 dark:border-gray-600" />');
        } else if (trimmed.match(/^[-*+]\s/)) {
          const content = trimmed.replace(/^[-*+]\s/, '');
          result.push(`<li class="ml-4 my-0.5">${processInline(content)}</li>`);
        } else if (trimmed.match(/^\d+\.\s/)) {
          const content = trimmed.replace(/^\d+\.\s/, '');
          result.push(`<li class="ml-4 my-0.5">${processInline(content)}</li>`);
        } else if (trimmed.startsWith('>')) {
          result.push(`<blockquote class="border-l-2 border-gray-400 dark:border-gray-600 pl-2 italic my-2 text-gray-600 dark:text-gray-400">${processInline(trimmed.slice(1).trim())}</blockquote>`);
        } else if (trimmed === '') {
          result.push('<br />');
        } else {
          result.push(`<p class="my-1 leading-relaxed">${processInline(trimmed)}</p>`);
        }
      }

      return result.join('\n');
    };
    
    const lines = file.content.split('\n');
    const quoteNorm = quote.toLowerCase().trim();
    
    // Normalize content for search - remove HTML tags and decode entities
    const normalizeForSearch = (text: string) => {
      return text
        .replace(/<[^>]+>/g, '') // Remove ALL HTML tags
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .toLowerCase()
        .trim();
    };
    
    let contextStart = -1;
    let contextEnd = -1;
    let highlightLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (normalizeForSearch(lines[i]).includes(quoteNorm)) {
        contextStart = Math.max(0, i - 2);
        contextEnd = Math.min(lines.length, i + 3);
        highlightLineIndex = i - contextStart;
        break;
      }
    }
    
    if (contextStart !== -1) {
      const contextLines = lines.slice(contextStart, contextEnd);
      const contextMd = contextLines.map((line, idx) => {
        if (idx === highlightLineIndex) {
          // Strip HTML tags for highlighting
          const cleanLine = line.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
          const cleanLower = cleanLine.toLowerCase();
          const startIdx = cleanLower.indexOf(quoteNorm);
          if (startIdx !== -1) {
            const before = cleanLine.substring(0, startIdx);
            const match = cleanLine.substring(startIdx, startIdx + quote.length);
            const after = cleanLine.substring(startIdx + quote.length);
            return `${before}<mark class="bg-yellow-300 dark:bg-yellow-700 highlight-target">${match}</mark>${after}`;
          }
        }
        return line.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      }).join('\n');
      const contextHtml = parseMarkdown(contextMd);
      
      return <div ref={tableRef} className="p-2"><div className="text-xs leading-relaxed max-w-none" dangerouslySetInnerHTML={{ __html: contextHtml }} /></div>;
    }
    
    // Fallback: if quote not found in lines, search entire content
    const contentLower = normalizeForSearch(file.content);
    if (contentLower.includes(quoteNorm)) {
      const startIdx = contentLower.indexOf(quoteNorm);
      const contextStart = Math.max(0, startIdx - 200);
      const contextEnd = Math.min(file.content.length, startIdx + quote.length + 200);
      const contextText = file.content.substring(contextStart, contextEnd);
      const before = contextText.substring(0, startIdx - contextStart);
      const match = contextText.substring(startIdx - contextStart, startIdx - contextStart + quote.length);
      const after = contextText.substring(startIdx - contextStart + quote.length);
      const highlighted = `${before}<mark class="bg-yellow-300 dark:bg-yellow-700 highlight-target">${match}</mark>${after}`;
      const contextHtml = parseMarkdown(highlighted);
      
      return <div ref={tableRef} className="p-2"><div className="text-xs leading-relaxed max-w-none" dangerouslySetInnerHTML={{ __html: contextHtml }} /></div>;
    } else {
      // Quote not found, but render the section mentioned in location
      const locationMatch = location.match(/Section\s+([\d.]+\s+[A-Z\s&]+)/i);
      if (locationMatch) {
        const sectionName = locationMatch[1].trim();
        const sectionLines = lines.filter(line => line.toLowerCase().includes(sectionName.toLowerCase()));
        if (sectionLines.length > 0) {
          const sectionIdx = lines.findIndex(line => line.toLowerCase().includes(sectionName.toLowerCase()));
          const contextStart = Math.max(0, sectionIdx - 1);
          const contextEnd = Math.min(lines.length, sectionIdx + 10);
          const contextMd = lines.slice(contextStart, contextEnd).join('\n');
          const contextHtml = parseMarkdown(contextMd);
          
          return <div ref={tableRef} className="p-2"><div className="text-xs leading-relaxed max-w-none" dangerouslySetInnerHTML={{ __html: contextHtml }} /></div>;
        }
      }
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