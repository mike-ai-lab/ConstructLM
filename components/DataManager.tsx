import React, { useState, useEffect } from 'react';
import { ProcessedFile } from '../types';
import { ragService } from '../services/ragService';
import { Search, Database, Trash2, RefreshCw, FileText, Clock, CheckCircle } from 'lucide-react';

interface DataManagerProps {
  files: ProcessedFile[];
  onClose: () => void;
}

interface IndexStats {
  totalChunks: number;
  totalFiles: number;
  lastIndexed: number | null;
  isReady: boolean;
}

const DataManager: React.FC<DataManagerProps> = ({ files, onClose }) => {
  const [indexStats, setIndexStats] = useState<IndexStats>({
    totalChunks: 0,
    totalFiles: 0,
    lastIndexed: null,
    isReady: false
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadStats();
    ragService.loadIndex();
  }, []);

  const loadStats = async () => {
    const stats = await ragService.getIndexStats();
    setIndexStats(stats);
  };

  const handleIndexDocuments = async () => {
    if (files.length === 0) return;
    
    setIsIndexing(true);
    try {
      await ragService.indexDocuments(files);
      await loadStats();
    } catch (error) {
      console.error('Indexing failed:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await ragService.searchRelevantChunks(searchQuery, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearIndex = async () => {
    if (confirm('Are you sure you want to clear all indexed data?')) {
      await ragService.clearIndex();
      await loadStats();
      setSearchResults([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Data Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Index Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Database size={18} />
              Index Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Files:</span>
                <div className="font-semibold">{indexStats.totalFiles}</div>
              </div>
              <div>
                <span className="text-gray-600">Chunks:</span>
                <div className="font-semibold">{indexStats.totalChunks}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className={`font-semibold ${indexStats.isReady ? 'text-green-600' : 'text-red-600'}`}>
                  {indexStats.isReady ? 'Ready' : 'Not Indexed'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <div className="font-semibold">
                  {indexStats.lastIndexed 
                    ? new Date(indexStats.lastIndexed).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <button
              onClick={handleIndexDocuments}
              disabled={isIndexing || files.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIndexing ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <CheckCircle size={16} />
              )}
              {isIndexing ? 'Indexing...' : 'Index Documents'}
            </button>
            
            <button
              onClick={handleClearIndex}
              disabled={!indexStats.isReady}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              Clear Index
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Search size={18} />
              Semantic Search
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search through your documents..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!indexStats.isReady}
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || !indexStats.isReady || isSearching}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Search size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Search Results ({searchResults.length})</h3>
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span className="font-medium text-sm">{result.chunk.fileName}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Score: {(result.relevanceScore * 100).toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {result.chunk.content}
                    </p>
                    {result.chunk.metadata?.page && (
                      <div className="mt-2 text-xs text-gray-500">
                        Page {result.chunk.metadata.page}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="text-center text-gray-500 py-8">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManager;