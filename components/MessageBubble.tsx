import React, { useState, useRef, useEffect } from 'react';
import { Message, ProcessedFile } from '../types';
import { Sparkles, User, Volume2, Loader2, StopCircle } from 'lucide-react';
import CitationRenderer from './CitationRenderer';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';
import { contextMenuManager, createMessageContextMenu } from '../utils/uiHelpers';

interface MessageBubbleProps {
  message: Message;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, files, onViewDocument }) => {
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
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 group`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border ${
          isUser ? 'bg-white dark:bg-[#2a2a2a] border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[#666666] dark:text-[#a0a0a0]' : 'bg-gradient-to-br from-[#4485d1] to-[#4485d1] border-transparent text-white'
        }`}>
          {isUser ? <User size={14} /> : <Sparkles size={14} fill="currentColor" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
             <span className="text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-widest">
                 {isUser ? 'You' : (message.modelId || 'AI')}
             </span>
             {!isUser && !message.isStreaming && (
                 <button 
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                    title="Read Aloud"
                 >
                    {isLoadingAudio ? <Loader2 size={12} className="animate-spin" /> : (isPlaying ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                 </button>
             )}
          </div>
          
          <div className={`
             relative px-5 py-3.5 text-sm leading-7 rounded-2xl shadow-sm
             ${isUser 
                ? 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white rounded-tr-sm' 
                : 'text-[#1a1a1a] dark:text-white'
             }
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
          
          {/* Token Usage Stats */}
          {!isUser && message.usage && (
            <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] mt-1.5 px-1 flex gap-3">
              <span>In: {message.usage.inputTokens.toLocaleString()} tokens</span>
              <span>Out: {message.usage.outputTokens.toLocaleString()} tokens</span>
              <span className="font-semibold">Total: {message.usage.totalTokens.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
