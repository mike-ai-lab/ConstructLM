import React, { useState, useRef, useEffect } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import { sendMessageToGemini, initializeGemini } from './services/geminiService';
import { Send, Menu, StopCircle } from 'lucide-react';

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

    // Process files sequentially to avoid freezing UI too much (simple implementation)
    // In a real web worker implementation, this could be parallel
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Skip if already exists
      if (files.some(f => f.name === file.name)) continue;
      
      const processed = await parseFile(file);
      newFiles.push(processed);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFiles(false);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-10 h-full transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-80'}
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
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600">
               ConstructLM
             </h1>
             <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Local</span>
          </div>
          <div className="text-sm text-gray-500 hidden md:block">
            Powered by Gemini 2.5 Flash
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2">
            <div className="max-w-3xl mx-auto w-full">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto w-full relative">
            <div className="relative flex items-center gap-2">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder={files.length === 0 ? "Upload files to start chatting..." : "Ask about your drawings, specs, or BOQs..."}
                disabled={files.length === 0 || isGenerating}
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isGenerating}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
                ConstructLM can make mistakes. Verify important construction data from original files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;