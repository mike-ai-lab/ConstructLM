import React, { useState, useRef, useEffect } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import LiveSession from './components/LiveSession';
import { sendMessageToLLM } from './services/llmService';
import { initializeGemini } from './services/geminiService';
import { MODEL_REGISTRY, DEFAULT_MODEL_ID } from './services/modelRegistry';
import SettingsModal from './components/SettingsModal';
import { Send, Menu, Sparkles, X, FileText, Database, PanelLeft, PanelLeftOpen, Mic, Settings, Cpu, ChevronDown, Camera, Highlighter, Edit3, Trash2, Palette, Minus, Plus, Check } from 'lucide-react';
import { snapshotService, Snapshot } from './services/snapshotService';
import SnapshotPanel from './components/SnapshotPanel';
import { drawingService, DrawingTool, DRAWING_COLORS, DrawingState } from './services/drawingService';
import { chatRegistry, ChatSession, ChatMetadata } from './services/chatRegistry';

interface ViewState {
  fileId: string;
  page?: number;
  quote?: string;
  location?: string;
}

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 500;
const MIN_VIEWER_WIDTH = 400;
const MAX_VIEWER_WIDTH = 800;
const MIN_CHAT_WIDTH = 600;

const App: React.FC = () => {
  // Chat Registry State
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Layout State
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [viewerWidth, setViewerWidth] = useState(600);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingViewer, setIsResizingViewer] = useState(false);

  // Document View State
  const [viewState, setViewState] = useState<ViewState | null>(null);

  // Mention State
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0); // For keyboard nav
  const inputRef = useRef<HTMLInputElement>(null);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  
  // Drawing State
  const [drawingState, setDrawingState] = useState<DrawingState>(drawingService.getState());
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
      initializeGemini();
      setSnapshots(snapshotService.getSnapshots());
      
      // Load chat history
      const chatHistory = chatRegistry.getAllChats();
      setChats(chatHistory);
      
      // Create default chat if none exists
      if (chatHistory.length === 0) {
        const newChat = chatRegistry.createNewChat('New Chat', DEFAULT_MODEL_ID);
        setCurrentChatId(newChat.id);
        setMessages(newChat.messages);
        setActiveModelId(newChat.modelId);
        setChats([{
          id: newChat.id,
          name: newChat.name,
          modelId: newChat.modelId,
          messageCount: newChat.messages.length,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }]);
      } else {
        // Load the most recent chat
        const mostRecent = chatHistory.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        loadChat(mostRecent.id);
      }
      
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      
      // Drawing service subscription
      const unsubscribeDrawing = drawingService.onStateChange(() => {
        setDrawingState(drawingService.getState());
      });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        unsubscribeDrawing();
      };
  }, []);

  // Separate effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleTakeSnapshot();
      }
      if (e.key === 'Escape' && showSnapshots) {
        setShowSnapshots(false);
      }
      if (e.key === 'Escape' && showModelMenu) {
        setShowModelMenu(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSnapshots, showModelMenu]);

  // Separate effect for click outside
  useEffect(() => {
    if (!showModelMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
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
  }, [showModelMenu]);

  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (!userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserHasScrolled(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH)));
      }
      if (isResizingViewer) {
        const newWidth = window.innerWidth - e.clientX;
        const sidebarSpace = isSidebarOpen ? sidebarWidth : 0;
        const availableWidth = window.innerWidth - sidebarSpace - MIN_CHAT_WIDTH;
        const maxAllowed = Math.min(MAX_VIEWER_WIDTH, availableWidth);
        setViewerWidth(Math.max(MIN_VIEWER_WIDTH, Math.min(newWidth, maxAllowed)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingViewer(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto'; // Re-enable selection
    };

    if (isResizingSidebar || isResizingViewer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Disable selection while dragging
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingViewer]);

  // Chat Management Functions
  const loadChat = (chatId: string) => {
    const chat = chatRegistry.getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setActiveModelId(chat.modelId);
      // Don't change files when switching chats - preserve them
    }
  };

  const saveCurrentChat = () => {
    if (!currentChatId) return;
    
    const chat: ChatSession = {
      id: currentChatId,
      name: generateChatName(messages),
      modelId: activeModelId,
      messages,
      fileIds: [],
      createdAt: chats.find(c => c.id === currentChatId)?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    
    chatRegistry.saveChat(chat);
    
    // Update chats list
    setChats(prev => {
      const existing = prev.find(c => c.id === currentChatId);
      const updated = {
        id: chat.id,
        name: chat.name,
        modelId: chat.modelId,
        messageCount: chat.messages.length,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
      
      if (existing) {
        return prev.map(c => c.id === currentChatId ? updated : c);
      } else {
        return [...prev, updated];
      }
    });
  };

  const generateChatName = (messages: Message[]): string => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'New Chat';
    
    const firstMessage = userMessages[0].content;
    const words = firstMessage.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const handleCreateChat = () => {
    saveCurrentChat();
    
    const newChat = chatRegistry.createNewChat('New Chat', activeModelId);
    setCurrentChatId(newChat.id);
    setMessages(newChat.messages);
    
    setChats(prev => [{
      id: newChat.id,
      name: newChat.name,
      modelId: newChat.modelId,
      messageCount: newChat.messages.length,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt
    }, ...prev]);
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId === currentChatId) return;
    saveCurrentChat(); // Save current chat first
    loadChat(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    chatRegistry.deleteChat(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    
    if (chatId === currentChatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        loadChat(remaining[0].id);
      } else {
        handleCreateChat();
      }
    }
  };

  const handleFileUpload = async (fileList: FileList) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (files.some(f => f.name === file.name)) continue;
      const processed = await parseFile(file);
      newFiles.push(processed);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFiles(false);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

  // Auto-save chat when messages or files change
  useEffect(() => {
    if (currentChatId && messages.length > 1) { // Don't save just the intro message
      const timeoutId = setTimeout(saveCurrentChat, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, files, activeModelId]);

  // --- Mention Logic ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart || 0;
    const lastAt = val.lastIndexOf('@', cursor - 1);
    
    if (lastAt !== -1) {
        const query = val.slice(lastAt + 1, cursor);
        if (!query.includes(' ')) {
            setShowMentionMenu(true);
            setMentionQuery(query.toLowerCase());
            setMentionIndex(0);
            return;
        }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (fileName: string) => {
      const cursor = inputRef.current?.selectionStart || 0;
      const lastAt = input.lastIndexOf('@', cursor - 1);
      if (lastAt !== -1) {
          const before = input.slice(0, lastAt);
          const after = input.slice(cursor);
          const newValue = `${before}@${fileName} ${after}`;
          setInput(newValue);
          setShowMentionMenu(false);
      }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(mentionQuery));

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (showMentionMenu && filteredFiles.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setMentionIndex(prev => (prev + 1) % filteredFiles.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              insertMention(filteredFiles[mentionIndex].name);
          } else if (e.key === 'Escape') {
              setShowMentionMenu(false);
          }
          return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };


  // --- Sending Logic ---
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
    const activeContextFiles = mentionedFiles.length > 0 ? mentionedFiles : (files.length > 0 ? files : []);

    const displayContent = input.replace(/@([^\s]+)/g, '$1');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowMentionMenu(false);
    setIsGenerating(true);

    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        modelId: activeModelId
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      let accumText = "";
      const usage = await sendMessageToLLM(
          activeModelId,
          messages,
          userMsg.content,
          activeContextFiles, 
          (chunk) => {
              accumText += chunk;
              setMessages(prev => prev.map(msg => 
                  msg.id === modelMsgId 
                  ? { ...msg, content: accumText } 
                  : msg
              ));
          }
      );
      
      // Update message with usage stats
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, usage: { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0 } } 
            : msg
        ));
      }
    } catch (error) {
       console.error(error);
       setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, content: "Sorry, I encountered an error. Please check your connection." } 
            : msg
        ));
    } finally {
        setIsGenerating(false);
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, isStreaming: false } 
            : msg
        ));
    }
  };

  const handleViewDocument = (fileName: string, page?: number, quote?: string, location?: string) => {
      const file = files.find(f => f.name === fileName);
      if (file) {
          setViewState({
              fileId: file.id,
              page: page || 1,
              quote,
              location
          });
      }
  };

  const activeFile = viewState ? files.find(f => f.id === viewState.fileId) : null;

  const activeModel = MODEL_REGISTRY.find(m => m.id === activeModelId) || MODEL_REGISTRY[0];

  const handleTakeSnapshot = async () => {
    try {
      const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
      if (!messagesContainer) throw new Error('Messages container not found');
      
      const context = {
        fileCount: files.length,
        messageCount: messages.length
      };
      const snapshot = await snapshotService.takeSnapshot(messagesContainer as HTMLElement, context);
      setSnapshots(snapshotService.getSnapshots());
      // Show brief success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] snapshot-ignore';
      toast.textContent = 'Snapshot saved!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      console.error('Failed to take snapshot:', error);
      // Show error message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] snapshot-ignore';
      toast.textContent = 'Failed to take snapshot';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    snapshotService.downloadSnapshot(snapshot);
  };

  const handleCopySnapshot = async (snapshot: Snapshot) => {
    try {
      await snapshotService.copyToClipboard(snapshot);
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]';
      toast.textContent = 'Copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      console.error('Failed to copy snapshot:', error);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    snapshotService.deleteSnapshot(id);
    setSnapshots(snapshotService.getSnapshots());
  };

  // Drawing handlers
  const handleDrawingToolChange = (tool: DrawingTool) => {
    drawingService.setTool(tool);
    if (tool === 'none') {
      setShowColorPicker(false);
    }
  };

  const handleColorChange = (colorId: string) => {
    drawingService.setColor(colorId);
    setShowColorPicker(false);
  };

  const handleStrokeWidthChange = (delta: number) => {
    drawingService.setStrokeWidth(drawingState.strokeWidth + delta);
  };

  const handleClearAll = () => {
    if (confirm('Clear all drawings and highlights?')) {
      drawingService.clearAll();
    }
  };

  const currentColor = DRAWING_COLORS.find(c => c.id === drawingState.colorId) || DRAWING_COLORS[0];

  return (
    <div 
      className="flex h-screen w-full bg-white overflow-hidden text-sm relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-50 flex items-center justify-center drag-overlay">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-dashed border-blue-400 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Drop files here</h3>
            <p className="text-sm text-gray-600">Support for PDF, Excel, images, documents and more</p>
          </div>
        </div>
      )}
      {isLiveMode && <LiveSession onClose={() => setIsLiveMode(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      
      {/* Mobile Menu Button */}
      {isMobile && !isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 p-2 bg-white shadow-md rounded-full border border-gray-200"
          >
              <Menu size={20} className="text-gray-600" />
          </button>
      )}

      {/* --- LEFT SIDEBAR --- */}
      <div 
        className={`
            fixed md:relative z-40 h-full bg-slate-100 flex flex-col transition-all duration-300 ease-in-out border-r-2 border-slate-300 md:border-r-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${!isSidebarOpen && !isMobile ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''}
        `}
        style={{ width: isMobile ? '85%' : (isSidebarOpen ? sidebarWidth : 0) }}
      >
        <div className="h-full flex flex-col relative w-full">
            {/* Mobile Close */}
            {isMobile && (
                <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-3 right-3 p-1 text-gray-400"
                >
                    <X size={20} />
                </button>
            )}
            
            {/* Hide content when collapsed to prevent squishing during transition */}
            <div className={`flex flex-col h-full w-full ${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                 <FileSidebar 
                    files={files} 
                    onUpload={handleFileUpload} 
                    onRemove={handleRemoveFile}
                    isProcessing={isProcessingFiles}
                    chats={chats}
                    activeChatId={currentChatId}
                    onSelectChat={handleSelectChat}
                    onCreateChat={handleCreateChat}
                    onDeleteChat={handleDeleteChat}
                />
            </div>
        </div>
      </div>

      {/* Resize Handle: Left */}
      {!isMobile && isSidebarOpen && (
          <div 
            className={`resize-handle-vertical ${isResizingSidebar ? 'active' : ''}`}
            onMouseDown={() => setIsResizingSidebar(true)}
          />
      )}

      {/* --- MIDDLE CHAT AREA --- */}
      <div className="flex-1 flex flex-col h-full relative bg-white transition-all duration-300" style={{ minWidth: MIN_CHAT_WIDTH }}>
        {/* Header */}
        <header className="h-14 flex-none border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10 min-w-0 overflow-visible">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
             {!isMobile && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="mr-2 p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                 >
                    {isSidebarOpen ? <PanelLeft size={20} /> : <PanelLeftOpen size={20} />}
                 </button>
             )}
             <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-lg shadow-sm flex-shrink-0">
                <Sparkles size={16} className="text-white" />
             </div>
             <h1 className="font-semibold text-black text-lg tracking-tight mr-4 truncate">ConstructLM</h1>
             
             <div className="relative" ref={modelMenuRef}>
                 <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 rounded-full text-xs font-medium text-black transition-colors"
                 >
                     <Cpu size={14} />
                     <span className="max-w-[120px] truncate">{activeModel.name}</span>
                     <ChevronDown size={12} />
                 </button>
                 
                 {showModelMenu && (
                     <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[100]">
                         <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase">Select Model</div>
                         <div className="max-h-[400px] overflow-y-auto p-1">
                             {MODEL_REGISTRY.map(model => (
                                 <button
                                     key={model.id}
                                     onClick={() => { setActiveModelId(model.id); setShowModelMenu(false); }}
                                     className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${activeModelId === model.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                 >
                                     <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${model.provider === 'google' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                          <span className="text-sm font-medium text-black">{model.name}</span>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                          model.capacityTag === 'High' ? 'bg-green-100 text-green-700' :
                                          model.capacityTag === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>{model.capacityTag}</span>
                                     </div>
                                     <div className="text-[10px] text-gray-600 pl-4 mt-0.5">{model.description}</div>
                                     {model.maxInputWords && model.maxOutputWords && (
                                       <div className="text-[9px] text-gray-600 pl-4 mt-1 flex gap-3">
                                         <span>In: ~{(model.maxInputWords / 1000).toFixed(0)}K</span>
                                         <span>Out: ~{(model.maxOutputWords / 1000).toFixed(0)}K</span>
                                       </div>
                                     )}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          </div>
          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <button
              onClick={handleCreateChat}
              className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            {/* Drawing Tools */}
            <button
              onClick={() => handleDrawingToolChange('highlighter')}
              className={`p-2 rounded-full transition-colors ${
                drawingState.tool === 'highlighter'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
              }`}
              title="Highlighter"
            >
              <Highlighter size={18} />
            </button>
            <button
              onClick={() => handleDrawingToolChange('pen')}
              className={`p-2 rounded-full transition-colors ${
                drawingState.tool === 'pen'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Drawing Pen"
            >
              <Edit3 size={18} />
            </button>
            
            {drawingState.isActive && (
              <button
                onClick={() => handleDrawingToolChange('none')}
                className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                title="Done Drawing"
              >
                <Check size={18} />
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
            
            {/* Drawing Controls - Show when drawing is active */}
            {drawingState.isActive && drawingState.tool !== 'none' && (
              <>
                {/* Color Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                    title="Choose Color"
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: currentColor.color }}
                      />
                    </div>
                  </button>
                  
                  {showColorPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                      <div className="grid grid-cols-5 gap-1">
                        {DRAWING_COLORS.map(color => (
                          <button
                            key={color.id}
                            onClick={() => handleColorChange(color.id)}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                              drawingState.colorId === color.id ? 'border-gray-400 scale-110' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color.color }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Stroke Width - Only for pen */}
                {drawingState.tool === 'pen' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStrokeWidthChange(-1)}
                      disabled={drawingState.strokeWidth <= 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      title="Decrease stroke width"
                    >
                      <Minus size={14} />
                    </button>
                    <div 
                      className="rounded-full bg-gray-600"
                      style={{ 
                        width: `${Math.max(4, drawingState.strokeWidth * 2)}px`, 
                        height: `${Math.max(4, drawingState.strokeWidth * 2)}px` 
                      }}
                    />
                    <button
                      onClick={() => handleStrokeWidthChange(1)}
                      disabled={drawingState.strokeWidth >= 10}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      title="Increase stroke width"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
            
            <button 
              onClick={handleTakeSnapshot}
              className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              title="Take Snapshot (Ctrl+Shift+S)"
            >
                <Camera size={18} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowSnapshots(!showSnapshots)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors relative"
                title="View Snapshots"
              >
                  <FileText size={18} />
                  {snapshots.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {snapshots.length}
                    </span>
                  )}
              </button>
              <SnapshotPanel
                snapshots={snapshots}
                isOpen={showSnapshots}
                onClose={() => setShowSnapshots(false)}
                onDownload={handleDownloadSnapshot}
                onCopy={handleCopySnapshot}
                onDelete={handleDeleteSnapshot}
              />
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
            >
                <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-white">
            <div className="max-w-3xl mx-auto w-full pb-4">
                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        files={files} 
                        onViewDocument={handleViewDocument}
                    />
                ))}
                <div ref={messagesEndRef} className="h-4 snapshot-ignore" />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent relative snapshot-ignore">
          <div className="max-w-3xl mx-auto w-full relative">
            
            {/* Context Indicator (Efficiency Mode) */}
            {input.trim() && files.length > 0 && (
                <div className="absolute -top-6 left-6 text-[10px] font-medium transition-all duration-300">
                    {files.filter(f => input.includes(`@${f.name}`)).length > 0 ? (
                        <span className="text-blue-600 flex items-center gap-1">
                            <Sparkles size={10} /> Efficiency Mode: Focused on specific files
                        </span>
                    ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                            <Database size={10} /> Context: All {files.length} files
                        </span>
                    )}
                </div>
            )}

            {/* Mention Popup Menu */}
            {showMentionMenu && filteredFiles.length > 0 && (
                <div className="absolute bottom-full left-6 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Mention a source
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredFiles.map((f, i) => (
                            <button
                                key={f.id}
                                onClick={() => insertMention(f.name)}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors ${i === mentionIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                                <FileText size={14} className={i === mentionIndex ? 'text-blue-500' : 'text-gray-400'} />
                                <span className="truncate">{f.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative flex items-center shadow-lg shadow-gray-200/50 rounded-full bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                {/* File Upload Button */}
                <input
                    type="file"
                    id="chat-file-input"
                    multiple
                    accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                />
                <label
                    htmlFor="chat-file-input"
                    className="absolute left-12 p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Attach files"
                >
                    <FileText size={20} />
                </label>
                {/* Live Mic Button */}
                <button 
                    onClick={() => setIsLiveMode(true)}
                    className="absolute left-2 p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Start Live Conversation"
                >
                    <Mic size={20} />
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const mention = e.dataTransfer.getData('text/plain');
                      if (mention && mention.startsWith('@')) {
                        const cursorPos = inputRef.current?.selectionStart || input.length;
                        const before = input.slice(0, cursorPos);
                        const after = input.slice(cursorPos);
                        const space = (before && !before.endsWith(' ')) ? ' ' : '';
                        const newValue = before + space + mention + ' ' + after;
                        setInput(newValue);
                        setTimeout(() => {
                          if (inputRef.current) {
                            const newPos = before.length + space.length + mention.length + 1;
                            inputRef.current.setSelectionRange(newPos, newPos);
                            inputRef.current.focus();
                          }
                        }, 10);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    placeholder={files.length === 0 ? "Ask me anything or drag files here..." : "Ask a question (Type '@' or drag files to reference)..."}
                    disabled={isGenerating}
                    className="w-full bg-transparent text-black placeholder-gray-500 rounded-full pl-24 pr-14 py-4 focus:outline-none"
                    autoComplete="off"
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isGenerating}
                        className={`
                            p-2.5 rounded-full transition-all duration-200
                            ${!input.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}
                        `}
                    >
                        {isGenerating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
            <div className="text-center mt-2 flex justify-center gap-4">
                 <span className="text-[10px] text-gray-400">AI can make mistakes. Please verify citations.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Handle: Right (Only if Viewer is open) */}
      {!isMobile && activeFile && (
          <div 
            className={`resize-handle-vertical ${isResizingViewer ? 'active' : ''}`}
            onMouseDown={() => setIsResizingViewer(true)}
          />
      )}

      {/* --- RIGHT DOCUMENT VIEWER --- */}
      {activeFile && (
          <div 
            className={`
               fixed md:relative z-30 h-full bg-slate-50 flex flex-col shadow-2xl md:shadow-none border-l-2 border-slate-300
               animate-in slide-in-from-right duration-300
            `}
            style={{ 
                width: isMobile ? '100%' : viewerWidth,
                maxWidth: MAX_VIEWER_WIDTH,
                minWidth: MIN_VIEWER_WIDTH,
                display: 'flex'
            }}
          >
              <DocumentViewer 
                file={activeFile} 
                initialPage={viewState?.page} 
                highlightQuote={viewState?.quote}
                location={viewState?.location}
                onClose={() => setViewState(null)}
              />
          </div>
      )}
    </div>
  );
};

export default App;