import React, { useState, useRef, useEffect } from 'react';
import { Message, ProcessedFile } from '../types';
import { Sparkles, User, Volume2, Loader2, StopCircle, BookmarkPlus, FileText, ExternalLink, Trash2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import CitationRenderer from './CitationRenderer';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';
import { contextMenuManager, createMessageContextMenu } from '../utils/uiHelpers';
import { InteractiveBlob } from './InteractiveBlob';

interface MessageBubbleProps {
  message: Message;
  files: ProcessedFile[];
  sources: any[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onSaveNote?: (content: string, modelId?: string) => void;
  onUnsaveNote?: (messageId: string) => void;
  noteNumber?: number;
  onDeleteMessage?: (messageId: string) => void;
  onRetryMessage?: (messageId: string) => void;
  alternativeOutputs?: string[];
  currentOutputIndex?: number;
  onSwitchOutput?: (messageId: string, index: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  files, 
  sources, 
  onViewDocument, 
  onSaveNote, 
  onUnsaveNote, 
  noteNumber,
  onDeleteMessage,
  onRetryMessage,
  alternativeOutputs = [],
  currentOutputIndex = 0,
  onSwitchOutput
}) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);


  const handlePlayAudio = async () => {
      if (isPlaying) {
          sourceRef.current?.stop();
          setIsPlaying(false);
          return;
      }

      try {
          setIsLoadingAudio(true);
          const pcmData = await generateSpeech(message.content);
          
          if (pcmData) {
               if (!audioContextRef.current) {
                   audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
               }
               const ctx = audioContextRef.current;
               if (ctx.state === 'suspended') await ctx.resume();

               const audioBuffer = await decodeAudioData(pcmData, ctx, 24000);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(ctx.destination);
               source.onended = () => setIsPlaying(false);
               
               sourceRef.current = source;
               source.start();
               setIsPlaying(true);
          }
      } catch (e) {
          console.error("Failed to play audio", e);
      } finally {
          setIsLoadingAudio(false);
      }
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`} data-message-id={message.id}>
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 group`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${
          isUser ? 'w-8 h-8' : 'w-10 h-10'
        } rounded-full flex items-center justify-center shadow-sm border ${
          isUser ? 'bg-white dark:bg-[#2a2a2a] border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[#666666] dark:text-[#a0a0a0]' : 'border-transparent overflow-hidden'
        }`}>
          {isUser ? (
            <User size={14} />
          ) : (
            <InteractiveBlob size={40} color="#a6aed9" />
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
             <span className="text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-widest">
                 {isUser ? 'You' : (message.modelId || 'AI')}
             </span>
             {noteNumber && (
               <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] font-semibold">
                 Note #{noteNumber}
               </span>
             )}
             {!isUser && !message.isStreaming && (
                 <>
                   <button 
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                      title="Read Aloud"
                   >
                      {isLoadingAudio ? <Loader2 size={12} className="animate-spin" /> : (isPlaying ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                   </button>
                   {onRetryMessage && (
                     <button
                       onClick={() => onRetryMessage(message.id)}
                       className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                       title="Regenerate"
                     >
                       <RotateCcw size={12} />
                     </button>
                   )}
                 </>
             )}
             {onDeleteMessage && (
               <button
                 onClick={() => onDeleteMessage(message.id)}
                 className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#f07a76] transition-all"
                 title="Delete Message"
               >
                 <Trash2 size={12} />
               </button>
             )}
          </div>
          
          <div className={`
             relative px-5 py-3.5 text-sm leading-5 rounded-2xl shadow-sm
             ${isUser 
                ? 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white rounded-tr-sm' 
                : 'text-[#1a1a1a] dark:text-white'
             }
             ${noteNumber ? 'border-l-4 border-[#25b5cd]' : ''}
          `}>
            {message.isStreaming && !isUser && (
                 <div className="absolute -left-5 top-4">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                 </div>
             )}
             
            <div 
              className="whitespace-pre-wrap font-normal message-content" 
              data-highlightable="true"
              onContextMenu={(e) => {
                e.preventDefault();
                const menuItems = createMessageContextMenu(e.currentTarget, message.content);
                contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'message-context-menu');
              }}
            >
              {isUser ? (
                  <div>{message.content}</div>
              ) : (
                  <>
                    {message.thinking && (
                      <details className="mb-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                        <summary className="cursor-pointer text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={12} />
                          Thinking Process
                        </summary>
                        <div className="mt-2 text-sm text-purple-900 dark:text-purple-200 whitespace-pre-wrap">
                          {message.thinking}
                        </div>
                      </details>
                    )}
                    <CitationRenderer 
                        text={message.content} 
                        files={files} 
                        onViewDocument={onViewDocument}
                    />
                  </>
              )}
            </div>
          </div>
          
          {/* Message Footer - Clean and Readable */}
          {!isUser && (
            <div className="mt-3 px-1 space-y-2">
              {/* Sources Row */}
              {(files.filter(f => message.content.includes(f.name)).length > 0 || sources.filter(s => s.status === 'fetched').length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {files.filter(f => message.content.includes(f.name)).map(file => (
                    <span key={file.id} className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded text-xs text-[#1a1a1a] dark:text-white">
                      <FileText size={12} className="text-[#a0a0a0]" />
                      {file.name}
                    </span>
                  ))}
                  {sources.filter(s => s.status === 'fetched').map(source => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded text-xs text-[#1a1a1a] dark:text-white hover:bg-[rgba(68,133,209,0.1)]"
                    >
                      <ExternalLink size={12} className="text-[#a0a0a0]" />
                      {source.title || source.url}
                    </a>
                  ))}
                </div>
              )}
              
              {/* Bottom Row - Stats and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#666666] dark:text-[#a0a0a0]">
                  {/* Token Usage */}
                  {message.usage && (
                    <span>{message.usage.inputTokens.toLocaleString()} → {message.usage.outputTokens.toLocaleString()} tokens</span>
                  )}
                  
                  {/* Alternative Outputs */}
                  {alternativeOutputs.length > 1 && onSwitchOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSwitchOutput(message.id, currentOutputIndex - 1)}
                        disabled={currentOutputIndex === 0}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span>{currentOutputIndex + 1} of {alternativeOutputs.length}</span>
                      <button
                        onClick={() => onSwitchOutput(message.id, currentOutputIndex + 1)}
                        disabled={currentOutputIndex === alternativeOutputs.length - 1}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  
                  {/* Note Status */}
                  {noteNumber && (
                    <span className="text-[#25b5cd] dark:text-[#5bd8bb] font-medium">Note #{noteNumber}</span>
                  )}
                </div>
                
                {/* Save Button */}
                {!message.isStreaming && onSaveNote && (
                  <button
                    onClick={() => {
                      if (noteNumber && onUnsaveNote) {
                        onUnsaveNote(message.id);
                      } else {
                        onSaveNote(message.content, message.modelId);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] hover:text-[#25b5cd] hover:bg-[rgba(37,181,205,0.1)] rounded transition-colors"
                  >
                    <BookmarkPlus size={14} />
                    <span>{noteNumber ? "Unsave" : "Save"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
