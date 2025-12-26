import React from 'react';
import { ProcessedFile } from '../../../types';
import { SPLIT_REGEX, MATCH_REGEX, incrementCitationCounter } from '../utils/citationUtils';
import CitationChip from '../components/CitationChip';

interface TableCellWithCitationsProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onOpenWebViewer?: (url: string) => void;
}

const TableCellWithCitations: React.FC<TableCellWithCitationsProps> = ({ text, files, onViewDocument, onOpenWebViewer }) => {
  let decodedText = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const parts = decodedText.split(SPLIT_REGEX).filter(p => p !== undefined && p !== null);
  
  return (
    <span className="inline">
      {parts.map((part, index) => {
        const match = part.match(MATCH_REGEX);
        if (match) {
          const citIndex = incrementCitationCounter();
          const fileName = match[1].trim();
          const location = match[2].trim();
          const quote = match[3].trim();
          return (
            <CitationChip
              key={`cell-cit-${index}-${citIndex}`}
              index={citIndex}
              fileName={fileName}
              location={location}
              quote={quote}
              files={files}
              onViewDocument={onViewDocument}
              onOpenWebViewer={onOpenWebViewer}
            />
          );
        }
        return <span key={`cell-txt-${index}`} className="inline">{part}</span>;
      })}
    </span>
  );
};

export default TableCellWithCitations;
