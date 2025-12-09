import React, { useRef, useState, useMemo } from 'react';
import { ProcessedFile } from '../types';
import { FileText, FileSpreadsheet, File as FileIcon, X, Loader2, FolderOpen, Plus, ChevronRight, ChevronDown, Folder } from 'lucide-react';

interface FileSidebarProps {
  files: ProcessedFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  file?: ProcessedFile;
  children: Record<string, TreeNode>;
}

const FileSidebar: React.FC<FileSidebarProps> = ({ files, onUpload, onRemove, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onUpload(e.target.files);
      }
      if (folderInputRef.current) folderInputRef.current.value = '';
  }

  const toggleFolder = (path: string) => {
      const next = new Set(expandedFolders);
      if (next.has(path)) {
          next.delete(path);
      } else {
          next.add(path);
      }
      setExpandedFolders(next);
  };

  const fileTree = useMemo(() => {
      const root: Record<string, TreeNode> = {};

      files.forEach(file => {
          const path = file.path || file.name;
          const parts = path.split('/');
          let currentLevel = root;
          let currentPath = "";

          parts.forEach((part, index) => {
              const isLast = index === parts.length - 1;
              currentPath = currentPath ? `${currentPath}/${part}` : part;

              if (!currentLevel[part]) {
                  currentLevel[part] = {
                      name: part,
                      type: isLast ? 'file' : 'folder',
                      path: currentPath,
                      file: isLast ? file : undefined,
                      children: {}
                  };
              }
              
              if (!isLast) {
                  currentLevel = currentLevel[part].children;
              }
          });
      });
      return root;
  }, [files]);

  const totalTokens = files.reduce((acc, f) => acc + (f.tokenCount || 0), 0);

  const getIcon = (file: ProcessedFile) => {
    switch (file.type) {
      case 'pdf': return <FileText size={14} className="text-rose-500" />;
      case 'excel': return <FileSpreadsheet size={14} className="text-emerald-600" />;
      default: return <FileIcon size={14} className="text-slate-500" />;
    }
  };

  const renderTree = (nodes: Record<string, TreeNode>, depth = 0) => {
      return Object.values(nodes)
        .sort((a, b) => {
            // Folders first, then files
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        })
        .map((node) => {
          if (node.type === 'folder') {
              const isExpanded = expandedFolders.has(node.path) || depth === 0; // Default root folders expanded usually, or modify logic
              
              // If depth 0, we might want to auto-expand or keep manual. Let's rely on state but default closed unless manually toggled?
              // Actually, good UX: auto-expand top level if not many? Let's stick to manual but initialized empty.
              // Wait, let's auto-expand root level for better visibility.
              const actuallyExpanded = expandedFolders.has(node.path) || (!expandedFolders.has(node.path) && depth === 0 && !expandedFolders.size); 
              
              return (
                  <div key={node.path} className="select-none">
                      <div 
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer text-gray-700"
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => toggleFolder(node.path)}
                      >
                          {expandedFolders.has(node.path) ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                          <Folder size={14} className="text-blue-400 fill-blue-50" />
                          <span className="text-xs font-medium truncate">{node.name}</span>
                      </div>
                      {expandedFolders.has(node.path) && (
                          <div>{renderTree(node.children, depth + 1)}</div>
                      )}
                  </div>
              );
          } else {
             const file = node.file!;
             return (
                <div
                    key={file.id}
                    className={`
                        group relative flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all cursor-default
                        ${file.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'}
                    `}
                    style={{ marginLeft: `${depth * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0">
                        {file.status === 'processing' ? <Loader2 size={12} className="animate-spin text-blue-500"/> : getIcon(file)}
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs truncate ${file.status === 'error' ? 'text-red-700' : 'text-gray-600'}`} title={file.name}>
                        {file.name}
                        </span>
                    </div>

                    <button
                        onClick={() => onRemove(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                        title="Remove source"
                    >
                        <X size={12} />
                    </button>
                </div>
             );
          }
      });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
          Sources
        </h2>
        
        <div className="grid grid-cols-2 gap-2 mb-2">
             <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-gray-700 text-xs font-medium rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
             >
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full">
                    <Plus size={14} strokeWidth={3} />
                </div>
                <span>File</span>
            </button>
            <button
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-gray-700 text-xs font-medium rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
             >
                <div className="p-1.5 bg-gray-100 text-gray-600 rounded-full">
                    <FolderOpen size={14} strokeWidth={3} />
                </div>
                <span>Folder</span>
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json" 
            />
            <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderChange}
                {...({ webkitdirectory: "" } as any)}
                multiple
                className="hidden"
            />
        </div>
        
        <div className="flex justify-between items-center px-1">
             <span className="text-[10px] font-medium text-gray-400">{files.length} sources</span>
             {files.length > 0 && (
                <span className="text-[10px] font-medium text-gray-400">~{(totalTokens / 1000).toFixed(0)}k tokens</span>
             )}
        </div>
      </div>
      
      {/* Separator */}
      <div className="h-px bg-gray-200 mx-5 my-2" />

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
        {isProcessing && (
          <div className="flex items-center gap-3 p-3 mx-2 mb-2 text-sm text-blue-700 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-medium">Processing...</span>
          </div>
        )}

        {files.length === 0 && !isProcessing ? (
          <div className="text-center mt-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No sources yet</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Upload PDF drawings, specs, or Excel BOQs to begin analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-8">
              {renderTree(fileTree)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSidebar;