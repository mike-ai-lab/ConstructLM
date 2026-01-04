import React, { useState, useEffect } from 'react';
import { Link, Trash2, ExternalLink, CheckCircle, XCircle, Loader, ChevronDown, ChevronUp, FileText, Download, Eye } from 'lucide-react';
import { Source } from '../types';
import { createPortal } from 'react-dom';
import DocumentViewer from './DocumentViewer';
import { ProcessedFile } from '../types';

interface SourcesProps {
  sources: Source[];
  onAddSource: (url: string) => void;
  onDeleteSource: (id: string) => void;
  onToggleSource: (id: string) => void;
}

const Sources: React.FC<SourcesProps> = ({ sources, onAddSource, onDeleteSource, onToggleSource }) => {
  const [newUrl, setNewUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const cancelRef = React.useRef(false);

  const handleAdd = () => {
    if (newUrl.trim()) {
      onAddSource(newUrl.trim());
      setNewUrl('');
    }
  };

  const handleDownload = (source: Source) => {
    if (!source.content) return;
    
    const blob = new Blob([source.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${source.title || 'source'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertSourceToFile = async (source: Source): Promise<ProcessedFile | null> => {
    if (!source.content) return null;
    
    const url = source.url.toLowerCase();
    let type: ProcessedFile['type'] = 'text';
    let content = source.content;
    
    // Detect type from URL or content
    if (url.endsWith('.pdf')) type = 'pdf';
    else if (url.endsWith('.xlsx') || url.endsWith('.xls')) {
      type = 'excel';
      // Parse Excel-like content if it's CSV format
      if (!content.includes('--- [Sheet:')) {
        content = `--- [Sheet: Sheet1] ---\n${content}`;
      }
    }
    else if (url.endsWith('.csv')) type = 'csv';
    else if (url.endsWith('.md') || url.endsWith('.markdown')) type = 'markdown';
    else if (url.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) type = 'image';
    // Auto-detect markdown from content
    else if (content.match(/^#{1,6}\s/m) || content.includes('```') || content.match(/\[.*?\]\(.*?\)/)) {
      type = 'markdown';
    }
    // Auto-detect CSV from content
    else if (content.split('\n').slice(0, 5).every(line => line.includes(',') || line.includes('\t'))) {
      type = 'csv';
    }
    
    return {
      id: source.id,
      name: source.title || source.url.split('/').pop() || 'source',
      type,
      content,
      status: 'processed',
      tokenCount: Math.ceil(content.length / 4)
    };
  };

  const handlePreview = async (source: Source) => {
    console.log('🔍 PREVIEW CLICKED:', source.url);
    cancelRef.current = false;
    setIsLoadingPreview(true);
    setPreviewSource(source);
  };

  const handleClosePreview = () => {
    console.log('❌ CLOSE PREVIEW CLICKED');
    cancelRef.current = true;
    setPreviewSource(null);
    setIsLoadingPreview(false);
  };

  return (
    <>
    <div className="h-full flex flex-col bg-white dark:bg-[#1a1a1a]">
      <div className="h-[60px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center px-4 gap-2 bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter URL to add as source..."
          className="flex-1 px-3 py-2 text-sm bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newUrl.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          Add
        </button>
      </div>

      {sources.length > 0 && (
        <div className="px-4 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <p className="text-xs text-[#666666] dark:text-[#a0a0a0] font-medium">
            {sources.filter(s => s.status === 'fetched').length > 0 ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ AI will use {sources.filter(s => s.status === 'fetched').length} fetched source(s)
              </span>
            ) : sources.filter(s => s.status === 'pending').length > 0 ? (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⏳ Fetching {sources.filter(s => s.status === 'pending').length} source(s)... (wait before sending)
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                ✗ {sources.filter(s => s.status === 'error').length} source(s) failed to fetch
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#666666] dark:text-[#a0a0a0]">
            <Link size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">No sources added yet</p>
            <p className="text-xs mt-2 max-w-xs">Add URLs to restrict AI responses to these sources only. The AI will cite every fact with proper references.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden"
            >
              <div className="p-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={source.selected !== false}
                  onChange={() => onToggleSource(source.id)}
                  className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {source.status === 'fetched' && <CheckCircle size={14} className="text-[#666666] dark:text-[#a0a0a0] flex-shrink-0" />}
                    {source.status === 'error' && <XCircle size={14} className="text-[#666666] dark:text-[#a0a0a0] flex-shrink-0" />}
                    {source.status === 'pending' && <Loader size={14} className="text-[#666666] dark:text-[#a0a0a0] flex-shrink-0 animate-spin" />}
                    <span className="text-xs font-medium text-[#1a1a1a] dark:text-white truncate">
                      {source.title || 'Loading...'}
                    </span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{source.url}</span>
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </a>
                  {source.status === 'error' && (
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">Failed to fetch content</p>
                  )}
                  {source.status === 'fetched' && source.content && (
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">
                      Content extracted ({source.content.length} characters)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {source.status === 'fetched' && source.content && (
                    <>
                      <button
                        onClick={() => handlePreview(source)}
                        className="p-1.5 text-[#a0a0a0] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
                        title="Preview content"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(source)}
                        className="p-1.5 text-[#a0a0a0] hover:text-green-600 dark:hover:text-green-400 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
                        title="Download source content"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                        className="p-1.5 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
                        title="View raw text"
                      >
                        {expandedId === source.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDeleteSource(source.id)}
                    className="p-1.5 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
                    title="Delete source"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {expandedId === source.id && source.content && (
                <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-white dark:bg-[#1a1a1a] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={12} className="text-[#a0a0a0]" />
                    <span className="text-xs font-semibold text-[#666666] dark:text-[#a0a0a0]">Extracted Content:</span>
                  </div>
                  <div className="text-xs text-[#1a1a1a] dark:text-white bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                    {source.content}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
    {previewSource && previewSource.content && createPortal(
      <div className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" onClick={handleClosePreview}>
        <div className="h-full w-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          {isLoadingPreview ? (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
              <Loader className="animate-spin text-blue-600" size={32} />
              <p className="text-sm text-[#666666] dark:text-[#a0a0a0]">Loading preview...</p>
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden" style={{ width: '90vw', height: '90vh', maxWidth: '1400px' }}>
              <PreviewContent source={previewSource} onClose={handleClosePreview} onLoaded={() => setIsLoadingPreview(false)} cancelRef={cancelRef} />
            </div>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

const PreviewContent: React.FC<{ source: Source; onClose: () => void; onLoaded: () => void; cancelRef: React.RefObject<boolean> }> = ({ source, onClose, onLoaded, cancelRef }) => {
  const [file, setFile] = useState<ProcessedFile | null>(null);

  useEffect(() => {
    console.log('🚀 PreviewContent MOUNTED');
    const load = async () => {
      console.log('⏳ Starting load...');
      // Small delay to allow cancel to register
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('✅ After delay, cancelRef.current:', cancelRef.current);
      if (cancelRef.current) {
        console.log('🛑 CANCELLED - Stopping load');
        return;
      }
      
      const url = source.url.toLowerCase();
      let type: ProcessedFile['type'] = 'text';
      let content = source.content || '';
      
      console.log('📄 URL:', url);
      console.log('📝 Content length:', content.length);
      console.log('📝 Content preview (first 500 chars):', content.substring(0, 500));
      console.log('📝 Content has newlines:', content.includes('\n'));
      console.log('📝 Number of lines:', content.split('\n').length);
      
      // Detect markdown first - check URL extension or content patterns
      if (url.endsWith('.md') || url.endsWith('.markdown')) {
        type = 'markdown';
        console.log('✅ DETECTED AS MARKDOWN (by extension)');
      }
      // Check content for markdown patterns
      else if (
        content.match(/^#{1,6}\s/m) ||           // Headers
        content.includes('```') ||                // Code blocks
        content.match(/\[.+?\]\(.+?\)/) ||       // Links
        content.match(/^[-*+]\s/m) ||            // Lists
        content.match(/^>\s/m) ||                // Blockquotes
        content.match(/\*\*.+?\*\*/) ||          // Bold
        content.match(/__.+?__/) ||              // Bold alt
        content.match(/\*.+?\*/) ||              // Italic
        content.match(/_.+?_/)                   // Italic alt
      ) {
        type = 'markdown';
        console.log('✅ DETECTED AS MARKDOWN (by content patterns)');
        console.log('  - Has headers:', !!content.match(/^#{1,6}\s/m));
        console.log('  - Has code blocks:', content.includes('```'));
        console.log('  - Has links:', !!content.match(/\[.+?\]\(.+?\)/));
        console.log('  - Has lists:', !!content.match(/^[-*+]\s/m));
        console.log('  - Has blockquotes:', !!content.match(/^>\s/m));
        console.log('  - Has bold:', !!content.match(/\*\*.+?\*\*/));
      }
      // Detect Excel
      else if (url.endsWith('.xlsx') || url.endsWith('.xls')) {
        type = 'excel';
        console.log('✅ DETECTED AS EXCEL');
        if (!content.includes('--- [Sheet:')) {
          content = `--- [Sheet: Sheet1] ---\n${content}`;
        }
      }
      // Detect CSV
      else if (url.endsWith('.csv') || content.split('\n').slice(0, 5).every(line => line.includes(',') || line.includes('\t'))) {
        type = 'csv';
        console.log('✅ DETECTED AS CSV');
      }
      
      console.log('🎯 Final type:', type);
      
      if (cancelRef.current) {
        console.log('🛑 CANCELLED - Before setFile');
        return;
      }
      
      const fileObj = {
        id: source.id,
        name: source.title || source.url.split('/').pop() || 'source',
        type,
        content,
        status: 'processed' as const,
        tokenCount: Math.ceil(content.length / 4)
      };
      
      console.log('📦 Setting file:', fileObj.name, 'type:', fileObj.type);
      setFile(fileObj);
      
      if (!cancelRef.current) {
        console.log('✅ Calling onLoaded');
        onLoaded();
      } else {
        console.log('🛑 CANCELLED - Skipping onLoaded');
      }
    };
    
    load();
  }, [source, onLoaded, cancelRef]);

  if (!file) {
    console.log('⏳ No file yet, showing loader');
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  console.log('🎬 Rendering DocumentViewer with file:', file.name, 'type:', file.type);
  return <DocumentViewer file={file} onClose={onClose} />;
};

export default Sources;
