import React, { useState, useRef, useEffect } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import { sendMessageToGemini, initializeGemini } from './services/geminiService';
import { Send, Menu, StopCircle } from 'lucide-react';

interface ViewState {
  fileId: string;
  page?: number;
  quote?: string;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([
      {
          id: 'intro',
          role: 'model',
          content: 'Hello! I am ConstructLM. Please upload your construction documents (Drawings, BOQs, Specs) in the sidebar to get started. I can answer questions and cite specific files.',
          timestamp: Date.now()
      }
  ]);
  const [input, setInput] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State for the Right Panel PDF Viewer
  const [viewState, setViewState] = useState<ViewState | null>(null);

  useEffect(() => {
      try {
        initializeGemini();
      } catch (e) {
        console.error("Failed to initialize Gemini service:", e);
      }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
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
            ? { ...msg, content: "Sorry, I encountered an error communicating with Gemini. Please check your connection or API key." } 
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

  const handleViewDocument = (fileName: string, page?: number, quote?: string) => {
      const file = files.find(f => f.name === fileName);
      if (file) {
          setViewState({
              fileId: file.id,
              page: page || 1,
              quote
          });
      }
  };

  const activeFile = viewState ? files.find(f => f.id === viewState.fileId) : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Toggle */}
      {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 bg-white shadow-md rounded-lg md:hidden"
          >
              <Menu size={20} />
          </button>
      )}

      {/* Left Sidebar */}
      <div className={`
        fixed md:relative z-10 h-full transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-72 lg:w-80'}
        ${!isSidebarOpen && 'w-0 overflow-hidden'}
      `}>
         <div className="relative h-full">
            <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 md:hidden"
            >
                <StopCircle size={20} />
            </button>
            <FileSidebar 
                files={files} 
                onUpload={handleFileUpload} 
                onRemove={handleRemoveFile}
                isProcessing={isProcessingFiles}
            />
         </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full relative transition-all duration-300 ${activeFile ? 'w-1/2 lg:w-5/12 hidden md:flex' : 'w-full'}`}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600">
               ConstructLM
             </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2">
            <div className="max-w-3xl mx-auto w-full">
                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        files={files} 
                        onViewDocument={handleViewDocument}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto w-full relative">
            <div className="relative flex items-center gap-2">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder={files.length === 0 ? "Upload files..." : "Ask questions..."}
                disabled={files.length === 0 || isGenerating}
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isGenerating}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Document Viewer Panel */}
      {activeFile && (
          <div className="w-full md:w-1/2 lg:w-7/12 h-full z-20 absolute md:static top-0 right-0 bg-white border-l border-gray-200 animate-in slide-in-from-right duration-300">
              <DocumentViewer 
                file={activeFile} 
                initialPage={viewState?.page} 
                highlightQuote={viewState?.quote}
                onClose={() => setViewState(null)}
              />
          </div>
      )}
    </div>
  );
};

export default App;
