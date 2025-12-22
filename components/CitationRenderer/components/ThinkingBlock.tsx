import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SimpleMarkdown from '../markdown/SimpleMarkdown';

interface ThinkingBlockProps {
  content: string;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc] transition-colors mb-2"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs italic">Model Reasoning</span>
      </button>
      {isExpanded && (
        <div className="border-l-2 border-[#cccccc] dark:border-[#444444] pl-4 italic text-[#666666] dark:text-[#a0a0a0] text-sm">
          <SimpleMarkdown text={content} block={true} />
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
