import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { ProcessedFile } from '../types';
import { ChatMetadata } from '../services/chatRegistry';
import { FileText, FileSpreadsheet, File as FileIcon, X, Loader2, FolderOpen, Plus, ChevronRight, ChevronDown, Folder, Image, MessageCircle, Files, BookOpen, Minus, Network, List, GitBranch, History, Download, Edit2, FolderPlus, Scissors, Trash2 } from 'lucide-react';
import ChatHistory from './ChatHistory';
import DocumentViewer from './DocumentViewer';
import LogsModal from './LogsModal';

interface FileSidebarProps {
  files: ProcessedFile[];
  onUpload: (files: FileList, forceReupload?: boolean) => void;
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
  selectedSourceIds: string[];
  onToggleSource: (fileId: string) => void;
  onUpdateFile?: (fileId: string, updates: Partial<ProcessedFile>) => void;
}

interface UserFolder {
  path: string;
  name: string;
  parentPath: string | null;
}

interface ContextMenu {
  x: number;
  y: number;
  fileIds: string[];
  folderPath?: string;
}

const removeFolder = (folderPath: string, files: ProcessedFile[], onRemove: (id: string) => void) => {
  files.forEach(file => {
    const path = file.path || file.name;
    if (path.startsWith(folderPath + '/')) {
      onRemove(file.id);
    }
  });
};

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
  isDragOver, onDragStateChange, selectedSourceIds, onToggleSource,
  onUpdateFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'files' | 'chats'>('files');
  const [fileViewTab, setFileViewTab] = useState<'all' | 'folders'>('all');
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [cutFiles, setCutFiles] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderInputValue, setFolderInputValue] = useState('');
  const [folderInputParent, setFolderInputParent] = useState<string | null>(null);

  // Load user folders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userFolders');
    if (saved) setUserFolders(JSON.parse(saved));
  }, []);

  // Save user folders to localStorage
  const saveUserFolders = (folders: UserFolder[]) => {
    setUserFolders(folders);
    localStorage.setItem('userFolders', JSON.stringify(folders));
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Create new folder
  const handleCreateFolder = (parentPath: string | null = null) => {
    setFolderInputParent(parentPath);
    setFolderInputValue('');
    setShowFolderInput(true);
  };

  const confirmCreateFolder = () => {
    const folderName = folderInputValue.trim();
    if (!folderName) return;
    
    const path = folderInputParent ? `${folderInputParent}/${folderName}` : folderName;
    if (userFolders.some(f => f.path === path)) {
      alert('Folder already exists!');
      return;
    }
    
    saveUserFolders([...userFolders, { path, name: folderName, parentPath: folderInputParent }]);
    setExpandedFolders(prev => new Set([...prev, path]));
    setShowFolderInput(false);
  };

  // Auto-organize files by extension
  const handleAutoOrganize = () => {
    if (!confirm('Automatically organize files into folders by extension?')) return;
    
    const extensionFolders = new Set<string>();
    const updates: Array<{ fileId: string; folder: string }> = [];
    
    // Group files by extension
    files.forEach(file => {
      if (file.userFolder) return; // Skip files already in folders
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext) return;
      
      const folderName = `.${ext}`;
      extensionFolders.add(folderName);
      updates.push({ fileId: file.id, folder: folderName });
    });
    
    // Create folders
    const newFolders = Array.from(extensionFolders).map(name => ({
      path: name,
      name,
      parentPath: null
    }));
    
    const existingPaths = new Set(userFolders.map(f => f.path));
    const foldersToAdd = newFolders.filter(f => !existingPaths.has(f.path));
    
    if (foldersToAdd.length > 0) {
      saveUserFolders([...userFolders, ...foldersToAdd]);
      foldersToAdd.forEach(f => setExpandedFolders(prev => new Set([...prev, f.path])));
    }
    
    // Move files
    if (onUpdateFile) {
      updates.forEach(({ fileId, folder }) => {
        onUpdateFile(fileId, { userFolder: folder });
      });
    }
  };
  const handleDeleteFolder = (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath}" and move its files to root?`)) return;
    
    // Move files to root
    if (onUpdateFile) {
      files.forEach(file => {
        if (file.userFolder === folderPath) {
          onUpdateFile(file.id, { userFolder: undefined });
        }
      });
    } else {
      files.forEach(file => {
        if (file.userFolder === folderPath) {
          file.userFolder = undefined;
        }
      });
    }
    
    // Remove folder and subfolders
    saveUserFolders(userFolders.filter(f => !f.path.startsWith(folderPath)));
  };

  // Rename file or folder
  const handleRename = (id: string, isFolder: boolean) => {
    if (isFolder) {
      const folder = userFolders.find(f => f.path === id);
      if (!folder) return;
      setRenamingId(id);
      setRenameValue(folder.name);
    } else {
      setRenamingId(id);
      const file = files.find(f => f.id === id);
      if (file) setRenameValue(file.name);
    }
  };

  // Confirm rename
  const confirmRename = (id: string, isFolder: boolean) => {
    const newName = renameValue.trim();
    if (!newName) return;
    
    if (isFolder) {
      const folder = userFolders.find(f => f.path === id);
      if (!folder || newName === folder.name) {
        setRenamingId(null);
        return;
      }
      
      const newPath = folder.parentPath ? `${folder.parentPath}/${newName}` : newName;
      
      // Update folder
      const updated = userFolders.map(f => {
        if (f.path === folder.path) return { ...f, path: newPath, name: newName };
        if (f.path.startsWith(folder.path + '/')) {
          return { ...f, path: f.path.replace(folder.path, newPath), parentPath: f.parentPath === folder.path ? newPath : f.parentPath };
        }
        return f;
      });
      
      // Update files in folder
      if (onUpdateFile) {
        files.forEach(file => {
          if (file.userFolder === folder.path) {
            onUpdateFile(file.id, { userFolder: newPath });
          }
        });
      } else {
        files.forEach(file => {
          if (file.userFolder === folder.path) file.userFolder = newPath;
        });
      }
      
      saveUserFolders(updated);
    } else {
      if (onUpdateFile) {
        onUpdateFile(id, { name: newName });
      } else {
        const file = files.find(f => f.id === id);
        if (file) file.name = newName;
      }
    }
    setRenamingId(null);
  };

  // Cut files
  const handleCut = (fileIds: string[]) => {
    setCutFiles(new Set(fileIds));
    setContextMenu(null);
  };

  // Paste files into folder (move operation)
  const handlePaste = (targetFolder: string | null) => {
    // Animate files moving
    const filesToMove = Array.from(cutFiles);
    
    // Add moving animation class
    filesToMove.forEach(fileId => {
      const element = document.querySelector(`[data-file-id="${fileId}"]`);
      if (element) {
        element.classList.add('animate-pulse');
      }
    });
    
    // Delay the actual move to show animation
    setTimeout(() => {
      filesToMove.forEach(fileId => {
        if (onUpdateFile) {
          onUpdateFile(fileId, { userFolder: targetFolder || undefined });
        } else {
          const file = files.find(f => f.id === fileId);
          if (file) file.userFolder = targetFolder || undefined;
        }
      });
      
      // Clear cut state after moving
      setCutFiles(new Set());
      setSelectedFiles(new Set());
      setContextMenu(null);
    }, 300);
  };

  // Handle right-click context menu with smart positioning
  const handleContextMenu = (e: React.MouseEvent, fileIds: string[], folderPath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuWidth = 180;
    const menuHeight = 250;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if overflowing right
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // Adjust if overflowing bottom - position above cursor
    if (y + menuHeight > window.innerHeight) {
      y = Math.max(10, y - menuHeight);
    }
    
    setContextMenu({ x, y, fileIds, folderPath });
  };

  // Multi-select with Ctrl/Shift
  const handleFileClick = (fileId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    } else if (e.shiftKey && selectedFiles.size > 0) {
      const allFiles = files.map(f => f.id);
      const lastSelected = Array.from(selectedFiles)[selectedFiles.size - 1];
      const start = allFiles.indexOf(lastSelected);
      const end = allFiles.indexOf(fileId);
      const range = allFiles.slice(Math.min(start, end), Math.max(start, end) + 1);
      setSelectedFiles(new Set(range));
    } else {
      setSelectedFiles(new Set([fileId]));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const forceReupload = (e.target as any).forceReupload || false;
      onUpload(e.target.files, forceReupload);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      (fileInputRef.current as any).forceReupload = false;
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const forceReupload = (e.target as any).forceReupload || false;
          onUpload(e.target.files, forceReupload);
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
        (folderInputRef.current as any).forceReupload = false;
      }
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
          
          if (parts.length === 1) return;
          
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

  const standaloneFiles = useMemo(() => {
      return files.filter(file => {
          const path = file.path || file.name;
          return !path.includes('/') && !file.userFolder;
      });
  }, [files]);

  // Get files in a user folder
  const getFilesInFolder = (folderPath: string) => {
    return files.filter(f => f.userFolder === folderPath);
  };

  const hasTreeStructure = Object.keys(fileTree).length > 0;

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

  const handleDownload = (file: ProcessedFile) => {
    if (!file.fileHandle) return;
    
    const url = URL.createObjectURL(file.fileHandle as File);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTree = (nodes: Record<string, TreeNode>, depth = 0) => {
      return Object.values(nodes)
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        })
        .map((node) => {
          if (node.type === 'folder') {
              const isExpanded = expandedFolders.has(node.path);
              const folderFiles = files.filter(f => (f.path || f.name).startsWith(node.path + '/'));
              const childFolderCount = Object.values(node.children).filter(c => c.type === 'folder').length;
              const allFolderFilesSelected = folderFiles.length > 0 && folderFiles.every(f => selectedSourceIds.includes(f.id));
              const someFolderFilesSelected = folderFiles.some(f => selectedSourceIds.includes(f.id)) && !allFolderFilesSelected;
              
              return (
                  <div key={node.path} className="select-none">
                      <div 
                        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded cursor-pointer text-[#1a1a1a] dark:text-white group"
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => toggleFolder(node.path)}
                      >
                          <input
                              type="checkbox"
                              checked={allFolderFilesSelected}
                              ref={el => { if (el) el.indeterminate = someFolderFilesSelected; }}
                              onChange={() => {
                                if (allFolderFilesSelected) {
                                  folderFiles.forEach(f => { if (selectedSourceIds.includes(f.id)) onToggleSource(f.id); });
                                } else {
                                  folderFiles.forEach(f => { if (!selectedSourceIds.includes(f.id)) onToggleSource(f.id); });
                                }
                              }}
                              className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer bg-white dark:bg-gray-700"
                              onClick={(e) => e.stopPropagation()}
                          />
                          <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                            {isExpanded ? <ChevronDown size={12} className="text-[#666666] dark:text-[#a0a0a0]"/> : <ChevronRight size={12} className="text-[#666666] dark:text-[#a0a0a0]"/>}
                          </div>
                          <Folder size={14} className={isExpanded ? 'text-amber-600' : 'text-amber-500'} />
                          <span className="text-xs font-semibold truncate flex-1">{node.name}</span>
                          <span className="text-[10px] text-[#a0a0a0] opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            {folderFiles.length > 0 && <span>{folderFiles.length} files</span>}
                          </span>
                          <button
                              onClick={(e) => { e.stopPropagation(); removeFolder(node.path, files, onRemove); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a0a0a0] hover:text-[#ef4444] rounded transition-all flex-shrink-0"
                              title="Remove folder"
                          >
                              <X size={11} />
                          </button>
                      </div>
                      {isExpanded && (
                          <div className="border-l-2 border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)]" style={{ marginLeft: `${depth * 12 + 20}px` }}>
                            {renderTree(node.children, depth + 1)}
                          </div>
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
                        group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all cursor-grab active:cursor-grabbing
                        ${file.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a]'}
                    `}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    <input
                        type="checkbox"
                        checked={selectedSourceIds.includes(file.id)}
                        onChange={() => onToggleSource(file.id)}
                        className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer bg-white dark:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-shrink-0">
                        {file.status === 'processing' ? <Loader2 size={12} className="animate-spin text-blue-500"/> : getIcon(file)}
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs truncate ${file.status === 'error' ? 'text-red-700' : 'text-[#1a1a1a] dark:text-white font-medium'}`} title={file.name}>
                        {file.name}
                        </span>
                        <span className="text-[10px] text-[#666666] dark:text-[#a0a0a0] whitespace-nowrap">
                          {file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k` : 'Processing...'}
                        </span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewFileId(file.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a0a0a0] hover:text-[#4485d1] rounded transition-all flex-shrink-0"
                        title="Preview"
                    >
                        <BookOpen size={11} />
                    </button>
                    {file.fileHandle && (
                      <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a0a0a0] hover:text-green-500 rounded transition-all flex-shrink-0"
                          title="Download file"
                      >
                          <Download size={11} />
                      </button>
                    )}
                    {onGenerateMindMap && (
                      <button
                          onClick={(e) => { e.stopPropagation(); onGenerateMindMap(file.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a0a0a0] hover:text-purple-500 rounded transition-all flex-shrink-0"
                          title="Generate Mind Map"
                      >
                          <Network size={11} />
                      </button>
                    )}
                    <button
                        onClick={() => onRemove(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a0a0a0] hover:text-[#ef4444] rounded transition-all flex-shrink-0"
                        title="Remove source"
                    >
                        <X size={11} />
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
          const forceReupload = e.ctrlKey || e.metaKey;
          onUpload(droppedFiles, forceReupload);
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                   <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">{files.length} sources</span>
                   {files.length > 0 && (
                      <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">• ~{(totalTokens / 1000).toFixed(0)}k tokens</span>
                   )}
                </div>
                <div className="flex gap-1">
                  {files.length > 0 && (
                    <>
                      <button
                        onClick={handleAutoOrganize}
                        className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-[10px] font-semibold"
                        title="Auto-organize by extension"
                      >
                        <List size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const allSelected = files.every(f => selectedSourceIds.includes(f.id));
                          if (allSelected) {
                            files.forEach(f => onToggleSource(f.id));
                          } else {
                            files.filter(f => !selectedSourceIds.includes(f.id)).forEach(f => onToggleSource(f.id));
                          }
                        }}
                        className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-[10px] font-semibold"
                        title={files.every(f => selectedSourceIds.includes(f.id)) ? "Deselect All" : "Select All"}
                      >
                        {files.every(f => selectedSourceIds.includes(f.id)) ? "Deselect All" : "Select All"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleCreateFolder()}
                    disabled={isProcessing}
                    className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
                    title="Create Folder"
                  >
                    <FolderPlus size={14} />
                  </button>
                  {fileViewTab === 'all' ? (
                    <button
                      onClick={(e) => {
                        if (fileInputRef.current) {
                          (fileInputRef.current as any).forceReupload = e.ctrlKey || e.metaKey;
                          fileInputRef.current.click();
                        }
                      }}
                      disabled={isProcessing}
                      className="p-1.5 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors disabled:opacity-50"
                      title={"Add File (Ctrl+Click to force re-upload)"}
                    >
                      <Plus size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        if (folderInputRef.current) {
                          (folderInputRef.current as any).forceReupload = e.ctrlKey || e.metaKey;
                          folderInputRef.current.click();
                        }
                      }}
                      disabled={isProcessing}
                      className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
                      title={"Add Folder (Ctrl+Click to force re-upload)"}
                    >
                      <FolderOpen size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded p-0.5">
                <button
                  onClick={() => setFileViewTab('all')}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${fileViewTab === 'all' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
                >
                  Files
                </button>
                <button
                  onClick={() => setFileViewTab('folders')}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${fileViewTab === 'folders' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
                >
                  Folders
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
            <div 
              className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar min-h-0"
              onContextMenu={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('space-y-0.5')) {
                  handleContextMenu(e, [], null);
                }
              }}
            >
              {isProcessing && (
                <div className="flex items-center gap-3 p-3 mx-2 mb-2 text-sm text-blue-700 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="font-medium">Processing...</span>
                </div>
              )}
              
              {cutFiles.size > 0 && (
                <div className="flex items-center justify-between gap-3 p-2 mx-2 mb-2 text-xs bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Scissors size={14} className="text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-400">{cutFiles.size} file(s) cut - Right-click folder to paste</span>
                  </div>
                  <button
                    onClick={() => setCutFiles(new Set())}
                    className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
                  >
                    <X size={12} className="text-blue-600" />
                  </button>
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
                    {fileViewTab === 'folders' ? (
                      renderTree(fileTree)
                    ) : (
                      <>
                        {/* User-created folders */}
                        {userFolders.filter(f => !f.parentPath).map(folder => {
                          const folderFiles = getFilesInFolder(folder.path);
                          const isExpanded = expandedFolders.has(folder.path);
                          
                          return (
                            <div key={folder.path} className="mb-1">
                              <div
                                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded cursor-pointer text-[#1a1a1a] dark:text-white group mx-2"
                                onContextMenu={(e) => handleContextMenu(e, [], folder.path)}
                              >
                                <div className="w-3 h-3 flex items-center justify-center flex-shrink-0" onClick={() => toggleFolder(folder.path)}>
                                  {isExpanded ? <ChevronDown size={12} className="text-[#666666] dark:text-[#a0a0a0]"/> : <ChevronRight size={12} className="text-[#666666] dark:text-[#a0a0a0]"/>}
                                </div>
                                <Folder size={13} className="text-amber-500 flex-shrink-0" onClick={() => toggleFolder(folder.path)} />
                                {renamingId === folder.path ? (
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => confirmRename(folder.path, true)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') confirmRename(folder.path, true);
                                      if (e.key === 'Escape') setRenamingId(null);
                                      e.stopPropagation();
                                    }}
                                    autoFocus
                                    className="flex-1 px-1 py-0.5 text-xs bg-white dark:bg-[#1a1a1a] border border-blue-500 rounded"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="text-xs font-semibold truncate flex-1" onClick={() => toggleFolder(folder.path)}>{folder.name}</span>
                                )}
                                <span className="text-[10px] text-[#a0a0a0] opacity-0 group-hover:opacity-100">{folderFiles.length}</span>
                              </div>
                              
                              {isExpanded && folderFiles.length > 0 && (
                                <div className="ml-6 space-y-0.5">
                                  {folderFiles.map(file => (
                                    <div
                                      key={file.id}
                                      data-file-id={file.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', `@${file.name}`);
                                        e.dataTransfer.effectAllowed = 'copy';
                                      }}
                                      className={`
                                        group relative flex items-center gap-2 px-2 py-2 rounded-md transition-all cursor-grab active:cursor-grabbing mx-2
                                        ${selectedFiles.has(file.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400' : 'hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a]'}
                                        ${cutFiles.has(file.id) ? 'opacity-40 scale-95' : ''}
                                      `}
                                      onClick={(e) => handleFileClick(file.id, e)}
                                      onContextMenu={(e) => handleContextMenu(e, selectedFiles.has(file.id) ? Array.from(selectedFiles) : [file.id])}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedSourceIds.includes(file.id)}
                                        onChange={() => onToggleSource(file.id)}
                                        className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer bg-white dark:bg-gray-700"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-shrink-0">{getIcon(file)}</div>
                                      
                                      {renamingId === file.id ? (
                                        <input
                                          type="text"
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          onBlur={() => confirmRename(file.id, false)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmRename(file.id, false);
                                            if (e.key === 'Escape') setRenamingId(null);
                                            e.stopPropagation();
                                          }}
                                          autoFocus
                                          className="flex-1 px-1 py-0.5 text-xs bg-white dark:bg-[#1a1a1a] border border-blue-500 rounded"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className="text-xs truncate text-[#1a1a1a] dark:text-white font-medium" title={file.name}>
                                            {file.name}
                                          </span>
                                          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] whitespace-nowrap">
                                            {file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k tokens` : 'Processing...'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Standalone files */}
                        {standaloneFiles.map(file => (
                      <div
                          key={file.id}
                          data-file-id={file.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', `@${file.name}`);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className={`
                              group relative flex items-center gap-2 px-2 py-2 rounded-md transition-all cursor-grab active:cursor-grabbing mx-2
                              ${selectedFiles.has(file.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400' : file.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a]'}
                              ${cutFiles.has(file.id) ? 'opacity-40 scale-95' : ''}
                          `}
                          onClick={(e) => handleFileClick(file.id, e)}
                          onContextMenu={(e) => handleContextMenu(e, selectedFiles.has(file.id) ? Array.from(selectedFiles) : [file.id])}
                      >
                          <input
                              type="checkbox"
                              checked={selectedSourceIds.includes(file.id)}
                              onChange={() => onToggleSource(file.id)}
                              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer bg-white dark:bg-gray-700"
                              onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-shrink-0">
                              {file.status === 'processing' ? <Loader2 size={12} className="animate-spin text-blue-500"/> : getIcon(file)}
                          </div>
                          
                          {renamingId === file.id ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => confirmRename(file.id, false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmRename(file.id, false);
                                if (e.key === 'Escape') setRenamingId(null);
                                e.stopPropagation();
                              }}
                              autoFocus
                              className="flex-1 px-1 py-0.5 text-xs bg-white dark:bg-[#1a1a1a] border border-blue-500 rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-xs truncate ${file.status === 'error' ? 'text-red-700' : 'text-[#1a1a1a] dark:text-white font-medium'}`} title={file.name}>
                                {file.name}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] whitespace-nowrap">
                                    {file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k tokens` : 'Processing...'}
                                  </span>
                                  {file.uploadedAt && (
                                    <span className="text-[12px] text-[#a0a0a0] whitespace-nowrap">
                                      {new Date(file.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                  )}
                                </div>
                            </div>
                          )}
                      </div>
                        ))}
                      </>
                    )
                  }
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
    {showFolderInput && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowFolderInput(false)}>
        <div className="bg-white dark:bg-[#222222] rounded-lg shadow-xl p-4 min-w-[300px]" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-semibold mb-3">Create New Folder</h3>
          <input
            type="text"
            value={folderInputValue}
            onChange={(e) => setFolderInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmCreateFolder();
              if (e.key === 'Escape') setShowFolderInput(false);
            }}
            placeholder="Folder name"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded mb-3 bg-white dark:bg-[#1a1a1a]"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowFolderInput(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded"
            >
              Cancel
            </button>
            <button
              onClick={confirmCreateFolder}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    )}
    {contextMenu && createPortal(
      <div 
        className="fixed bg-white dark:bg-[#222222] rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] py-1 min-w-[180px] max-h-[400px] overflow-y-auto z-[99999]"
        style={{ 
          left: `${contextMenu.x}px`, 
          top: `${contextMenu.y}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.fileIds.length > 0 ? (
          <>
            {onGenerateMindMap && contextMenu.fileIds.length === 1 && (
              <button
                onClick={() => {
                  onGenerateMindMap(contextMenu.fileIds[0]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <Network size={14} className="text-purple-500" />
                Generate Mind Map
              </button>
            )}
            <button
              onClick={() => handleCut(contextMenu.fileIds)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
            >
              <Scissors size={14} className="text-blue-500" />
              Cut
            </button>
            {contextMenu.fileIds.length === 1 && (
              <>
                <button
                  onClick={() => {
                    setPreviewFileId(contextMenu.fileIds[0]);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <BookOpen size={14} className="text-blue-500" />
                  Preview
                </button>
                <button
                  onClick={() => {
                    const file = files.find(f => f.id === contextMenu.fileIds[0]);
                    if (file?.fileHandle) handleDownload(file);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <Download size={14} className="text-green-500" />
                  Download
                </button>
                <button
                  onClick={() => {
                    handleRename(contextMenu.fileIds[0], false);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <Edit2 size={14} className="text-orange-500" />
                  Rename
                </button>
              </>
            )}
            <button
              onClick={() => {
                contextMenu.fileIds.forEach(id => onRemove(id));
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2 text-red-600"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </>
        ) : contextMenu.folderPath !== undefined && (
          <>
            {cutFiles.size > 0 && (
              <button
                onClick={() => handlePaste(contextMenu.folderPath || null)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <Download size={14} className="text-blue-500" style={{ transform: 'rotate(180deg)' }} />
                Paste ({cutFiles.size})
              </button>
            )}
            <button
              onClick={() => {
                handleCreateFolder(contextMenu.folderPath || null);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
            >
              <FolderPlus size={14} className="text-blue-500" />
              New Folder
            </button>
            {contextMenu.folderPath && (
              <>
                <button
                  onClick={() => {
                    handleRename(contextMenu.folderPath!, true);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
                >
                  <Edit2 size={14} className="text-orange-500" />
                  Rename
                </button>
                <button
                  onClick={() => {
                    handleDeleteFolder(contextMenu.folderPath!);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2 text-red-600"
                >
                  <Trash2 size={14} />
                  Delete Folder
                </button>
              </>
            )}
          </>
        )}
      </div>,
      document.body
    )}
    {previewFile && createPortal(
      <div className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setPreviewFileId(null)}>
        <div className="w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden flex flex-col h-full">
            <FilePreviewViewer file={previewFile} onClose={() => setPreviewFileId(null)} />
          </div>
        </div>
      </div>,
      document.body
    )}
    <LogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} />
    </>
  );
};

const FilePreviewViewer: React.FC<{ file: ProcessedFile; onClose: () => void }> = ({ file, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [excelHtml, setExcelHtml] = useState('');
  const [pdfScale, setPdfScale] = useState(1.5);

  useEffect(() => {
    if (file.type === 'pdf' && file.fileHandle) {
      const loadPdf = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
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
    } else if ((file.type === 'excel' || file.type === 'csv') && file.fileHandle) {
      const loadExcel = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
          const workbook = (window as any).XLSX.read(arrayBuffer, { type: 'array' });
          let html = '';
          workbook.SheetNames.forEach((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const sheetHtml = (window as any).XLSX.utils.sheet_to_html(sheet);
            html += `<div class="mb-6"><h3 class="text-lg font-bold mb-2 text-gray-800 dark:text-gray-200">${sheetName}</h3>${sheetHtml}</div>`;
          });
          setExcelHtml(html);
          setLoading(false);
        } catch (err) {
          console.error('Excel load error:', err);
          setLoading(false);
        }
      };
      loadExcel();
    } else {
      setLoading(false);
    }
  }, [file]);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.name}</h3>
        <div className="flex items-center gap-2">
          {file.type === 'pdf' && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                <Minus size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-center">{Math.round(pdfScale * 100)}%</span>
              <button onClick={() => setPdfScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                <Plus size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
      {file.type === 'pdf' && pdfDoc && (
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#1a1a1a] scroll-smooth">
          <div className="space-y-4 py-4">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPageRenderer key={i + 1} pdf={pdfDoc} pageNum={i + 1} scale={pdfScale} />
            ))}
          </div>
        </div>
      )}
      {(file.type === 'excel' || file.type === 'csv') && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] p-6 scroll-smooth">
          <style>{`
            table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; }
            tr:nth-child(even) { background-color: #f9fafb; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: excelHtml }} />
        </div>
      )}
      {file.type === 'markdown' && <DocumentViewer file={file} onClose={onClose} />}
      {(file.type === 'document' || file.type === 'other') && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] p-6 scroll-smooth">
          <pre className="whitespace-pre-wrap text-sm">{file.content}</pre>
        </div>
      )}
      {file.type === 'image' && (
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center scroll-smooth">
          <img src={URL.createObjectURL(file.fileHandle as File)} alt={file.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
      {!['pdf', 'excel', 'csv', 'markdown', 'document', 'other', 'image'].includes(file.type) && (
        <div className="p-8 text-center">Preview not available for this file type</div>
      )}
    </>
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
