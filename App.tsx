import React, { useCallback } from 'react';
import { Menu, X, Phone, Bell } from 'lucide-react';
import { useUIHelpersInit } from './hooks/useUIHelpers';
import { useChatState } from './App/hooks/useChatState';
import { useFileState } from './App/hooks/useFileState';
import { useLayoutState } from './App/hooks/useLayoutState';
import { useInputState } from './App/hooks/useInputState';
import { useFeatureState } from './App/hooks/useFeatureState';
import { useAppEffects } from './App/hooks/useAppEffects';
import { createChatHandlers } from './App/handlers/chatHandlers';
import { createFileHandlers } from './App/handlers/fileHandlers';
import { createMessageHandlers } from './App/handlers/messageHandlers';
import { createInputHandlers } from './App/handlers/inputHandlers';
import { createFeatureHandlers } from './App/handlers/featureHandlers';
import { createAudioHandlers } from './App/handlers/audioHandlers';
import { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, MIN_VIEWER_WIDTH, MAX_VIEWER_WIDTH, MIN_CHAT_WIDTH } from './App/constants';
import { MODEL_REGISTRY, DEFAULT_MODEL_ID } from './services/modelRegistry';
import { mindMapCache } from './services/mindMapCache';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import LiveSession from './components/LiveSession';
import SettingsModal from './components/SettingsModal';
import HelpDocumentation from './components/HelpDocumentation';
import MindMapViewer from './components/MindMapViewer';
import Notebook from './components/Notebook';
import TodoList from './components/TodoList';
import Reminders from './components/Reminders';
import AppHeader from './App/components/AppHeader';
import { FloatingInput } from './App/components/FloatingInput';
import { Note, Todo, Reminder } from './types';

const App: React.FC = () => {
  useUIHelpersInit();
  
  const chatState = useChatState();
  const fileState = useFileState();
  const layoutState = useLayoutState();
  const inputState = useInputState();
  const featureState = useFeatureState();

  const [notes, setNotes] = React.useState<Note[]>([]);
  const [noteCounter, setNoteCounter] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<'chat' | 'notebook' | 'todos' | 'reminders'>('chat');
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [toastMessage, setToastMessage] = React.useState<{ message: string; id: string } | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('notes');
    const savedCounter = localStorage.getItem('noteCounter');
    const savedTodos = localStorage.getItem('todos');
    const savedReminders = localStorage.getItem('reminders');
    if (saved) setNotes(JSON.parse(saved));
    if (savedCounter) setNoteCounter(parseInt(savedCounter));
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
  }, []);

  const handleSaveNote = (content: string, modelId?: string, messageId?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      noteNumber: noteCounter,
      content,
      timestamp: Date.now(),
      modelId,
      chatId: chatState.currentChatId,
      messageId
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('notes', JSON.stringify(updated));
    setNoteCounter(noteCounter + 1);
    localStorage.setItem('noteCounter', (noteCounter + 1).toString());
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('notes', JSON.stringify(updated));
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates } : n);
    setNotes(updated);
    localStorage.setItem('notes', JSON.stringify(updated));
  };

  const handleNavigateToMessage = (chatId: string, messageId: string) => {
    if (chatId !== chatState.currentChatId) {
      chatHandlers.handleSelectChat(chatId);
    }
    setActiveTab('chat');
    setTimeout(() => {
      const msgElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (msgElement) {
        msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgElement.classList.add('highlight-flash');
        setTimeout(() => msgElement.classList.remove('highlight-flash'), 2000);
      }
    }, 100);
  };

  const handleAddTodo = (todo: Omit<Todo, 'id' | 'timestamp'>) => {
    const newTodo: Todo = { ...todo, id: Date.now().toString(), timestamp: Date.now() };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    localStorage.setItem('todos', JSON.stringify(updated));
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    localStorage.setItem('todos', JSON.stringify(updated));
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    localStorage.setItem('todos', JSON.stringify(updated));
  };

  const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
    const updated = todos.map(t => t.id === id ? { ...t, ...updates } : t);
    setTodos(updated);
    localStorage.setItem('todos', JSON.stringify(updated));
  };

  const handleAddReminder = (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => {
    const newReminder: Reminder = { ...reminder, id: Date.now().toString(), timestamp: Date.now(), status: 'pending' };
    const updated = [newReminder, ...reminders];
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const handleUpdateReminder = (id: string, updates: Partial<Reminder>) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ...updates } : r);
    setReminders(updated);
    localStorage.setItem('reminders', JSON.stringify(updated));
  };

  const handleShowToast = (message: string, reminderId: string) => {
    setToastMessage({ message, id: reminderId });
    setTimeout(() => setToastMessage(null), 10000);
  };

  // Initialize activeModelId
  React.useEffect(() => {
    if (!featureState.activeModelId) {
      featureState.setActiveModelId(DEFAULT_MODEL_ID);
    }
  }, []);

  const chatHandlers = createChatHandlers(
    chatState.currentChatId,
    chatState.setCurrentChatId,
    chatState.chats,
    chatState.setChats,
    chatState.messages,
    chatState.setMessages,
    featureState.activeModelId,
    featureState.setActiveModelId
  );

  const fileHandlers = createFileHandlers(
    fileState.files,
    fileState.setFiles,
    fileState.setIsProcessingFiles,
    layoutState.viewState,
    layoutState.setViewState
  );

  const messageHandlers = createMessageHandlers(
    inputState.input,
    inputState.setInput,
    fileState.files,
    chatState.messages,
    chatState.setMessages,
    chatState.isGenerating,
    chatState.setIsGenerating,
    featureState.activeModelId,
    inputState.setShowMentionMenu,
    chatHandlers.saveCurrentChat
  );

  const filteredFiles = fileState.files.filter(f => f.name.toLowerCase().includes(inputState.mentionQuery));

  const inputHandlers = createInputHandlers(
    inputState.input,
    inputState.setInput,
    fileState.files,
    inputState.setShowMentionMenu,
    inputState.setMentionQuery,
    inputState.setMentionIndex,
    inputState.inputRef,
    filteredFiles,
    inputState.mentionIndex,
    inputState.showMentionMenu,
    messageHandlers.handleSendMessage
  );

  const featureHandlers = createFeatureHandlers(
    fileState.files,
    chatState.messages,
    featureState.setSnapshots,
    featureState.drawingState,
    featureState.setShowColorPicker,
    featureState.setMindMapData,
    featureState.setMindMapFileName,
    featureState.setIsGeneratingMindMap,
    featureState.setShowGraphicsLibrary,
    featureState.activeModelId
  );

  const audioHandlers = createAudioHandlers(
    featureState.isRecording,
    featureState.setIsRecording,
    featureState.mediaRecorder,
    featureState.setMediaRecorder,
    inputState.setInput
  );

  useAppEffects(
    featureState.setSnapshots,
    chatState.setChats,
    chatState.setCurrentChatId,
    chatState.setMessages,
    featureState.setActiveModelId,
    chatHandlers.loadChat,
    layoutState.setIsMobile,
    featureState.setDrawingState,
    featureHandlers.handleTakeSnapshot,
    featureState.showGraphicsLibrary,
    featureState.setShowGraphicsLibrary,
    featureState.showModelMenu,
    featureState.setShowModelMenu,
    featureState.modelMenuRef,
    featureState.showToolPicker,
    featureState.setShowToolPicker,
    featureState.toolPickerRef,
    featureState.showColorPicker,
    featureState.setShowColorPicker,
    featureState.colorPickerRef,
    chatState.messages,
    layoutState.userHasScrolled,
    layoutState.messagesEndRef,
    layoutState.messagesContainerRef,
    layoutState.setUserHasScrolled,
    chatState.currentChatId,
    chatHandlers.saveCurrentChat,
    fileState.files,
    featureState.activeModelId,
    featureState.setRateLimitTimers
  );

  // Resize handler for panels
  React.useEffect(() => {
    if (!layoutState.isResizing) return;
    
    // Disable text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    let rafId: number | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) return; // Skip if already scheduled
      
      rafId = requestAnimationFrame(() => {
        if (layoutState.isResizing === 'left') {
          const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
          layoutState.setSidebarWidth(newWidth);
        } else if (layoutState.isResizing === 'right') {
          const newWidth = Math.max(MIN_VIEWER_WIDTH, Math.min(MAX_VIEWER_WIDTH, window.innerWidth - e.clientX));
          layoutState.setViewerWidth(newWidth);
        }
        rafId = null;
      });
    };
    
    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      layoutState.setIsResizing(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [layoutState.isResizing]);

  const activeFile = layoutState.viewState ? fileState.files.find(f => f.id === layoutState.viewState!.fileId) : null;
  const activeModel = MODEL_REGISTRY.find(m => m.id === featureState.activeModelId) || MODEL_REGISTRY[0];
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const handleCloseLiveSession = useCallback(() => featureState.setIsLiveMode(false), []);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#1a1a1a] overflow-hidden text-sm relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[80] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <Bell size={16} />
          <span className="text-sm font-medium">{toastMessage.message}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:bg-red-700 rounded p-1">
            <X size={14} />
          </button>
        </div>
      )}
      {featureState.isLiveMode && <LiveSession onClose={handleCloseLiveSession} />}
      {featureState.isCallingEffect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center">
          <div className="bg-white dark:bg-[#222222] rounded-3xl shadow-2xl p-12 flex flex-col items-center gap-6 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
              <div className="relative bg-green-500 p-6 rounded-full">
                <Phone size={48} className="text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Calling Gemini...</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connecting to live conversation</p>
            </div>
          </div>
        </div>
      )}
      {featureState.isSettingsOpen && <SettingsModal onClose={() => featureState.setIsSettingsOpen(false)} />}
      {featureState.isHelpOpen && <HelpDocumentation onClose={() => featureState.setIsHelpOpen(false)} />}
      {featureState.isGeneratingMindMap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Generating Mind Map</h3>
              <p className="text-sm text-gray-600">AI is analyzing the document structure...</p>
            </div>
          </div>
        </div>
      )}
      {featureState.mindMapData && (
        <div className="fixed inset-0 z-[60]">
          <MindMapViewer 
            data={featureState.mindMapData} 
            fileName={featureState.mindMapFileName}
            onClose={() => { featureState.setMindMapData(null); featureState.setMindMapFileName(''); }}
          />
        </div>
      )}
      
      {layoutState.isMobile && !layoutState.isSidebarOpen && (
        <button 
          onClick={() => layoutState.setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 p-2 bg-white shadow-md rounded-full border border-gray-200"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      )}

      <div 
        className={`fixed md:relative z-40 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] ${layoutState.isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!layoutState.isSidebarOpen && !layoutState.isMobile ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''} overflow-hidden`}
        style={{ 
          width: layoutState.isMobile ? '85%' : (layoutState.isSidebarOpen ? layoutState.sidebarWidth : 0)
        }}
      >
        <FileSidebar 
          files={fileState.files} 
          onUpload={fileHandlers.handleFileUpload} 
          onRemove={fileHandlers.handleRemoveFile}
          isProcessing={fileState.isProcessingFiles}
          onGenerateMindMap={featureHandlers.handleGenerateMindMap}
          chats={chatState.chats}
          activeChatId={chatState.currentChatId}
          onSelectChat={chatHandlers.handleSelectChat}
          onCreateChat={chatHandlers.handleCreateChat}
          onDeleteChat={chatHandlers.handleDeleteChat}
          isDragOver={layoutState.isSidebarDragOver}
          onDragStateChange={layoutState.setIsSidebarDragOver}
        />
        {layoutState.isSidebarOpen && !layoutState.isMobile && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-50"
            onMouseDown={() => layoutState.setIsResizing('left')}
          />
        )}
      </div>



      {/* MIDDLE CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-[#1a1a1a] transition-all duration-300" style={{ minWidth: MIN_CHAT_WIDTH }}>
        <AppHeader
          isMobile={layoutState.isMobile}
          isSidebarOpen={layoutState.isSidebarOpen}
          setIsSidebarOpen={layoutState.setIsSidebarOpen}
          activeModel={activeModel}
          showModelMenu={featureState.showModelMenu}
          setShowModelMenu={featureState.setShowModelMenu}
          modelMenuRef={featureState.modelMenuRef}
          rateLimitTimers={featureState.rateLimitTimers}
          activeModelId={featureState.activeModelId}
          setActiveModelId={featureState.setActiveModelId}
          isElectron={isElectron}
          isCallingEffect={featureState.isCallingEffect}
          isLiveMode={featureState.isLiveMode}
          setIsCallingEffect={featureState.setIsCallingEffect}
          setIsLiveMode={featureState.setIsLiveMode}
          handleCreateChat={chatHandlers.handleCreateChat}
          showToolPicker={featureState.showToolPicker}
          setShowToolPicker={featureState.setShowToolPicker}
          toolPickerRef={featureState.toolPickerRef}
          drawingState={featureState.drawingState}
          handleDrawingToolChange={featureHandlers.handleDrawingToolChange}
          handleClearAll={featureHandlers.handleClearAll}
          showColorPicker={featureState.showColorPicker}
          setShowColorPicker={featureState.setShowColorPicker}
          colorPickerRef={featureState.colorPickerRef}
          currentColor={featureHandlers.currentColor}
          handleColorChange={featureHandlers.handleColorChange}
          handleStrokeWidthChange={featureHandlers.handleStrokeWidthChange}
          handleTakeSnapshot={featureHandlers.handleTakeSnapshot}
          showGraphicsLibrary={featureState.showGraphicsLibrary}
          setShowGraphicsLibrary={featureState.setShowGraphicsLibrary}
          snapshots={featureState.snapshots}
          mindMapCache={mindMapCache}
          setIsHelpOpen={featureState.setIsHelpOpen}
          setIsSettingsOpen={featureState.setIsSettingsOpen}
          handleDownloadSnapshot={featureHandlers.handleDownloadSnapshot}
          handleCopySnapshot={featureHandlers.handleCopySnapshot}
          handleDeleteSnapshot={featureHandlers.handleDeleteSnapshot}
          handleOpenMindMapFromLibrary={featureHandlers.handleOpenMindMapFromLibrary}
          notesCount={notes.length}
          todosCount={todos.length}
          remindersCount={reminders.filter(r => r.status === 'pending').length}
          onOpenNotebook={() => setActiveTab('notebook')}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'chat' ? (
          <div ref={layoutState.messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-white dark:bg-[#1a1a1a]">
            <div className="max-w-3xl mx-auto w-full" style={{ paddingBottom: `${inputState.inputHeight - 40}px` }}>
              {chatState.messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  files={fileState.files} 
                  onViewDocument={fileHandlers.handleViewDocument}
                  onSaveNote={msg.role === 'model' ? (content, modelId) => handleSaveNote(content, modelId, msg.id) : undefined}
                  noteNumber={notes.find(n => n.messageId === msg.id)?.noteNumber}
                />
              ))}
              <div ref={layoutState.messagesEndRef} className="snapshot-ignore" />
            </div>
          </div>
        ) : activeTab === 'todos' ? (
          <div className="flex-1 overflow-hidden">
            <TodoList
              todos={todos}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
            />
          </div>
        ) : activeTab === 'reminders' ? (
          <div className="flex-1 overflow-hidden">
            <Reminders
              reminders={reminders}
              onAddReminder={handleAddReminder}
              onDeleteReminder={handleDeleteReminder}
              onUpdateReminder={handleUpdateReminder}
              onShowToast={handleShowToast}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Notebook 
              notes={notes} 
              onDeleteNote={handleDeleteNote} 
              onUpdateNote={handleUpdateNote} 
              onNavigateToMessage={handleNavigateToMessage} 
              files={fileState.files} 
              onViewDocument={fileHandlers.handleViewDocument} 
              chats={chatState.chats}
            />
          </div>
        )}

        {/* Floating Input Area */}
        {!featureState.mindMapData && !featureState.isSettingsOpen && !featureState.isCallingEffect && !featureState.isHelpOpen && activeTab === 'chat' && (
        <div className="flex justify-center px-4 pb-2 w-full bg-white dark:bg-[#1a1a1a]">
          <div className="w-full max-w-[800px]">
            <FloatingInput
              input={inputState.input}
              inputRef={inputState.inputRef}
              isGenerating={chatState.isGenerating}
              files={fileState.files}
              isInputDragOver={layoutState.isInputDragOver}
              showMentionMenu={inputState.showMentionMenu}
              filteredFiles={filteredFiles}
              mentionIndex={inputState.mentionIndex}
              isRecording={featureState.isRecording}
              inputHeight={inputState.inputHeight}
              onInputChange={inputHandlers.handleInputChange}
              onKeyDown={inputHandlers.handleKeyDown}
              onSendMessage={messageHandlers.handleSendMessage}
              onFileUpload={fileHandlers.handleFileUpload}
              onToggleRecording={audioHandlers.handleToggleRecording}
              onInsertMention={inputHandlers.insertMention}
              setIsInputDragOver={layoutState.setIsInputDragOver}
              setInput={inputState.setInput}
              setInputHeight={inputState.setInputHeight}
            />
            <p className="text-[#666666] dark:text-[#a0a0a0] text-xs text-center mt-2">AI can make mistakes. Please verify citations.</p>
          </div>
        </div>
        )}
      </div>



      {/* RIGHT DOCUMENT VIEWER */}
      {activeFile && (
        <div 
          className="fixed md:relative z-30 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col shadow-2xl md:shadow-none border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden"
          style={{ 
            width: layoutState.isMobile ? '100%' : layoutState.viewerWidth
          }}
        >
          {!layoutState.isMobile && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-50"
              onMouseDown={() => layoutState.setIsResizing('right')}
            />
          )}
          <DocumentViewer 
            file={activeFile} 
            initialPage={layoutState.viewState?.page} 
            highlightQuote={layoutState.viewState?.quote}
            location={layoutState.viewState?.location}
            onClose={() => layoutState.setViewState(null)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
