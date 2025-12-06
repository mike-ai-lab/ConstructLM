import React, { useRef } from 'react';
import { ProcessedFile } from '../types';
import { Upload, FileText, FileSpreadsheet, File, X, Loader2, FolderOpen } from 'lucide-react';

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
    // Reset value to allow re-uploading same files if needed
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
      case 'pdf': return <FileText size={18} className="text-red-500" />;
      case 'excel': return <FileSpreadsheet size={18} className="text-green-600" />;
      default: return <File size={18} className="text-gray-500" />;
    }
  };

  // Calculate total tokens
  const totalTokens = files.reduce((acc, f) => acc + (f.tokenCount || 0), 0);

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FolderOpen className="text-blue-600" />
          Project Files
        </h2>
        <p className="text-xs text-gray-500 mt-1">
            {files.length} sources | ~{(totalTokens / 1000).toFixed(1)}k tokens
        </p>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
             {/* File Upload Button */}
            <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
            <Upload size={16} />
            Add Files
            </button>
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,.txt"
            />

             {/* Folder Upload Button */}
             <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
            <FolderOpen size={16} />
            Add Folder
            </button>
            <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderChange}
            {...({ webkitdirectory: "" } as any)}
            multiple
            className="hidden"
            />
        </div>
       
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <Loader2 size={14} className="animate-spin" />
            <span>Processing documents...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="text-center mt-10 p-4">
            <p className="text-sm text-gray-400">No files loaded.</p>
            <p className="text-xs text-gray-400 mt-1">Upload PDFs, BOQs, or specs to begin context-aware chat.</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                    {getIcon(file.type)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate block" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {file.type} • {(file.size / 1024).toFixed(0)}KB
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemove(file.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
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