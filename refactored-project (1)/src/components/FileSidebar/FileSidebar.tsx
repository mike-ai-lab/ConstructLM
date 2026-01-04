import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { ProcessedFile } from '../../types';
import { ChatMetadata } from '../../services/chatRegistry';
import { 
  FileText, Loader2, FolderOpen, Plus, ChevronRight, ChevronDown, 
  Folder, MessageCircle, Files, BookOpen, Network, List, Download, 
  FolderPlus, Scissors, X
} from 'lucide-react';
import ChatHistory from '../../components/ChatHistory';
import LogsModal from '../../components/LogsModal';
import { UserFolder, ContextMenuState, TreeNode, FileViewTab, ActiveTab } from './types';
import { removeFolderHelper, buildFileTree, getIcon, getVisibleFileIds } from './utils';
import FileContextMenu from './FileContextMenu';
import FilePreviewViewer from './FilePreviewViewer';
import ConfirmModal from './ConfirmModal';

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
  // Enforced as required to prevent direct mutation bugs
  onUpdateFile: (fileId: string, updates: Partial<ProcessedFile>) => void;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [fileViewTab, setFileViewTab] = useState<FileViewTab>('all');
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [cutFiles, setCutFiles] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderInputValue, setFolderInputValue] = useState('');
  const [folderInputParent, setFolderInputParent] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void}>({ 
    isOpen: false, title: '', message: '', onConfirm: () => {} 
  });

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

  // Performance optimization: Memoize files grouped by path for Tree view
  const filesByPath = useMemo(() => {
    const map = new Map<string, ProcessedFile[]>();
    files.forEach(f => {
      // normalize path: if userFolder is set, it overrides tree path for 'Folders' view logic in original code,
      // but for tree view (file.path), we stick to the path property.
      const dir = (f.path || '').split('/').slice(0, -1).join('/');
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir)!.push(f);
    });
    return map;
  }, [files]);

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const standaloneFiles = useMemo(() => {
    return files.filter(file => {
      const path = file.path || file.name;
      return !path.includes('/') && !file.userFolder;
    });
  }, [files]);

  // Get files in a user folder - Optimized
  const getFilesInFolder = (folderPath: string) => {
    return files.filter(f => f.userFolder === folderPath);
  };

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
      setModalState({
        isOpen: true,
        title: 'Error',
        message: 'Folder already exists!',
        onConfirm: () => {}
      });
      return;
    }
    
    saveUserFolders([...userFolders, { path, name: folderName, parentPath: folderInputParent }]);
    setExpandedFolders(prev => new Set([...prev, path]));
    setShowFolderInput(false);
  };

  // Auto-organize files by extension
  const handleAutoOrganize = () => {
    setModalState({
      isOpen: true,
      title: 'Auto Organize',
      message: 'Automatically organize files into folders by extension?',
      onConfirm: () => {
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
        updates.forEach(({ fileId, folder }) => {
          onUpdateFile(fileId, { userFolder: folder });
        });
      }
    });
  };

  const handleDeleteFolder = (folderPath: string) => {
    setModalState({
      isOpen: true,
      title: 'Delete Folder',
      message: `Delete folder "${folderPath}" and move its files to root?`,
      onConfirm: () => {
         // Move files to root
         files.forEach(file => {
          if (file.userFolder === folderPath) {
            onUpdateFile(file.id, { userFolder: undefined });
          }
        });
        
        // Remove folder and subfolders
        saveUserFolders(userFolders.filter(f => !f.path.startsWith(folderPath)));
      }
    });
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
      files.forEach(file => {
        if (file.userFolder === folder.path) {
          onUpdateFile(file.id, { userFolder: newPath });
        }
      });
      
      saveUserFolders(updated);
    } else {
      onUpdateFile(id, { name: newName });
    }
    setRenamingId(null);
  };

  // Cut files
  const handleCut = (fileIds: string[]) => {
    setCutFiles(new Set(fileIds));
    setContextMenu(null);
  };

  // Paste files
  const handlePaste = (targetFolder: string | null) => {
    const filesToMove = Array.from(cutFiles);
    
    // Animate files moving
    filesToMove.forEach(fileId => {
      const element = document.querySelector(`[data-file-id="${fileId}"]`);
      if (element) element.classList.add('animate-pulse');
    });
    
    setTimeout(() => {
      filesToMove.forEach(fileId => {
        onUpdateFile(fileId, { userFolder: targetFolder || undefined });
      });
      
      setCutFiles(new Set());
      setSelectedFiles(new Set());
      setContextMenu(null);
    }, 300);
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, fileIds: string[], folderPath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuWidth = 180;
    const menuHeight = 250;
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = Math.max(10, y - menuHeight);
    
    setContextMenu({ x, y, fileIds, folderPath });
  };

  // Multi-select with Shift Support
  const handleFileClick = (fileId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    } else if (e.shiftKey && selectedFiles.size > 0) {
      const visibleFileIds = getVisibleFileIds(fileViewTab, files, userFolders, expandedFolders, fileTree);
      const lastSelected = Array.from(selectedFiles)[selectedFiles.size - 1];
      const start = visibleFileIds.indexOf(lastSelected);
      const end = visibleFileIds.indexOf(fileId);
      
      if (start !== -1 && end !== -1) {
        const range = visibleFileIds.slice(Math.min(start, end), Math.max(start, end) + 1);
        setSelectedFiles(new Set(range));
      }
    } else {
      setSelectedFiles(new Set([fileId]));
    }
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const renderTree = (nodes: Record<string, TreeNode>, depth = 0) => {
    // Use the optimized map to avoid filter in loop
    return Object.values(nodes)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => {
        if (node.type === 'folder') {
          const isExpanded = expandedFolders.has(node.path);
          // For checking status/selection, we can use the quick map lookup logic or fallback to prefix check if path structure aligns
          // To match original logic exactly without O(N): get all files starting with prefix is still tricky without trie
          // For now, we keep the original logic for *count* but we could optimize later. 
          // Given we are inside render loop, we rely on the precomputed `filesByPath` if the structure matches.
          // However, file.path (tree) vs userFolders is split. This tree is strictly file.path.
          const folderFiles = files.filter(f => (f.path || f.name).startsWith(node.path + '/'));
          
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeFolderHelper(node.path, files, onRemove); 
                  }}
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const url = URL.createObjectURL(file.fileHandle as File);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
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
  const totalTokens = files.reduce((acc, f) => acc + (f.tokenCount || 0), 0);

  return (
    <>
      <div 
        className="flex flex-col h-full w-full relative box-border"
        onDragOver={(e) => {
          e.preventDefault(); e.stopPropagation();
          onDragStateChange(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
            onDragStateChange(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          onDragStateChange(false);
          const droppedFiles = e.dataTransfer.files;
          if (droppedFiles.length > 0) onUpload(droppedFiles, e.ctrlKey || e.metaKey);
        }}
      >
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
            className={`flex-1 h-full px-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'files' ? 'text-[#333333] dark:text-[#cccccc] border-b-2 border-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc]'}`}
          >
            <Files size={14} className="flex-shrink-0" />
            <span className="truncate">Sources</span>
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 h-full px-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'chats' ? 'text-[#333333] dark:text-[#cccccc] border-b-2 border-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#333333] dark:hover:text-[#cccccc]'}`}
          >
            <MessageCircle size={14} className="flex-shrink-0" />
            <span className="truncate">Chats</span>
          </button>
        </div>

        <div style={{ height: 'calc(100% - 65px)' }} className="flex flex-col min-h-0 box-border">
          {activeTab === 'files' ? (
            <div className="flex flex-col min-h-0 w-full relative box-border">
              {/* Toolbar */}
              <div className="px-4 py-2 flex-shrink-0 bg-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">{files.length} sources</span>
                    {files.length > 0 && <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">• ~{(totalTokens / 1000).toFixed(0)}k tokens</span>}
                  </div>
                  <div className="flex gap-1">
                    {files.length > 0 && (
                      <>
                        <button onClick={handleAutoOrganize} className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-[10px] font-semibold" title="Auto-organize by extension"><List size={14} /></button>
                        <button
                          onClick={() => {
                            const allSelected = files.every(f => selectedSourceIds.includes(f.id));
                            if (allSelected) files.forEach(f => onToggleSource(f.id));
                            else files.filter(f => !selectedSourceIds.includes(f.id)).forEach(f => onToggleSource(f.id));
                          }}
                          className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-[10px] font-semibold"
                          title={files.every(f => selectedSourceIds.includes(f.id)) ? "Deselect All" : "Select All"}
                        >
                          {files.every(f => selectedSourceIds.includes(f.id)) ? "Deselect All" : "Select All"}
                        </button>
                      </>
                    )}
                    <button onClick={() => handleCreateFolder()} disabled={isProcessing} className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50" title="Create Folder"><FolderPlus size={14} /></button>
                    {fileViewTab === 'all' ? (
                      <button onClick={(e) => { if (fileInputRef.current) { (fileInputRef.current as any).forceReupload = e.ctrlKey || e.metaKey; fileInputRef.current.click(); } }} disabled={isProcessing} className="p-1.5 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors disabled:opacity-50" title="Add File"><Plus size={14} /></button>
                    ) : (
                      <button onClick={(e) => { if (folderInputRef.current) { (folderInputRef.current as any).forceReupload = e.ctrlKey || e.metaKey; folderInputRef.current.click(); } }} disabled={isProcessing} className="p-1.5 text-[#666666] dark:text-[#a0a0a0] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50" title="Add Folder"><FolderOpen size={14} /></button>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded p-0.5">
                  <button onClick={() => setFileViewTab('all')} className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${fileViewTab === 'all' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>Files</button>
                  <button onClick={() => setFileViewTab('folders')} className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${fileViewTab === 'folders' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>Folders</button>
                </div>
              </div>
              
              <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files, (e.target as any).forceReupload); if (fileInputRef.current) fileInputRef.current.value = ''; }} multiple className="hidden" />
              <input type="file" ref={folderInputRef} onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files, (e.target as any).forceReupload); if (folderInputRef.current) folderInputRef.current.value = ''; }} {...({ webkitdirectory: "" } as any)} multiple className="hidden" />

              <div 
                className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar min-h-0"
                onContextMenu={(e) => {
                  if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('space-y-0.5')) handleContextMenu(e, [], null);
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
                    <button onClick={() => setCutFiles(new Set())} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"><X size={12} className="text-blue-600" /></button>
                  </div>
                )}

                {files.length === 0 && !isProcessing ? (
                  <div className="text-center mt-12 px-6">
                    <div className="w-16 h-16 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-[#a0a0a0]" />
                    </div>
                    <p className="text-sm font-medium text-[#666666] dark:text-[#a0a0a0]">No sources yet</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 pb-8">
                    {fileViewTab === 'folders' ? renderTree(fileTree) : (
                      <>
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
                                          <span className="text-xs truncate text-[#1a1a1a] dark:text-white font-medium" title={file.name}>{file.name}</span>
                                          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] whitespace-nowrap">{file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k tokens` : 'Processing...'}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                                <span className={`text-xs truncate ${file.status === 'error' ? 'text-red-700' : 'text-[#1a1a1a] dark:text-white font-medium'}`} title={file.name}>{file.name}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] whitespace-nowrap">{file.tokenCount ? `~${(file.tokenCount / 1000).toFixed(1)}k tokens` : 'Processing...'}</span>
                                  {file.uploadedAt && (
                                    <span className="text-[12px] text-[#a0a0a0] whitespace-nowrap">{new Date(file.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
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
              <button onClick={() => setShowFolderInput(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded">Cancel</button>
              <button onClick={confirmCreateFolder} className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded">Create</button>
            </div>
          </div>
        </div>
      )}

      <FileContextMenu
        context={contextMenu}
        files={files}
        onClose={() => setContextMenu(null)}
        onGenerateMindMap={onGenerateMindMap}
        onCut={handleCut}
        onPreview={(id) => setPreviewFileId(id)}
        onDownload={(file) => { 
          const url = URL.createObjectURL(file.fileHandle as File);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onRename={handleRename}
        onDelete={(ids) => ids.forEach(id => onRemove(id))}
        onPaste={handlePaste}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        hasCutFiles={cutFiles.size > 0}
        cutFilesCount={cutFiles.size}
      />

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
      />

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

export default FileSidebar;
