import React from 'react';
import { ProcessedFile } from '../../../types';
import { SPLIT_REGEX, MATCH_REGEX, incrementCitationCounter } from '../utils/citationUtils';
import { safeSplitTableLine } from '../utils/tableUtils';
import { parseInline } from './markdownParsers';
import CitationChip from '../components/CitationChip';
import TableCellWithCitations from './TableCellWithCitations';

interface SimpleMarkdownProps {
  text: string;
  block?: boolean;
  files?: ProcessedFile[];
  onViewDocument?: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
}

const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ text, block = true, files, onViewDocument, onOpenWebViewer, onOpenWebViewerNewTab }) => {
  const processedText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = processedText.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]+\|$/)) {
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      
      const headers = safeSplitTableLine(tableLines[0]);
      
      const tableEl = (
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] text-xs">
            <thead className="bg-[#eaeaea] dark:bg-[#2a2a2a] sticky top-0 z-10">
              <tr>
                {headers.map((cell, idx) => (
                  <th key={idx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1 text-left font-semibold text-[#1a1a1a] dark:text-white bg-[#eaeaea] dark:bg-[#2a2a2a]">
                    {files && onViewDocument ? <TableCellWithCitations text={cell} files={files} onViewDocument={onViewDocument} onOpenWebViewer={onOpenWebViewer} onOpenWebViewerNewTab={onOpenWebViewerNewTab} /> : cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLines.slice(2).map((row, rowIdx) => {
                const cells = safeSplitTableLine(row);
                return (
                  <tr key={rowIdx} className="hover:bg-[#eaeaea] dark:hover:bg-[#222222]">
                    {cells.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.2)] px-2 py-1">
                        {files && onViewDocument ? <TableCellWithCitations text={cell} files={files} onViewDocument={onViewDocument} onOpenWebViewer={onOpenWebViewer} onOpenWebViewerNewTab={onOpenWebViewerNewTab} /> : cell}
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
      elements.push(<h4 key={`h4-${i}`} className="text-sm font-semibold text-[#1a1a1a] dark:text-white mt-2 mb-1">{parseInline(trimmed.slice(5))}</h4>);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white mt-3 mb-1.5">{parseInline(trimmed.slice(4))}</h3>);
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-[#1a1a1a] dark:text-white mt-4 mb-2">{parseInline(trimmed.slice(3))}</h2>);
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={`h1-${i}`} className="text-lg font-bold text-[#1a1a1a] dark:text-white mt-5 mb-2.5">{parseInline(trimmed.slice(2))}</h1>);
      i++;
      continue;
    }

    if (trimmed.match(/^[-*]\s/)) {
      const content = trimmed.replace(/^[-*]\s/, '');
      const parts = content.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
      const contentElements = parts.map((part, partIdx) => {
        const citMatch = part.match(MATCH_REGEX);
        if (citMatch) {
          const citIndex = incrementCitationCounter();
          return (
            <CitationChip
              key={`li-cit-${i}-${partIdx}`}
              index={citIndex}
              fileName={citMatch[1].trim()}
              location={citMatch[2].trim()}
              quote={citMatch[3].trim()}
              files={files || []}
              onViewDocument={onViewDocument || (() => {})}
              onOpenWebViewer={onOpenWebViewer}
              onOpenWebViewerNewTab={onOpenWebViewerNewTab}
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
          const citIndex = incrementCitationCounter();
          return (
            <CitationChip
              key={`ol-cit-${i}-${partIdx}`}
              index={citIndex}
              fileName={citMatch[1].trim()}
              location={citMatch[2].trim()}
              quote={citMatch[3].trim()}
              files={files || []}
              onViewDocument={onViewDocument || (() => {})}
              onOpenWebViewer={onOpenWebViewer}
              onOpenWebViewerNewTab={onOpenWebViewerNewTab}
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

    // Code blocks
    if (trimmed.startsWith('```')) {
      const codeLines = [trimmed.slice(3)];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) j++;
      
      const codeContent = codeLines.join('\n').trim();
      elements.push(
        <pre key={`code-${i}`} className="bg-[#eaeaea] dark:bg-[#2a2a2a] rounded-lg p-3 my-2 overflow-x-auto">
          <code className="text-[13px] font-mono text-[#1a1a1a] dark:text-white">{codeContent}</code>
        </pre>
      );
      i = j;
      continue;
    }

    // Normal paragraph with citations
    const lineContent = lines[i];
    const lineParts = lineContent.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
    const lineElements = lineParts.map((part, partIdx) => {
      const citMatch = part.match(MATCH_REGEX);
      if (citMatch) {
        const citIndex = incrementCitationCounter();
        const fileName = citMatch[1].trim();
        const location = citMatch[2].trim();
        const quote = citMatch[3].trim();
        return (
          <CitationChip
            key={`line-cit-${i}-${partIdx}`}
            index={citIndex}
            fileName={fileName}
            location={location}
            quote={quote}
            files={files || []}
            onViewDocument={onViewDocument || (() => {})}
            onOpenWebViewer={onOpenWebViewer}
            onOpenWebViewerNewTab={onOpenWebViewerNewTab}
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
    return <span className="text-[#1a1a1a] dark:text-white leading-7">{elements}</span>;
  }
};

export default SimpleMarkdown;
