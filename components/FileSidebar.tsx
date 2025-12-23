import React, { useRef, useState, useMemo, useEffect } from 'react'; 
import { ProcessedFile } from '../types';
import { ChatMetadata } from '../services/chatRegistry';
import { FileText, FileSpreadsheet, File as FileIcon, X, Loader2, FolderOpen, Plus, ChevronRight, ChevronDown, Folder, Image, MessageCircle, Files, BookOpen, Minus, Network } from 'lucide-react';
import ChatHistory from './ChatHistory';
import DocumentViewer from './DocumentViewer';

interface FileSidebarProps {
  files: ProcessedFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
  onGenerateMindMap?: (fileId: string) => void;
  chats: ChatMetadata[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isDragOver: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}

interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  file?: ProcessedFile;
  children: Record<string, TreeNode>;
}

const FileSidebar: React.FC<FileSidebarProps> = ({ 
  files, onUpload, onRemove, isProcessing, onGenerateMindMap,
  chats, activeChatId, onSelectChat, onCreateChat, onDeleteChat,
  isDragOver, onDragStateChange
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
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded cursor-pointer text-[#1a1a1a] dark:text-white"
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => toggleFolder(node.path)}
                      >
                          {expandedFolders.has(node.path) ? <ChevronDown size={14} className="text-[#a0a0a0]"/> : <ChevronRight size={14} className="text-[#a0a0a0]"/>}
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
                        ${file.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}
                    `}
                    style={{ marginLeft: `${depth * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0">
                        {file.status === 'processing' ? <Loader2 size={12} className="animate-spin text-blue-500"/> : getIcon(file)}
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs ${file.status === 'error' ? 'text-red-700' : 'text-[#1a1a1a] dark:text-white font-medium'}`} title={file.name}>
                        {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">
                            {file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k tokens` : 'Processing...'}
                          </span>
                          {file.uploadedAt && (
                            <span className="text-[12px] text-[#a0a0a0]">
                              {new Date(file.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          )}
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewFileId(file.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#a0a0a0] hover:text-[#4485d1] rounded transition-all"
                        title="Preview"
                    >
                        <BookOpen size={12} />
                    </button>
                    {onGenerateMindMap && (
                      <button
                          onClick={(e) => { e.stopPropagation(); onGenerateMindMap(file.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#a0a0a0] hover:text-purple-500 rounded transition-all"
                          title="Generate Mind Map"
                      >
                          <Network size={12} />
                      </button>
                    )}
                    <button
                        onClick={() => onRemove(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#a0a0a0] hover:text-[#ef4444] rounded transition-all"
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
    <div 
      className="flex flex-col h-full w-full relative box-border"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
          onDragStateChange(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
          onUpload(droppedFiles);
        }
      }}
    >
      {/* Drag Indicator */}
      {isDragOver && activeTab === 'files' && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl p-6 border-2 border-dashed border-blue-400">
            <FileText size={32} className="text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">Drop to add sources</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="h-[65px] flex-shrink-0 flex bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.05)]">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 h-full px-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 min-w-0 ${
            activeTab === 'files' 
              ? 'text-[#333333] dark:text-[#cccccc] border-b-2 border-[#4485d1]' 
              : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc]'
          }`}
        >
          <Files size={14} className="flex-shrink-0" />
          <span className="truncate">Sources</span>
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 h-full px-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 min-w-0 ${
            activeTab === 'chats' 
              ? 'text-[#333333] dark:text-[#cccccc] border-b-2 border-[#4485d1]' 
              : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc]'
          }`}
        >
          <MessageCircle size={14} className="flex-shrink-0" />
          <span className="truncate">Chats</span>
        </button>
      </div>

      {/* TAB CONTENT WRAPPER: make both tabs occupy the same sized content area (header height = 65px) */}
      <div style={{ height: 'calc(100% - 65px)' }} className="flex flex-col min-h-0 box-border">
        {activeTab === 'files' ? (
          <div className="flex flex-col min-h-0 w-full relative box-border">
            {/* Toolbar */}
            <div className="px-4 py-2 flex-shrink-0 bg-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">{files.length} sources</span>
                   {files.length > 0 && (
                      <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">• ~{(totalTokens / 1000).toFixed(0)}k tokens</span>
                   )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-1.5 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors disabled:opacity-50"
                    title="Add File"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
                    title="Add Folder"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="hidden">
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx,.xml,.html,.js,.ts,.css,.py,.java,.c,.cpp,.h,.cs" 
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

            {/* File Tree area: make this the scrollable flex-1 area */}
            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar min-h-0">
              {isProcessing && (
                <div className="flex items-center gap-3 p-3 mx-2 mb-2 text-sm text-blue-700 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="font-medium">Processing...</span>
                </div>
              )}

              {files.length === 0 && !isProcessing ? (
                <div className="text-center mt-12 px-6">
                  <div className="w-16 h-16 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-[#a0a0a0]" />
                  </div>
                  <p className="text-sm font-medium text-[#666666] dark:text-[#a0a0a0]">No sources yet</p>
                  <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1 leading-relaxed">
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
    if (file.type === 'pdf' && file.fileHandle) {
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
    } else if (file.type === 'excel' && file.fileHandle) {
      const loadExcel = async () => {
        try {
          let attempts = 0;
          while (!(window as any).XLSX && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          setLoading(false);
        } catch (err) {
          console.error('Excel load error:', err);
          setLoading(false);
        }
      };
      loadExcel();
    } else if (file.type === 'image' && file.fileHandle) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [file]);

  const isPdf = file.type === 'pdf';
  const isImage = file.type === 'image';
  const isExcel = file.type === 'excel';
  const imageUrl = isImage && file.fileHandle ? URL.createObjectURL(file.fileHandle as File) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={18} />
          <span className="font-semibold">{file.name}</span>
          {isPdf && numPages > 0 && <span className="text-sm text-gray-500">({numPages} pages)</span>}
        </div>
        <div className="flex items-center gap-2">
          {(isPdf || isImage) && (
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
        ) : isImage && imageUrl ? (
          <div className="flex items-center justify-center h-full">
            <img src={imageUrl} alt={file.name} className="max-w-full max-h-full object-contain" style={{ transform: `scale(${scale})` }} />
          </div>
        ) : isExcel && file.fileHandle ? (
          <ExcelPreview file={file.fileHandle as File} />
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

const ExcelPreview: React.FC<{ file: File }> = ({ file }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExcel = async () => {
      try {
        let attempts = 0;
        while (!(window as any).XLSX && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!(window as any).XLSX) {
          setHtml('<p>Excel library failed to load</p>');
          setLoading(false);
          return;
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = (window as any).XLSX.read(arrayBuffer, { type: 'array' });
        let fullHtml = '';

        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const sheetHtml = (window as any).XLSX.utils.sheet_to_html(sheet);
          fullHtml += `<div class="mb-6"><h3 class="text-lg font-bold mb-2 text-gray-800">${sheetName}</h3>${sheetHtml}</div>`;
        });

        setHtml(fullHtml);
        setLoading(false);
      } catch (err) {
        console.error('Excel preview error:', err);
        setHtml('<p>Failed to load Excel file</p>');
        setLoading(false);
      }
    };
    loadExcel();
  }, [file]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="bg-white p-8 rounded max-w-full mx-auto">
      <style>{`
        table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
        tr:nth-child(even) { background-color: #f9fafb; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default FileSidebar;
