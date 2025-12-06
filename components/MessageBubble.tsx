import React from 'react';
import { Message } from '../types';
import { Bot, User, Cpu } from 'lucide-react';
import CitationRenderer from './CitationRenderer';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col p-4 rounded-2xl shadow-sm border ${
          isUser 
            ? 'bg-white border-indigo-100 text-gray-800 rounded-tr-none' 
            : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
        }`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                 {isUser ? 'You' : 'ConstructLM'}
             </span>
             {message.isStreaming && !isUser && (
                 <Cpu size={12} className="text-emerald-500 animate-pulse" />
             )}
          </div>
          
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {isUser ? (
                <div>{message.content}</div>
            ) : (
                <CitationRenderer text={message.content} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;