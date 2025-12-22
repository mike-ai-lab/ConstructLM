import React from 'react';

export const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-[#1a1a1a] dark:text-white">{part.slice(2, -2)}</strong>;
    }
    const italicParts = part.split(/((?<!\*)\*(?!\*)[^\s*].*?(?<!\*)\*(?!\*))/g);
    return italicParts.map((sub, subIdx) => {
      if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2 && !sub.startsWith('**')) {
        return <em key={`${index}-${subIdx}`} className="italic text-[#1a1a1a] dark:text-white">{sub.slice(1, -1)}</em>;
      }
      const codeParts = sub.split(/(`[^`]+`)/g);
      return codeParts.map((code, codeIdx) => {
        if (code.startsWith('`') && code.endsWith('`')) {
          return <code key={`${index}-${subIdx}-${codeIdx}`} className="px-1.5 py-0.5 bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] rounded text-[13px] font-mono text-[#1a1a1a] dark:text-white">{code.slice(1, -1)}</code>;
        }
        return code;
      });
    }).flat();
  }).flat();
};
