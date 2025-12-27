import React, { useState } from 'react';
import { ProcessedFile } from '../types';
import { X, ZoomIn, ZoomOut, FileText, FileSpreadsheet, File as FileIcon, Table } from 'lucide-react';
import PdfViewer from './DocumentViewer/PdfViewer';
import ExcelViewer from './DocumentViewer/ExcelViewer';
import CsvViewer from './DocumentViewer/CsvViewer';
import TextViewer from './DocumentViewer/TextViewer';
import MarkdownViewer from './DocumentViewer/MarkdownViewer';

interface DocumentViewerProps {
  file: ProcessedFile;
  initialPage?: number;
  highlightQuote?: string;
  location?: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, initialPage = 1, highlightQuote, location, onClose }) => {
  const isPdf = file.type === 'pdf';
  const [viewScale, setViewScale] = useState(1);
  const [textScale, setTextScale] = useState(1.0);

  const handleZoomOut = () => {
    if (isPdf) setViewScale(s => Math.max(0.5, s - 0.2));
    else setTextScale(s => Math.max(0.5, s - 0.1));
  };

  const handleZoomIn = () => {
    if (isPdf) setViewScale(s => Math.min(8, s + 0.2));
    else setTextScale(s => Math.min(2.0, s + 0.1));
  };

  const handleResetZoom = () => {
    if (isPdf) setViewScale(1);
    else setTextScale(1.0);
  };

  const getFileIcon = () => {
    if (file.type === 'pdf') return <FileText size={18} />;
    if (file.type === 'excel') return <FileSpreadsheet size={18} />;
    if (file.type === 'csv') return <Table size={18} />;
    if (file.type === 'markdown') return <FileText size={18} />;
    return <FileIcon size={18} />;
  };

  const currentScaleDisplay = isPdf ? viewScale : textScale;

  return (
    <div className="flex flex-col h-full w-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
      <div className="flex-none h-[65px] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-1.5 rounded ${file.type === 'pdf' ? 'bg-rose-50 text-rose-500' : file.type === 'excel' ? 'bg-emerald-50 text-emerald-600' : file.type === 'csv' ? 'bg-blue-50 text-blue-600' : file.type === 'markdown' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-500'}`}>
            {getFileIcon()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-semibold text-[#1a1a1a] dark:text-white text-sm truncate max-w-[200px]" title={file.name}>{file.name}</h3>
            <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] font-medium">
              {file.type === 'excel' && location ? location : (file.type === 'excel' ? 'Spreadsheet View' : file.type === 'pdf' ? 'PDF View' : file.type === 'csv' ? 'CSV Table' : file.type === 'markdown' ? 'Markdown View' : 'Text View')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg p-0.5 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
            <button onClick={handleZoomOut} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all"><ZoomOut size={14} /></button>
            <span className="text-[12px] w-10 text-center font-medium text-[#666666] dark:text-[#a0a0a0]">{Math.round(currentScaleDisplay * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all"><ZoomIn size={14} /></button>
            {isPdf && <button onClick={handleResetZoom} className="p-1.5 hover:bg-white dark:hover:bg-[#222222] hover:shadow-sm rounded-md text-[#666666] dark:text-[#a0a0a0] transition-all text-[12px]" title="Reset">⟲</button>}
          </div>
          <div className="h-4 w-px bg-[rgba(0,0,0,0.15)] dark:bg-[rgba(255,255,255,0.05)]"></div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-[#a0a0a0] hover:text-[#ef4444] rounded-lg transition-colors" title="Close Viewer">
            <X size={18} />
          </button>
        </div>
      </div>

      {isPdf && (
        <PdfViewer 
          file={file} 
          initialPage={initialPage} 
          highlightQuote={highlightQuote}
          viewScale={viewScale}
          setViewScale={setViewScale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
        />
      )}
      {file.type === 'excel' && (
        <ExcelViewer 
          file={file} 
          location={location}
          textScale={textScale}
        />
      )}
      {file.type === 'csv' && (
        <CsvViewer 
          file={file} 
          textScale={textScale}
        />
      )}
      {file.type === 'markdown' && (
        <MarkdownViewer 
          file={file} 
          textScale={textScale}
          highlightQuote={highlightQuote}
        />
      )}
      {!isPdf && file.type !== 'excel' && file.type !== 'csv' && file.type !== 'markdown' && (
        <TextViewer 
          file={file} 
          highlightQuote={highlightQuote}
          textScale={textScale}
        />
      )}
    </div>
  );
};

export default DocumentViewer;
