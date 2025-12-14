import React, { useState, useRef } from 'react';
import { Message, ProcessedFile } from '../types';
import { Sparkles, User, Volume2, Loader2, StopCircle } from 'lucide-react';
import CitationRenderer from './CitationRenderer';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';

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
          isUser ? 'bg-white border-gray-100 text-gray-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600 border-transparent text-white'
        }`}>
          {isUser ? <User size={14} /> : <Sparkles size={14} fill="currentColor" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-1">
             <span className="text-[10px] font-bold text-black uppercase tracking-widest">
                 {isUser ? 'You' : (message.modelId || 'AI')}
             </span>
             {!isUser && !message.isStreaming && (
                 <button 
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                    title="Read Aloud"
                 >
                    {isLoadingAudio ? <Loader2 size={12} className="animate-spin" /> : (isPlaying ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                 </button>
             )}
          </div>
          
          <div className={`
             relative px-5 py-3.5 text-sm leading-7 rounded-2xl shadow-sm
             ${isUser 
                ? 'bg-[#f1f5f9] text-black rounded-tr-sm' 
                : 'bg-white border border-gray-100 text-black rounded-tl-sm'
             }
          `}>
            {message.isStreaming && !isUser && (
                 <div className="absolute -left-5 top-4">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                 </div>
             )}
             
            <div className="whitespace-pre-wrap font-normal message-content" data-highlightable="true">
              {isUser ? (
                  <div>{message.content}</div>
              ) : (
                  <CitationRenderer 
                      text={message.content} 
                      files={files} 
                      onViewDocument={onViewDocument}
                  />
              )}
            </div>
          </div>
          
          {/* Token Usage Stats */}
          {!isUser && message.usage && (
            <div className="text-[9px] text-gray-500 mt-1.5 px-1 flex gap-3">
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