import React, { useState, useEffect, useRef } from 'react';
import { X, Image, Trash2, Download, Copy, Eye } from 'lucide-react';
import { Snapshot } from '../services/snapshotService';
import { mindMapCache } from '../services/mindMapCache';

interface GraphicsLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onDownloadSnapshot: (snapshot: Snapshot) => void;
  onCopySnapshot: (snapshot: Snapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onOpenMindMap: (fileId: string, modelId: string, data: any, fileName: string) => void;
}

const GraphicsLibrary: React.FC<GraphicsLibraryProps> = ({
  isOpen,
  onClose,
  snapshots,
  onDownloadSnapshot,
  onCopySnapshot,
  onDeleteSnapshot,
  onOpenMindMap
}) => {
  const [activeTab, setActiveTab] = useState<'mindmaps' | 'snapshots'>('mindmaps');
  const libraryRef = useRef<HTMLDivElement>(null);

  const mindMaps = Object.values(mindMapCache.getAll());

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryRef.current && !libraryRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Delay attachment to avoid closing on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = mindMaps.length + snapshots.length;

  return (
    <div ref={libraryRef} className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-[100] max-h-[400px] flex flex-col">
      <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase flex items-center justify-between">
        <span>Graphics Library</span>
        <span className="text-[#666666] dark:text-[#a0a0a0]">{totalCount}</span>
      </div>

      <div className="flex border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('mindmaps')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'mindmaps'
              ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-[#1a1a1a] border-b-2 border-purple-600'
              : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]'
          }`}
        >
          Mind Maps ({mindMaps.length})
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'snapshots'
              ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1a1a1a] border-b-2 border-blue-600'
              : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#222222]'
          }`}
        >
          Snapshots ({snapshots.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'mindmaps' ? (
          mindMaps.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-sm text-[#666666] dark:text-[#a0a0a0] mb-1">No mind maps yet</div>
              <div className="text-xs text-[#999999] dark:text-[#666666]">
                Generate a mind map from any document
              </div>
            </div>
          ) : (
            <div className="p-1 space-y-1">
              {mindMaps.map(mindMap => (
                <div key={`${mindMap.fileId}-${mindMap.modelId}`} className="p-3 rounded-lg hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] transition-colors">
                  <div className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate mb-1" title={mindMap.fileName}>
                    {mindMap.fileName}
                  </div>
                  <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2">
                    {new Date(mindMap.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#999999] dark:text-[#666666] mb-3">
                    Model: {mindMap.modelId}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onOpenMindMap(mindMap.fileId, mindMap.modelId, mindMap.data, mindMap.fileName)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
                    >
                      <Eye size={12} />
                      Open
                    </button>
                    
                    <button 
                      onClick={() => {
                        const cache = mindMapCache.getAll();
                        delete cache[`${mindMap.fileId}-${mindMap.modelId}`];
                        localStorage.setItem('constructlm_mindmap_cache', JSON.stringify(cache));
                        window.location.reload();
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors ml-auto"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          snapshots.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-sm text-[#666666] dark:text-[#a0a0a0] mb-1">No snapshots yet</div>
              <div className="text-xs text-[#999999] dark:text-[#666666]">
                Click the camera icon to capture your first snapshot
              </div>
            </div>
          ) : (
            <div className="p-1 space-y-1">
              {snapshots.map(snapshot => (
                <div key={snapshot.id} className="p-3 rounded-lg hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-start gap-3">
                    <img 
                      loading="lazy"
                      src={snapshot.dataUrl} 
                      alt={snapshot.name} 
                      className="w-20 h-14 object-cover rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] shadow-sm flex-shrink-0" 
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate mb-1" title={snapshot.name}>
                        {snapshot.name}
                      </div>
                      <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2">
                        {new Date(snapshot.timestamp).toLocaleString()}
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onDownloadSnapshot(snapshot)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        >
                          <Download size={12} />
                        </button>
                        
                        <button 
                          onClick={() => onCopySnapshot(snapshot)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        
                        <button 
                          onClick={() => onDeleteSnapshot(snapshot.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors ml-auto"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>


    </div>
  );
};

export default GraphicsLibrary;
