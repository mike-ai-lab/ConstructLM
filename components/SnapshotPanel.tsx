import React, { useState, useEffect } from 'react';
import { Download, Copy, X, FileText, Trash2, Eye, ZoomIn, ZoomOut, MessageCircle, File } from 'lucide-react';
import { Snapshot } from '../services/snapshotService';

interface SnapshotPanelProps {
  snapshots: Snapshot[];
  isOpen: boolean;
  onClose: () => void;
  onDownload: (snapshot: Snapshot) => void;
  onCopy: (snapshot: Snapshot) => void;
  onDelete: (id: string) => void;
}

const SnapshotPanel: React.FC<SnapshotPanelProps> = ({
  snapshots,
  isOpen,
  onClose,
  onDownload,
  onCopy,
  onDelete
}) => {
  const [viewingSnapshot, setViewingSnapshot] = useState<Snapshot | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!viewingSnapshot) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingSnapshot(null);
        setZoomLevel(1);
      }
      if (e.key === '+' || e.key === '=') setZoomLevel(z => Math.min(3, z + 0.25));
      if (e.key === '-' || e.key === '_') setZoomLevel(z => Math.max(0.25, z - 0.25));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewingSnapshot]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[500px]">
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Snapshots</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {snapshots.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-1">No snapshots yet</div>
            <div className="text-xs text-gray-400">
              Click the camera icon to capture your first snapshot
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {snapshots.map(snapshot => (
              <div key={snapshot.id} className="group p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 cursor-pointer" onClick={() => { setZoomLevel(1); setViewingSnapshot(snapshot); }}>
                    <img 
                      loading="lazy"
                      src={snapshot.dataUrl} 
                      alt={snapshot.name} 
                      className="w-20 h-14 object-cover rounded border border-gray-200 shadow-sm hover:shadow-md transition-shadow" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded border border-transparent group-hover:border-gray-300 flex items-center justify-center">
                      <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate mb-1" title={snapshot.name}>
                      {snapshot.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </div>
                    {snapshot.metadata && (
                      <div className="text-xs text-gray-400 mb-3 space-y-1">
                        {snapshot.metadata.fileCount !== undefined && (
                          <div className="flex items-center gap-1"><File size={10} /> {snapshot.metadata.fileCount} files</div>
                        )}
                        {snapshot.metadata.messageCount !== undefined && (
                          <div className="flex items-center gap-1"><MessageCircle size={10} /> {snapshot.metadata.messageCount} messages</div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setZoomLevel(1); setViewingSnapshot(snapshot); }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                        title="View snapshot"
                      >
                        <Eye size={12} />
                        View
                      </button>
                      
                      <button 
                        onClick={() => onDownload(snapshot)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Download snapshot"
                      >
                        <Download size={12} />
                        Download
                      </button>
                      
                      <button 
                        onClick={() => onCopy(snapshot)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      
                      <button 
                        onClick={() => onDelete(snapshot.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors ml-auto"
                        title="Delete snapshot"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {snapshots.length > 0 && !viewingSnapshot && (
        <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
          Snapshots are stored locally in your browser
        </div>
      )}
      
      {/* Image Viewing Modal */}
      {viewingSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]" onClick={() => setViewingSnapshot(null)}>
          <div className="relative max-w-[95vw] max-h-[95vh] bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{viewingSnapshot.name}</h3>
                <p className="text-sm text-gray-500">{new Date(viewingSnapshot.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(0.25, prev - 0.25))}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  onClick={() => setZoomLevel(1)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={() => { setViewingSnapshot(null); setZoomLevel(1); }}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Image Container */}
            <div className="overflow-auto max-h-[80vh] bg-gray-100">
              <div className="p-4 flex justify-center">
                <img 
                  src={viewingSnapshot.dataUrl} 
                  alt={viewingSnapshot.name}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', maxWidth: '90vw' }}
                  className="max-w-none transition-transform duration-200 shadow-lg rounded"
                  onDoubleClick={() => setZoomLevel(1)}
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
              <div className="flex gap-2">
                <button 
                  onClick={() => onDownload(viewingSnapshot)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  onClick={() => onCopy(viewingSnapshot)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <button 
                onClick={() => { onDelete(viewingSnapshot.id); setViewingSnapshot(null); setZoomLevel(1); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotPanel;