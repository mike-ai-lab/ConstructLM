import React, { useState } from 'react';
import { X, Eye, Trash2 } from 'lucide-react';
// import { Snapshot } from '../services/snapshotService';
import { mindMapCache } from '../services/mindMapCache';

interface GraphicsLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  // snapshots: Snapshot[];
  // onDownloadSnapshot: (snapshot: Snapshot) => void;
  // onCopySnapshot: (snapshot: Snapshot) => void;
  // onDeleteSnapshot: (id: string) => void;
  onOpenMindMap: (fileId: string, modelId: string, data: any, fileName: string) => void;
}

const GraphicsLibrary: React.FC<GraphicsLibraryProps> = ({
  isOpen,
  onClose,
  // snapshots,
  // onDownloadSnapshot,
  // onCopySnapshot,
  // onDeleteSnapshot,
  onOpenMindMap
}) => {
  // const [activeTab, setActiveTab] = useState<'mindmaps' | 'snapshots'>('mindmaps');

  const mindMaps = Object.values(mindMapCache.getAll());

  if (!isOpen) return null;

  const totalCount = mindMaps.length; // + snapshots.length;

  return (
    <div className="w-full h-full bg-white dark:bg-[#222222] rounded-xl overflow-hidden flex flex-col">
      <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase flex items-center justify-between">
        <span>Mind Maps Library</span>
        <div className="flex items-center gap-3">
          <span className="text-[#666666] dark:text-[#a0a0a0]">{totalCount}</span>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Remove tabs section - show mindmaps directly */}
      {/* <div className="flex border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
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
      </div> */}

      <div className="flex-1 overflow-y-auto">
        {/* Show mindmaps directly - no tab switching */}
        {mindMaps.length === 0 ? (
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
          )}
      </div>


    </div>
  );
};

export default GraphicsLibrary;
