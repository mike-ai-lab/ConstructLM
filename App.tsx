import React, { useCallback } from 'react';
import { Menu, X, Phone } from 'lucide-react';
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
import GraphicsLibrary from './components/GraphicsLibrary';
import AppHeader from './App/components/AppHeader';
import { FloatingInput } from './App/components/FloatingInput';

const App: React.FC = () => {
  useUIHelpersInit();
  
  const chatState = useChatState();
  const fileState = useFileState();
  const layoutState = useLayoutState();
  const inputState = useInputState();
  const featureState = useFeatureState();

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
    chatState.messages,
    layoutState.userHasScrolled,
    layoutState.messagesEndRef,
    layoutState.messagesContainerRef,
    layoutState.setUserHasScrolled,
    layoutState.isResizingSidebar,
    layoutState.isResizingViewer,
    layoutState.setSidebarWidth,
    layoutState.setViewerWidth,
    layoutState.setIsResizingSidebar,
    layoutState.setIsResizingViewer,
    layoutState.isSidebarOpen,
    layoutState.sidebarWidth,
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    MIN_VIEWER_WIDTH,
    MAX_VIEWER_WIDTH,
    MIN_CHAT_WIDTH,
    chatState.currentChatId,
    chatHandlers.saveCurrentChat,
    fileState.files,
    featureState.activeModelId,
    featureState.setRateLimitTimers
  );

  const activeFile = layoutState.viewState ? fileState.files.find(f => f.id === layoutState.viewState!.fileId) : null;
  const activeModel = MODEL_REGISTRY.find(m => m.id === featureState.activeModelId) || MODEL_REGISTRY[0];
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const handleCloseLiveSession = useCallback(() => featureState.setIsLiveMode(false), []);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#1a1a1a] overflow-hidden text-sm relative">
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

      {/* LEFT SIDEBAR */}
      <div 
        className={`fixed md:relative z-40 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] md:border-r-0 ${layoutState.isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!layoutState.isSidebarOpen && !layoutState.isMobile ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''}`}
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
      </div>

      {!layoutState.isMobile && layoutState.isSidebarOpen && !featureState.mindMapData && !featureState.isGeneratingMindMap && (
        <div className={`resize-handle-vertical ${layoutState.isResizingSidebar ? 'active' : ''}`} onMouseDown={() => layoutState.setIsResizingSidebar(true)} />
      )}

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
          drawingState={featureState.drawingState}
          handleDrawingToolChange={featureHandlers.handleDrawingToolChange}
          handleClearAll={featureHandlers.handleClearAll}
          showColorPicker={featureState.showColorPicker}
          setShowColorPicker={featureState.setShowColorPicker}
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
        />

        <div ref={layoutState.messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-white dark:bg-[#1a1a1a]">
          <div className="max-w-3xl mx-auto w-full" style={{ paddingBottom: `${inputState.inputHeight + 100}px` }}>
            {chatState.messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                files={fileState.files} 
                onViewDocument={fileHandlers.handleViewDocument}
              />
            ))}
            <div ref={layoutState.messagesEndRef} className="h-4 snapshot-ignore" />
          </div>
        </div>

        {/* Floating Input Area */}
        {!featureState.mindMapData && !featureState.isSettingsOpen && !featureState.isCallingEffect && !featureState.isHelpOpen && (
        <>
        {/* Solid background layer */}
        <div 
          className="fixed bottom-0 bg-white dark:bg-[#1a1a1a] pointer-events-none z-20"
          style={{
            left: layoutState.isMobile ? '16px' : (layoutState.isSidebarOpen ? `${layoutState.sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (layoutState.isMobile ? '16px' : `${layoutState.viewerWidth + 16}px`) : '16px',
            height: '140px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <div
          className="input-gradient-layer fixed bottom-[140px] pointer-events-none z-20"
          style={{
            left: layoutState.isMobile ? '16px' : (layoutState.isSidebarOpen ? `${layoutState.sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (layoutState.isMobile ? '16px' : `${layoutState.viewerWidth + 16}px`) : '16px',
            height: '30px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <div 
          className="floating-input-container z-20"
          style={{
            left: layoutState.isMobile ? '16px' : (layoutState.isSidebarOpen ? `${layoutState.sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (layoutState.isMobile ? '16px' : `${layoutState.viewerWidth + 16}px`) : '16px'
          }}
        >
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
        </div>
        </>
        )}

        {/* Footer Text - Independent Element */}
        {!featureState.mindMapData && !featureState.isSettingsOpen && !featureState.isCallingEffect && !featureState.isHelpOpen && (
        <div 
          className="fixed bottom-2 text-center pointer-events-none z-20"
          style={{
            left: layoutState.isMobile ? '16px' : (layoutState.isSidebarOpen ? `${layoutState.sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (layoutState.isMobile ? '16px' : `${layoutState.viewerWidth + 16}px`) : '16px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <span className="text-[#666666] dark:text-[#a0a0a0] text-xs">AI can make mistakes. Please verify citations.</span>
        </div>
        )}
      </div>

      {!layoutState.isMobile && activeFile && !featureState.mindMapData && !featureState.isGeneratingMindMap && (
        <div className={`resize-handle-vertical ${layoutState.isResizingViewer ? 'active' : ''}`} onMouseDown={() => layoutState.setIsResizingViewer(true)} />
      )}

      {/* RIGHT DOCUMENT VIEWER */}
      {activeFile && (
        <div 
          className="fixed md:relative z-30 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col shadow-2xl md:shadow-none border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]"
          style={{ 
            width: layoutState.isMobile ? '100%' : layoutState.viewerWidth,
            maxWidth: MAX_VIEWER_WIDTH,
            minWidth: MIN_VIEWER_WIDTH,
            display: 'flex'
          }}
        >
          <DocumentViewer 
            file={activeFile} 
            initialPage={layoutState.viewState?.page} 
            highlightQuote={layoutState.viewState?.quote}
            location={layoutState.viewState?.location}
            onClose={() => layoutState.setViewState(null)}
          />
        </div>
      )}
      
      <GraphicsLibrary
        isOpen={featureState.showGraphicsLibrary}
        onClose={() => featureState.setShowGraphicsLibrary(false)}
        snapshots={featureState.snapshots}
        onDownloadSnapshot={featureHandlers.handleDownloadSnapshot}
        onCopySnapshot={featureHandlers.handleCopySnapshot}
        onDeleteSnapshot={featureHandlers.handleDeleteSnapshot}
        onOpenMindMap={featureHandlers.handleOpenMindMapFromLibrary}
      />
    </div>
  );
};

export default App;
