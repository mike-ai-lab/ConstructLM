import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ProcessedFile } from '../types';
import { ChatMetadata } from '../services/chatRegistry';
import { FileText, FileSpreadsheet, File as FileIcon, X, Loader2, FolderOpen, Plus, ChevronRight, ChevronDown, Folder, Image, MessageCircle, Files, BookOpen, Minus } from 'lucide-react';
import ChatHistory from './ChatHistory';
import DocumentViewer from './DocumentViewer';

interface FileSidebarProps {
  files: ProcessedFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
  // Chat history props
  chats: ChatMetadata[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  file?: ProcessedFile;
  children: Record<string, TreeNode>;
}

const FileSidebar: React.FC<FileSidebarProps> = ({ 
  files, onUpload, onRemove, isProcessing,
  chats, activeChatId, onSelectChat, onCreateChat, onDeleteChat 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'files' | 'chats'>('files');

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

  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  
  const totalTokens = files.reduce((acc, f) => acc + (f.tokenCount || 0), 0);

  const getIcon = (file: ProcessedFile) => {
    switch (file.type) {
      case 'pdf': return <FileText size={14} className="text-rose-500" />;
      case 'excel': return <FileSpreadsheet size={14} className="text-emerald-600" />;
      case 'image': return <Image size={14} className="text-purple-500" />;
      case 'document': return <FileText size={14} className="text-blue-500" />;
      default: return <FileIcon size={14} className="text-slate-500" />;
    }
  };

  const renderTree = (nodes: Record<string, TreeNode>, depth = 0) => {
      return Object.values(nodes)
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        })
        .map((node) => {
          if (node.type === 'folder') {
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', `@${file.name}`);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`
                        group relative flex items-center gap-2 px-2 py-2 rounded-md transition-all cursor-grab active:cursor-grabbing
                        ${file.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'}
                    `}
                    style={{ marginLeft: `${depth * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0">
                        {file.status === 'processing' ? <Loader2 size={12} className="animate-spin text-blue-500"/> : getIcon(file)}
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs ${file.status === 'error' ? 'text-red-700' : 'text-gray-700 font-medium'}`} title={file.name}>
                        {file.name}
                        </span>
                        {file.pageCount && (
                          <span className="text-[10px] text-gray-400">{file.pageCount} pages</span>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewFileId(file.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 rounded transition-all"
                        title="Preview"
                    >
                        <BookOpen size={12} />
                    </button>
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

  const previewFile = previewFileId ? files.find(f => f.id === previewFileId) : null;

  return (
    <>
    <div className="flex flex-col h-full w-full">
      {/* Tab Navigation */}
      <div className="flex border-b-2 border-slate-300 bg-slate-200">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'files' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Files size={16} />
            Sources
          </div>
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chats' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageCircle size={16} />
            Chats
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'files' ? (
        <div className="flex flex-col h-full w-full">
          {/* Header */}
      <div className="px-5 pt-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Sources
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Add File"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Add Folder"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>
        <div className="hidden">

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx" 
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
              Upload documents, images, spreadsheets, or drag files anywhere to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-8">
              {renderTree(fileTree)}
          </div>
        )}
        </div>
        </div>
      ) : (
        <ChatHistory
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onCreateChat={onCreateChat}
          onDeleteChat={onDeleteChat}
        />
      )}
      
    </div>
    {previewFile && (
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFileId(null)} />
    )}
    </>
  );
};

const FilePreviewModal: React.FC<{ file: ProcessedFile; onClose: () => void }> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[90vw] h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <FilePreviewViewer file={file} onClose={onClose} />
      </div>
    </div>
  );
};

const FilePreviewViewer: React.FC<{ file: ProcessedFile; onClose: () => void }> = ({ file, onClose }) => {
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (file.type === 'pdf' && file.fileHandle instanceof File) {
      const loadPdf = async () => {
        try {
          if (window.pdfWorkerReady) await window.pdfWorkerReady;
          const arrayBuffer = await (file.fileHandle as File).arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
        } catch (err) {
          console.error('PDF load error:', err);
          setLoading(false);
        }
      };
      loadPdf();
    } else {
      setLoading(false);
    }
  }, [file]);

  const isPdf = file.type === 'pdf';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={18} />
          <span className="font-semibold">{file.name}</span>
          {isPdf && numPages > 0 && <span className="text-sm text-gray-500">({numPages} pages)</span>}
        </div>
        <div className="flex items-center gap-2">
          {isPdf && (
            <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white rounded"><Minus size={14} /></button>
              <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-white rounded"><Plus size={14} /></button>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded"><X size={18} /></button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-100 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
        ) : isPdf && pdfDoc ? (
          <div className="space-y-4">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPageRenderer key={i} pdf={pdfDoc} pageNum={i + 1} scale={scale} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded max-w-4xl mx-auto">
            <pre className="whitespace-pre-wrap text-sm">{file.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

const PdfPageRenderer: React.FC<{ pdf: any; pageNum: number; scale: number }> = ({ pdf, pageNum, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageWidth(viewport.width);
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
      }
    };
    render();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNum, scale]);

  return (
    <div className="bg-white shadow-lg mx-auto" style={{ width: pageWidth || 'auto' }}>
      <canvas ref={canvasRef} className="block" />
      <div className="text-center text-xs text-gray-400 py-2">Page {pageNum}</div>
    </div>
  );
};

export default FileSidebar;