import React, { useState, useRef, useEffect } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import LiveSession from './components/LiveSession';
import { sendMessageToGemini, initializeGemini } from './services/geminiService';
import { Send, Menu, Sparkles, X, FileText, Database, PanelLeft, PanelLeftOpen, Mic } from 'lucide-react';

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

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([
      {
          id: 'intro',
          role: 'model',
          content: 'Hello. I am ConstructLM. \n\nUpload your project documents (PDF, Excel) or a whole folder to begin. \n\n**Tip:** Type "@" in the chat to mention a specific file and save tokens.',
          timestamp: Date.now()
      }
  ]);
  const [input, setInput] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  useEffect(() => {
      initializeGemini();
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH)));
      }
      if (isResizingViewer) {
        // Calculate width from the right side of the screen
        const newWidth = window.innerWidth - e.clientX;
        setViewerWidth(Math.max(MIN_VIEWER_WIDTH, Math.min(newWidth, MAX_VIEWER_WIDTH)));
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

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

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
    const activeContextFiles = mentionedFiles.length > 0 ? mentionedFiles : files;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
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
        isStreaming: true
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      await sendMessageToGemini(
          userMsg.content,
          files, 
          activeContextFiles, 
          (streamedText) => {
              setMessages(prev => prev.map(msg => 
                  msg.id === modelMsgId 
                  ? { ...msg, content: streamedText } 
                  : msg
              ));
          }
      );
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

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-sm relative">
      {/* Live Mode Overlay */}
      {isLiveMode && <LiveSession onClose={() => setIsLiveMode(false)} />}
      
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
            fixed md:relative z-40 h-full bg-[#fcfcfc] flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 md:border-r-0
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
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white transition-all duration-300">
        {/* Header */}
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
             <h1 className="font-semibold text-gray-800 text-lg tracking-tight">ConstructLM</h1>
          </div>
          <div className="text-xs text-gray-400 font-medium hidden sm:block">
              Research Assistant
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
        <div className="p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent relative">
          <div className="max-w-3xl mx-auto w-full relative">
            
            {/* Context Indicator (Efficiency Mode) */}
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
                    placeholder={files.length === 0 ? "Add sources to start..." : "Ask a question (Type '@' to reference a file)..."}
                    disabled={files.length === 0 || isGenerating}
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 rounded-full pl-12 pr-14 py-4 focus:outline-none"
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
                onClose={() => setViewState(null)}
              />
          </div>
      )}
    </div>
  );
};

export default App;