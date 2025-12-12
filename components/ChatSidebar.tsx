import React from 'react';
import { Chat } from '../types/chat';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat
}) => {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
              activeChat?.id === chat.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <MessageSquare size={16} className="flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;