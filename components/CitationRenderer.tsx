import React from 'react';
import { BookOpen } from 'lucide-react';

interface CitationRendererProps {
  text: string;
}

const CitationRenderer: React.FC<CitationRendererProps> = ({ text }) => {
  // Regex to match {{citation:FileName|Snippet}}
  // We use a non-greedy match for the content inside
  const parts = text.split(/(\{\{citation:.*?\|.*?\}\})/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const match = part.match(/\{\{citation:(.*?)\|(.*?)\}\}/);

        if (match) {
          const fileName = match[1];
          const snippet = match[2];

          return (
            <span key={index} className="relative inline-block ml-1 align-baseline citation-trigger group cursor-help align-middle">
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-blue-600 bg-blue-100 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors">
                <BookOpen size={10} className="mr-[1px]" />
              </span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 citation-tooltip pointer-events-none border border-slate-700">
                <div className="font-semibold text-blue-300 mb-1 border-b border-slate-600 pb-1 truncate flex items-center gap-1">
                  <BookOpen size={10} />
                  {fileName}
                </div>
                <div className="italic text-gray-300 bg-slate-900/50 p-1.5 rounded border-l-2 border-blue-500">
                  "{snippet}"
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default CitationRenderer;