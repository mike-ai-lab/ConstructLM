import React, { useState } from 'react';
import { Link, Trash2, ExternalLink, CheckCircle, XCircle, Loader, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Source } from '../types';

interface SourcesProps {
  sources: Source[];
  onAddSource: (url: string) => void;
  onDeleteSource: (id: string) => void;
}

const Sources: React.FC<SourcesProps> = ({ sources, onAddSource, onDeleteSource }) => {
  const [newUrl, setNewUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    if (newUrl.trim()) {
      onAddSource(newUrl.trim());
      setNewUrl('');
    }
  };

  return (
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
                    <button
                      onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                      className="p-1.5 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
                      title="View extracted content"
                    >
                      {expandedId === source.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
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
  );
};

export default Sources;
