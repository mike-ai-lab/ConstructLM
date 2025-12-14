import React, { useState } from 'react';
import { ChatMetadata } from '../services/chatRegistry';
import { MODEL_REGISTRY } from '../services/modelRegistry';
import { MessageCircle, Plus, Trash2, Calendar, Hash } from 'lucide-react';

interface ChatHistoryProps {
  chats: ChatMetadata[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getModelName = (modelId: string) => {
    const model = MODEL_REGISTRY.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === chatId) {
      onDeleteChat(chatId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(chatId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <>
      <div className="px-5 pt-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Chat History
          </h2>
          <button
            onClick={onCreateChat}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-medium text-gray-400">{chats.length} chats</span>
        </div>
      </div>
      
      <div className="h-px bg-gray-200 mx-5 my-2" />

      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar min-h-0">
        {chats.length === 0 ? (
          <div className="text-center mt-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No chat history</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Create a new chat to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1 pb-8">
            {chats
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`
                    group relative flex flex-col gap-1 p-3 rounded-lg transition-all cursor-pointer
                    ${activeChatId === chat.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {chat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Hash size={10} />
                          {chat.messageCount} messages
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(chat.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {getModelName(chat.modelId)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(chat.id, e)}
                      className={`
                        opacity-0 group-hover:opacity-100 p-1 rounded transition-all
                        ${deleteConfirm === chat.id ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}
                      `}
                      title={deleteConfirm === chat.id ? 'Click again to confirm' : 'Delete chat'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatHistory;