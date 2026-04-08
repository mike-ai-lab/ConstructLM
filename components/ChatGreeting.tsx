import React from 'react';
import { InteractiveBlob } from './InteractiveBlob';

interface ChatGreetingProps {
  content: string;
  isExiting?: boolean;
}

const ChatGreeting: React.FC<ChatGreetingProps> = ({ content, isExiting = false }) => {
  return (
    <div 
      className={`flex items-center justify-center px-4 py-2 transition-all duration-700 ease-in-out ${
        isExiting ? '-translate-x-full opacity-0 blur-sm' : 'translate-x-0 opacity-100'
      }`}
    >
      <div className="max-w-2xl w-full text-center space-y-3">
        {/* Blob Avatar with optimized glow */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Reduced blur and scale for less space usage */}
            <div className="absolute inset-0 bg-blue-500/50 blur-[50px] rounded-full scale-[1.5]"></div>
            <div className="relative">
              <InteractiveBlob size={70} color="#4485d1" />
            </div>
          </div>
        </div>

        {/* Greeting Text - Reduced spacing */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ConstructLM
          </h1>
          
          <div className="text-gray-700 dark:text-gray-300 text-base leading-relaxed max-w-xl mx-auto">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatGreeting;
