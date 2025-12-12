
import React, { useState, useRef, useEffect } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import ChatSidebar from './components/ChatSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import LiveSession from './components/LiveSession';
import SettingsModal from './components/SettingsModal';
import DataManager from './components/DataManager';
import { sendMessageToLLM } from './services/llmService';
import { initializeGemini } from './services/geminiService';
import { MODEL_REGISTRY, DEFAULT_MODEL_ID } from './services/modelRegistry';
import { ragService } from './services/ragService';
import { Send, Menu, Sparkles, X, FileText, Database, PanelLeft, PanelLeftOpen, Mic, Cpu, ChevronDown, Settings, ShieldCheck, MessageSquare, Plus } from 'lucide-react';

import { saveWorkspaceLocal, loadWorkspaceLocal, getLastActiveModel } from './services/storageService';
import { 
  createChatSession, 
  updateChatSession, 
  getAllChatSessions, 
  deleteChatSession, 
  getChatSession,
  getActiveChatId,
  setActiveChatId,
  ChatListItem 
} from './services/chatHistoryService';

interface ViewState {
  fileId: string;
  page?: number;
  quote?: string;
  location?: string;
}

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 500;
const MIN_VIEWER_WIDTH = 400;
const MAX_VIEWER_WIDTH = 1200;

const extractCitations = (messages: Message[], targetFileName: string) => {
    const citations: { id: string, label: string, quote: string, location: string }[] = [];
    const SPLIT_REGEX = /(\{\{citation:[\s\S]*?\}\})/g;
    const MATCH_REGEX = /\{\{citation:([\s\S]*?)\|([\s\S]*?)\|([\s\S]*?)\}\}/;

    messages.forEach((msg, msgIdx) => {
        if (msg.role === 'model' && msg.content) {
            const parts = msg.content.split(SPLIT_REGEX);
            parts.forEach((part, partIdx) => {
                const match = part.match(MATCH_REGEX);
                if (match) {
                    const fileName = match[1].trim();
                    if (fileName === targetFileName) {
                        citations.push({
                            id: `${msg.id}-${partIdx}`,
                            label: `C${citations.length + 1}`,
                            location: match[2].trim(),
                            quote: match[3].trim()
                        });
                    }
                }
            });
        }
    });
    return citations;
};

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Model State
  const [activeModelId, setActiveModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);

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
  const [mentionIndex, setMentionIndex] = useState(0); 
  const inputRef = useRef<HTMLInputElement>(null);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Chat History State
  const [chatHistory, setChatHistory] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'sources'>('sources');

  // --- INITIALIZATION ---
  useEffect(() => {
    initializeGemini();
    
    // Initialize RAG service
    ragService.loadIndex();
    
    // Load chat history and active chat
    const loadChatData = async () => {
      const history = await getAllChatSessions();
      setChatHistory(history);
      
      const activeId = await getActiveChatId();
      if (activeId) {
        const activeChat = await getChatSession(activeId);
        if (activeChat) {
          setActiveChatIdState(activeId);
          setFiles(activeChat.files);
          setMessages(activeChat.messages);
          setActiveModelId(activeChat.modelId);
          return;
        }
      }
      
      // Fallback to legacy data or default
      loadWorkspaceLocal().then(data => {
        if (data) {
          setFiles(data.files || []); 
          setMessages(data.messages || []); 
        } else {
          setMessages([{
            id: 'intro',
            role: 'model',
            content: 'Hello. I am ConstructLM. \n\nUpload your project documents (PDF, Excel) or a whole folder to begin. \n\n**Tip:** Type "@" in the chat to mention a specific file and improve accuracy.',
            timestamp: Date.now()
          }]);
        }
      });
    };
    
    loadChatData();
  }, []);

  // --- AUTO SAVE ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (messages.length > 1) {
        if (activeChatId) {
          updateChatSession(activeChatId, messages, files);
        } else if (messages.some(m => m.role === 'user')) {
          // Create new chat session if user has sent a message
          createChatSession(messages, files, activeModelId).then(session => {
            setActiveChatIdState(session.id);
            refreshChatHistory();
          });
        }
      }
    }, 2000); 

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [files, messages, activeChatId, activeModelId]);

  const refreshChatHistory = async () => {
    const history = await getAllChatSessions();
    setChatHistory(history);
  };


  // --- NORMAL APP LOGIC ---

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      const handleClickOutside = (event: MouseEvent) => {
          if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
              setShowModelMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
          window.removeEventListener('resize', handleResize);
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH)));
      }
      if (isResizingViewer) {
        const newWidth = window.innerWidth - e.clientX;
        setViewerWidth(Math.max(MIN_VIEWER_WIDTH, Math.min(newWidth, MAX_VIEWER_WIDTH)));
      }
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingViewer(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto'; 
    };
    if (isResizingSidebar || isResizingViewer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; 
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingViewer]);

  const handleFileUpload = async (fileList: FileList) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (files.some(f => f.name === file.name)) continue;
      const processed = await parseFile(file);
      newFiles.push(processed);
    }
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    setIsProcessingFiles(false);
  };

  const handleRemoveFile = async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

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

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
    const activeContextFiles = mentionedFiles.length > 0 ? mentionedFiles : files;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const currentHistory = messages; 
    
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
        isStreaming: true
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      let accumText = "";
      await sendMessageToLLM(
          activeModelId,
          currentHistory,
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
    } catch (error) {
       console.error(error);
       setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, content: (error as Error).message || "Unknown error occurred" } 
            : msg
        ));
    } finally {
        setIsGenerating(false);
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, isStreaming: false } 
            : msg
        ));
        
        // Auto-save after message completion
        setTimeout(() => {
          if (activeChatId) {
            updateChatSession(activeChatId, [...messages, userMsg, { ...modelMsg, content: accumText, isStreaming: false }], files);
          }
        }, 1000);
    }
  };

  const handleNewChat = async () => {
    setMessages([{
      id: 'intro',
      role: 'model',
      content: 'Hello. I am ConstructLM. \n\nUpload your project documents (PDF, Excel) or a whole folder to begin. \n\n**Tip:** Type "@" in the chat to mention a specific file and improve accuracy.',
      timestamp: Date.now()
    }]);
    setFiles([]);
    setActiveChatIdState(null);
    await setActiveChatId(null);
    setViewState(null);
  };

  const handleSelectChat = async (chatItem: ChatListItem) => {
    const chat = await getChatSession(chatItem.id);
    if (chat) {
      setMessages(chat.messages);
      setFiles(chat.files);
      setActiveModelId(chat.modelId);
      setActiveChatIdState(chat.id);
      await setActiveChatId(chat.id);
      setViewState(null);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChatSession(chatId);
    if (activeChatId === chatId) {
      handleNewChat();
    }
    refreshChatHistory();
  };

  const loadTestFile = async (fileName: string, type: 'excel' | 'text') => {
    try {
      const response = await fetch(`/${fileName}`);
      const content = await response.text();
      
      const testFile: ProcessedFile = {
        id: Date.now().toString(),
        name: fileName,
        type: type,
        size: content.length,
        content: content,
        status: 'ready',
        fileHandle: null
      };
      
      setFiles(prev => [...prev.filter(f => f.name !== fileName), testFile]);
    } catch (error) {
      console.error('Failed to load test file:', error);
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
  const activeCitations = activeFile ? extractCitations(messages, activeFile.name) : [];
  const activeModel = MODEL_REGISTRY.find(m => m.id === activeModelId) || MODEL_REGISTRY[0];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-sm relative">
      {isLiveMode && <LiveSession onClose={() => setIsLiveMode(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isDataManagerOpen && <DataManager files={files} onClose={() => setIsDataManagerOpen(false)} />}
      
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
            fixed md:relative z-40 h-full bg-white flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${!isSidebarOpen && !isMobile ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''}
        `}
        style={{ width: isMobile ? '85%' : (isSidebarOpen ? sidebarWidth : 0) }}
      >
        <div className="h-full flex flex-col relative w-full">
            <div className="p-4 flex items-center justify-between border-b border-gray-200">
                <h2 className="text-xl font-bold text-indigo-600">Context Console</h2>
                {isMobile && (
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 text-gray-500 hover:text-gray-800 rounded-full"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`w-1/2 py-2 text-sm font-medium text-center transition duration-150 ease-in-out border-b-2 ${
                        activeTab === 'history' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-600'
                    }`}
                >
                    History
                </button>
                <button 
                    onClick={() => setActiveTab('sources')}
                    className={`w-1/2 py-2 text-sm font-medium text-center transition duration-150 ease-in-out border-b-2 ${
                        activeTab === 'sources' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-600'
                    }`}
                >
                    Sources
                </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'history' ? (
                    <div className="p-4 h-full overflow-y-auto">
                        <div className="mb-4">
                            <button
                                onClick={handleNewChat}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={16} />
                                New Chat
                            </button>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
                        <div className="space-y-2">
                            {chatHistory.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`group p-3 rounded-lg cursor-pointer transition-colors border ${
                                        activeChatId === chat.id 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleSelectChat(chat)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{chat.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(chat.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChat(chat.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {chatHistory.length === 0 && (
                                <p className="text-center text-gray-400 mt-6">No chat history yet</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`flex flex-col h-full w-full ${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                        <FileSidebar 
                            files={files} 
                            onUpload={handleFileUpload} 
                            onRemove={handleRemoveFile}
                            isProcessing={isProcessingFiles}
                        />
                    </div>
                )}
            </div>
        </div>
      </div>

      {!isMobile && isSidebarOpen && (
          <div 
            className={`resize-handle-vertical ${isResizingSidebar ? 'active' : ''}`}
            onMouseDown={() => setIsResizingSidebar(true)}
          />
      )}

      {/* --- MIDDLE CHAT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white transition-all duration-300">
        <header className="h-14 flex-none border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
             {!isMobile && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="mr-2 p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                 >
                    {isSidebarOpen ? <PanelLeft size={20} /> : <PanelLeftOpen size={20} />}
                 </button>
             )}
             <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-lg shadow-sm">
                <Sparkles size={16} className="text-white" />
             </div>
             <h1 className="font-semibold text-gray-800 text-lg tracking-tight mr-4">ConstructLM</h1>
             
             {activeChatId && (
                 <div className="flex items-center gap-2 text-xs text-gray-500">
                     <MessageSquare size={14} />
                     <span>Active Session</span>
                 </div>
             )}
             
             <div className="relative" ref={modelMenuRef}>
                 <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 rounded-full text-xs font-medium text-gray-700 transition-colors border border-transparent hover:border-gray-200"
                 >
                     <Cpu size={14} className={activeModel.provider === 'google' ? 'text-blue-500' : 'text-orange-500'} />
                     <span className="max-w-[120px] truncate">{activeModel.name}</span>
                     <ChevronDown size={12} className="text-gray-400" />
                 </button>
                 
                 {showModelMenu && (
                     <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                         <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                             Select Model
                         </div>
                         <div className="max-h-[400px] overflow-y-auto p-1 space-y-0.5">
                             {MODEL_REGISTRY.map(model => (
                                 <button
                                     key={model.id}
                                     onClick={() => { setActiveModelId(model.id); setShowModelMenu(false); }}
                                     disabled={model.isDeprecated}
                                     className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex flex-col gap-1 group ${activeModelId === model.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                 >
                                     <div className="flex items-center justify-between w-full">
                                         <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${model.provider === 'google' ? 'bg-blue-500' : model.provider === 'openai' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                            <span className={`text-sm font-medium ${activeModelId === model.id ? 'text-blue-700' : 'text-gray-700'} ${model.isDeprecated ? 'line-through opacity-50' : ''}`}>{model.name}</span>
                                         </div>
                                         <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                            model.capacityTag === 'High' ? 'bg-green-100 text-green-700' : 
                                            model.capacityTag === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-red-50 text-red-500'
                                         }`}>
                                             {model.capacityTag === 'High' ? 'High Capacity' : 'Limited'}
                                         </span>
                                     </div>
                                     <span className="text-[10px] text-gray-400 pl-4">{model.description}</span>
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                  <ShieldCheck size={12} />
                  Local Mode
              </div>

              <div className="flex gap-2">
                  <button 
                    onClick={() => loadTestFile('test-boq.csv', 'excel')}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                    title="Load Test BOQ"
                  >
                      📊
                  </button>
                  <button 
                    onClick={() => loadTestFile('test-specs.txt', 'text')}
                    className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                    title="Load Test Specs"
                  >
                      📋
                  </button>
              </div>

              <button 
                onClick={() => setIsDataManagerOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                title="Data Manager"
              >
                  <Database size={18} />
              </button>
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                title="Settings"
              >
                  <Settings size={18} />
              </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
            <div className="max-w-3xl mx-auto w-full pb-4">
                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        files={files} 
                        onViewDocument={handleViewDocument}
                    />
                ))}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-gray-100 relative">
          <div className="max-w-3xl mx-auto w-full relative">
            
            {input.trim() && (
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
                {activeModel.provider === 'google' && (
                    <button 
                        onClick={() => setIsLiveMode(true)}
                        className="absolute left-2 p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Start Live Conversation"
                    >
                        <Mic size={20} />
                    </button>
                )}

                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={files.length === 0 ? "Add sources to start..." : `Ask ${activeModel.name}... (Type '@' to reference a file)`}
                    disabled={files.length === 0 || isGenerating}
                    className={`w-full bg-transparent text-gray-800 placeholder-gray-400 rounded-full ${activeModel.provider === 'google' ? 'pl-12' : 'pl-6'} pr-14 py-4 focus:outline-none`}
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

          </div>
        </div>
      </div>

      {!isMobile && activeFile && (
          <div 
            className={`resize-handle-vertical ${isResizingViewer ? 'active' : ''}`}
            onMouseDown={() => setIsResizingViewer(true)}
          />
      )}

      {activeFile && (
          <div 
            className={`
               fixed md:relative z-30 h-full bg-gray-50 flex flex-col shadow-2xl md:shadow-none border-l-0
               animate-in slide-in-from-right duration-300
            `}
            style={{ 
                width: isMobile ? '100%' : viewerWidth,
                display: 'flex'
            }}
          >
              <DocumentViewer 
                file={activeFile} 
                initialPage={viewState?.page} 
                highlightQuote={viewState?.quote}
                location={viewState?.location}
                citations={activeCitations} 
                onClose={() => setViewState(null)}
              />
          </div>
      )}
    </div>
  );
};

export default App;
