import React, { useRef } from 'react';
import { ProcessedFile } from '../types';
import { Upload, FileText, FileSpreadsheet, File, X, Loader2, FolderOpen, Plus } from 'lucide-react';

interface FileSidebarProps {
  files: ProcessedFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

const FileSidebar: React.FC<FileSidebarProps> = ({ files, onUpload, onRemove, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  const getIcon = (type: ProcessedFile['type']) => {
    switch (type) {
      case 'pdf': return <FileText size={16} className="text-rose-500" />;
      case 'excel': return <FileSpreadsheet size={16} className="text-emerald-600" />;
      default: return <File size={16} className="text-slate-500" />;
    }
  };

  const totalTokens = files.reduce((acc, f) => acc + (f.tokenCount || 0), 0);

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
                accept=".pdf,.xlsx,.xls,.csv" 
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

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {isProcessing && (
          <div className="flex items-center gap-3 p-3 mx-2 text-sm text-blue-700 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-medium">Analyzing documents...</span>
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
          files.map((file) => (
            <div
              key={file.id}
              className={`
                group relative flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-default
                ${file.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-white border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm'}
              `}
            >
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-gray-50 border border-gray-100">
                  {file.status === 'processing' ? <Loader2 size={14} className="animate-spin text-blue-500"/> : getIcon(file.type)}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-xs font-medium truncate ${file.status === 'error' ? 'text-red-700' : 'text-gray-700'}`} title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                   {file.status === 'error' ? 'Failed' : `${(file.size / 1024).toFixed(0)} KB`}
                </span>
              </div>

              <button
                onClick={() => onRemove(file.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all absolute right-2"
                title="Remove source"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileSidebar;