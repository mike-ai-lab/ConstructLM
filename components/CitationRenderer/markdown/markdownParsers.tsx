import React from 'react';
import { SPLIT_REGEX, MATCH_REGEX } from '../utils/citationUtils';

export const parseInline = (text: string, renderCitation?: (match: RegExpMatchArray, index: number) => React.ReactNode): React.ReactNode[] => {
  // First, split by citations
  const citationParts = text.split(SPLIT_REGEX);
  
  return citationParts.map((part, partIndex) => {
    // Check if this part is a citation
    const citationMatch = part.match(MATCH_REGEX);
    if (citationMatch && renderCitation) {
      return renderCitation(citationMatch, partIndex);
    }
    
    // Otherwise, parse as regular markdown (bold, italic, code)
    const parts = part.split(/(\*\*.*?\*\*)/g);
    return parts.map((subPart, index) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return <strong key={`${partIndex}-${index}`} className="font-semibold text-[#1a1a1a] dark:text-white">{subPart.slice(2, -2)}</strong>;
      }
      const italicParts = subPart.split(/((?<!\*)\*(?!\*)[^\s*].*?(?<!\*)\*(?!\*))/g);
      return italicParts.map((sub, subIdx) => {
        if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2 && !sub.startsWith('**')) {
          return <em key={`${partIndex}-${index}-${subIdx}`} className="italic text-[#1a1a1a] dark:text-white">{sub.slice(1, -1)}</em>;
        }
        const codeParts = sub.split(/(`[^`]+`)/g);
        return codeParts.map((code, codeIdx) => {
          if (code.startsWith('`') && code.endsWith('`')) {
            return <code key={`${partIndex}-${index}-${subIdx}-${codeIdx}`} className="px-1.5 py-0.5 bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] rounded text-[13px] font-mono text-[#1a1a1a] dark:text-white">{code.slice(1, -1)}</code>;
          }
          return code;
        });
      }).flat();
    }).flat();
  }).flat();
};
