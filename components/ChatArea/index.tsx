import React from 'react';
import ChatGreeting from '../ChatGreeting';
import MessageBubble from '../MessageBubble';
import { FloatingInput } from '../../App/components/FloatingInput';
import { Message, ProcessedFile, Source } from '../../types';
import './styles.css';

interface ChatAreaProps {
  // State
  messages: Message[];
  currentChatId: string;
  isGenerating: boolean;
  showGreeting: boolean;
  isGreetingExiting: boolean;
  
  // Input state
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  inputHeight: number;
  uploadedImages: Array<{ file: File; preview: string; tokens?: number }>;
  
  // Files & Sources
  files: ProcessedFile[];
  sources: Source[];
  selectedSourceIds: string[];
  
  // UI state
  isInputDragOver: boolean;
  showMentionMenu: boolean;
  filteredFiles: ProcessedFile[];
  mentionIndex: number;
  isRecording: boolean;
  isTranscribing: boolean;
  activeModelId: string;
  
  // Feature flags
  mindMapData: any;
  isSettingsOpen: boolean;
  isCallingEffect: boolean;
  isHelpOpen: boolean;
  
  // Refs
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  
  // Notes
  notes: Array<{ messageId: string; noteNumber: number }>;
  
  // Handlers
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSendMessage: () => void;
  onFileUpload: (files: FileList) => void;
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (id: string) => void;
  onRecalculateImageTokens: () => void;
  onToggleRecording: () => void;
  onInsertMention: (fileId: string) => void;
  setIsInputDragOver: (value: boolean) => void;
  setInput: (value: string) => void;
  setInputHeight: (value: number) => void;
  onAddSource: (source: Source) => void;
  onDeleteSource: (id: string) => void;
  onToggleSource: (id: string) => void;
  onViewDocument: (fileId: string, page?: number) => void;
  onSaveNote: (content: string, modelId: string, messageId: string) => void;
  onUnsaveNote: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => Promise<void>;
  onSwitchOutput: (messageId: string, index: number) => void;
  onOpenWebViewer: (url: string) => void;
  onOpenWebViewerNewTab: (url: string) => void;
  onEnableDrawing: (messageId: string) => void;
  onCreateSummaryDoc: (messageId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentChatId,
  isGenerating,
  showGreeting,
  isGreetingExiting,
  input,
  inputRef,
  inputHeight,
  uploadedImages,
  files,
  sources,
  selectedSourceIds,
  isInputDragOver,
  showMentionMenu,
  filteredFiles,
  mentionIndex,
  isRecording,
  isTranscribing,
  activeModelId,
  mindMapData,
  isSettingsOpen,
  isCallingEffect,
  isHelpOpen,
  messagesContainerRef,
  messagesEndRef,
  notes,
  onInputChange,
  onKeyDown,
  onPaste,
  onSendMessage,
  onFileUpload,
  onImageUpload,
  onRemoveImage,
  onRecalculateImageTokens,
  onToggleRecording,
  onInsertMention,
  setIsInputDragOver,
  setInput,
  setInputHeight,
  onAddSource,
  onDeleteSource,
  onToggleSource,
  onViewDocument,
  onSaveNote,
  onUnsaveNote,
  onDeleteMessage,
  onRetryMessage,
  onSwitchOutput,
  onOpenWebViewer,
  onOpenWebViewerNewTab,
  onEnableDrawing,
  onCreateSummaryDoc,
}) => {
  const isNewChatState = showGreeting && messages.length === 1 && messages[0].id === 'intro';
  const shouldShowInput = !mindMapData && !isSettingsOpen && !isCallingEffect && !isHelpOpen;

  if (isNewChatState) {
    // NEW CHAT STATE - Centered greeting + input
    return (
      <div ref={messagesContainerRef} className="chat-area-new-state">
        <div className="chat-area-centered-container">
          <div className="chat-area-greeting-section">
            <ChatGreeting content={messages[0].content} isExiting={isGreetingExiting} />
          </div>
          
          {shouldShowInput && (
            <div className="chat-area-input-wrapper">
              <FloatingInput
                input={input}
                inputRef={inputRef}
                isGenerating={isGenerating}
                files={files}
                isInputDragOver={isInputDragOver}
                showMentionMenu={showMentionMenu}
                filteredFiles={filteredFiles}
                mentionIndex={mentionIndex}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                inputHeight={inputHeight}
                sources={sources}
                selectedSourceIds={selectedSourceIds}
                uploadedImages={uploadedImages}
                activeModelId={activeModelId}
                showSuggestions={true}
                onInputChange={onInputChange}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onSendMessage={onSendMessage}
                onFileUpload={onFileUpload}
                onImageUpload={onImageUpload}
                onRemoveImage={onRemoveImage}
                onRecalculateImageTokens={onRecalculateImageTokens}
                onToggleRecording={onToggleRecording}
                onInsertMention={onInsertMention}
                setIsInputDragOver={setIsInputDragOver}
                setInput={setInput}
                setInputHeight={setInputHeight}
                onAddSource={onAddSource}
                onDeleteSource={onDeleteSource}
                onToggleSource={onToggleSource}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE CHAT STATE - Scrollable messages
  return (
    <div ref={messagesContainerRef} className="chat-area-active-state">
      <div className="chat-area-messages-container" style={{ paddingBottom: `${Math.max(0, (inputHeight || 56) - 40)}px` }}>
        {messages
          .filter(msg => msg.id !== 'intro')
          .map((msg, index) => (
            <div 
              key={msg.id}
              className="chat-area-message-wrapper"
              style={{
                animationDelay: `${0.7 + (index * 0.15)}s`,
              }}
            >
              <MessageBubble 
                message={msg}
                chatId={currentChatId}
                files={files}
                sources={sources}
                onViewDocument={onViewDocument}
                onSaveNote={msg.role === 'model' && msg.id !== 'intro' 
                  ? (content, modelId) => onSaveNote(content, modelId, msg.id) 
                  : undefined}
                onUnsaveNote={msg.role === 'model' && msg.id !== 'intro' ? onUnsaveNote : undefined}
                noteNumber={notes.find(n => n.messageId === msg.id)?.noteNumber}
                onDeleteMessage={onDeleteMessage}
                onRetryMessage={msg.role === 'model' ? onRetryMessage : undefined}
                alternativeOutputs={msg.alternativeOutputs}
                currentOutputIndex={msg.currentOutputIndex}
                onSwitchOutput={onSwitchOutput}
                onOpenWebViewer={onOpenWebViewer}
                onOpenWebViewerNewTab={onOpenWebViewerNewTab}
                onEnableDrawing={onEnableDrawing}
                onCreateSummaryDoc={msg.role === 'model' && msg.id !== 'intro' ? onCreateSummaryDoc : undefined}
              />
            </div>
          ))}
        <div ref={messagesEndRef} className="snapshot-ignore" />
      </div>
    </div>
  );
};

export default ChatArea;
