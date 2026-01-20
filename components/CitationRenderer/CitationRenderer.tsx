import React from 'react';
import { ProcessedFile } from '../../types';
import { resetCitationCounter, extractSourceFiles } from './utils/citationUtils';
import SimpleMarkdown from './markdown/SimpleMarkdown';
import ThinkingBlock from './components/ThinkingBlock';
import { getTextDirection } from '../../utils/textDirection';

interface CitationRendererProps {
  text: string;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
}

const CitationRenderer: React.FC<CitationRendererProps> = ({ text, files, onViewDocument, onOpenWebViewer, onOpenWebViewerNewTab }) => {
  if (!text) return null;
  resetCitationCounter();

  // Decode ALL HTML entities properly
  const decodeHtml = (html: string): string => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };
  
  let decodedText = decodeHtml(text);
  
  // Extract thinking blocks
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkingBlocks: { content: string; index: number }[] = [];
  let match;
  let textWithoutThinking = decodedText;
  
  while ((match = thinkRegex.exec(decodedText)) !== null) {
    thinkingBlocks.push({ content: match[1].trim(), index: match.index });
  }
  
  // Remove thinking blocks from text
  textWithoutThinking = decodedText.replace(thinkRegex, '');
  
  // Keep newlines for proper markdown formatting (lists, paragraphs)
  const cleanedText = textWithoutThinking;

  // Extract unique source files from citations
  const sourceFiles = extractSourceFiles(cleanedText);

  const textDirection = getTextDirection(cleanedText);

  return (
    <div className="text-sm leading-relaxed" dir={textDirection} style={{ textAlign: textDirection === 'rtl' ? 'right' : 'left' }}>
      {thinkingBlocks.map((block, idx) => (
        <ThinkingBlock key={`think-${idx}`} content={block.content} />
      ))}
      <SimpleMarkdown text={cleanedText} block={true} files={files} onViewDocument={onViewDocument} onOpenWebViewer={onOpenWebViewer} onOpenWebViewerNewTab={onOpenWebViewerNewTab} />
      {sourceFiles.size > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]">
          <div className="text-xs text-[#666666] dark:text-[#a0a0a0] flex items-center gap-2">
            <span className="font-medium">Sources:</span>
            {Array.from(sourceFiles).map((fileName, idx) => (
              <span key={fileName} className="inline-flex items-center">
                {idx > 0 && <span className="mx-1">•</span>}
                <span className="font-mono">{fileName}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationRenderer;
