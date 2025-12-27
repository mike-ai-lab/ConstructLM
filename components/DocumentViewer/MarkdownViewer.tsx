import React, { useMemo, useEffect, useRef } from 'react';
import { ProcessedFile } from '../../types';

interface MarkdownViewerProps {
  file: ProcessedFile;
  textScale: number;
  highlightQuote?: string;
}

const parseMarkdown = (md: string, highlightQuote?: string): string => {
  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType = '';
  let inHtmlBlock = false;
  let htmlBlockContent: string[] = [];
  const quoteNorm = highlightQuote?.toLowerCase().trim();

  const flushList = () => {
    if (listItems.length > 0) {
      const tag = listType === 'ol' ? 'ol' : 'ul';
      result.push(`<${tag}>${listItems.join('')}</${tag}>`);
      listItems = [];
      inList = false;
    }
  };

  const processInline = (text: string): string => {
    let processed = text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto" onerror="this.style.display=\'none\'" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    if (quoteNorm && processed.toLowerCase().includes(quoteNorm)) {
      const lowerProcessed = processed.toLowerCase();
      const startIdx = lowerProcessed.indexOf(quoteNorm);
      if (startIdx !== -1) {
        const before = processed.substring(0, startIdx);
        const match = processed.substring(startIdx, startIdx + highlightQuote!.length);
        const after = processed.substring(startIdx + highlightQuote!.length);
        processed = `${before}<mark class="bg-yellow-300 dark:bg-yellow-700 highlight-target">${match}</mark>${after}`;
      }
    }
    return processed;
  };

  const parseMarkdownTable = (tableLines: string[]): string => {
    if (tableLines.length < 2) return '';
    const headers = tableLines[0].split('|').filter(h => h.trim()).map(h => h.trim());
    const rows = tableLines.slice(2).map(row => 
      row.split('|').filter(c => c.trim()).map(c => c.trim())
    );
    
    let table = '<table class="min-w-full border-collapse border border-gray-300 dark:border-gray-600 my-4"><thead class="bg-gray-100 dark:bg-gray-800"><tr>';
    headers.forEach(h => {
      table += `<th class="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold">${processInline(h)}</th>`;
    });
    table += '</tr></thead><tbody>';
    rows.forEach(row => {
      table += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-900">';
      row.forEach(cell => {
        table += `<td class="border border-gray-300 dark:border-gray-600 px-3 py-2">${processInline(cell)}</td>`;
      });
      table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('<table') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote')) {
      flushList();
      inHtmlBlock = true;
      htmlBlockContent.push(line);
      continue;
    }

    if (inHtmlBlock) {
      htmlBlockContent.push(line);
      if (trimmed.endsWith('</table>') || trimmed.endsWith('</div>') || trimmed.endsWith('</blockquote>')) {
        result.push(htmlBlockContent.join('\n'));
        htmlBlockContent = [];
        inHtmlBlock = false;
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushList();
      if (inCodeBlock) {
        result.push(`<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono">${codeBlockContent.join('\n')}</code></pre>`);
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

    if (trimmed.includes('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|?[-:\s|]+\|?$/)) {
      flushList();
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().includes('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      result.push(parseMarkdownTable(tableLines));
      i = j - 1;
      continue;
    }

    if (trimmed.startsWith('######')) {
      flushList();
      result.push(`<h6 class="text-base font-semibold mt-4 mb-2">${processInline(trimmed.slice(6).trim())}</h6>`);
    } else if (trimmed.startsWith('#####')) {
      flushList();
      result.push(`<h5 class="text-lg font-semibold mt-4 mb-2">${processInline(trimmed.slice(5).trim())}</h5>`);
    } else if (trimmed.startsWith('####')) {
      flushList();
      result.push(`<h4 class="text-xl font-semibold mt-5 mb-2">${processInline(trimmed.slice(4).trim())}</h4>`);
    } else if (trimmed.startsWith('###')) {
      flushList();
      result.push(`<h3 class="text-2xl font-bold mt-6 mb-3">${processInline(trimmed.slice(3).trim())}</h3>`);
    } else if (trimmed.startsWith('##')) {
      flushList();
      result.push(`<h2 class="text-3xl font-bold mt-8 mb-4">${processInline(trimmed.slice(2).trim())}</h2>`);
    } else if (trimmed.startsWith('#')) {
      flushList();
      result.push(`<h1 class="text-4xl font-bold mt-10 mb-5">${processInline(trimmed.slice(1).trim())}</h1>`);
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***') || trimmed.startsWith('___')) {
      flushList();
      result.push('<hr class="my-6 border-gray-300 dark:border-gray-700" />');
    } else if (trimmed.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      const content = trimmed.replace(/^\d+\.\s/, '');
      listItems.push(`<li class="ml-6 my-1">${processInline(content)}</li>`);
    } else if (trimmed.match(/^[-*+]\s\[(x|X| )\]/)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const checked = trimmed.match(/\[(x|X)\]/) ? 'checked' : '';
      const content = trimmed.replace(/^[-*+]\s\[(x|X| )\]\s*/, '');
      listItems.push(`<li class="ml-6 my-1"><input type="checkbox" ${checked} disabled class="mr-2" />${processInline(content)}</li>`);
    } else if (trimmed.match(/^[-*+]\s/)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const content = trimmed.replace(/^[-*+]\s/, '');
      listItems.push(`<li class="ml-6 my-1">${processInline(content)}</li>`);
    } else if (trimmed.startsWith('>')) {
      flushList();
      result.push(`<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-700 dark:text-gray-300">${processInline(trimmed.slice(1).trim())}</blockquote>`);
    } else if (trimmed === '') {
      flushList();
      result.push('<br />');
    } else {
      flushList();
      result.push(`<p class="my-3 leading-7">${processInline(trimmed)}</p>`);
    }
  }

  flushList();
  return result.join('\n');
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ file, textScale, highlightQuote }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlContent = useMemo(() => parseMarkdown(file.content, highlightQuote), [file.content, highlightQuote]);
  
  useEffect(() => {
    if (highlightQuote && containerRef.current) {
      setTimeout(() => {
        const target = containerRef.current?.querySelector('.highlight-target');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightQuote, htmlContent]);
  
  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-white dark:bg-[#1a1a1a] p-6">
      <div 
        className="markdown-content max-w-4xl mx-auto text-gray-900 dark:text-gray-100"
        style={{ fontSize: `${textScale}rem` }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};

export default MarkdownViewer;
