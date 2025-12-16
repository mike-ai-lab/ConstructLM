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
    <div className="flex flex-col h-full">
      <div className="px-4 h-[50px] flex items-center justify-between flex-shrink-0">
        <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">{chats.length} chats</span>
        <button
          onClick={onCreateChat}
          className="p-1.5 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors"
          title="New Chat"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
        {chats.length === 0 ? (
          <div className="text-center mt-12 px-6">
            <div className="w-16 h-16 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={24} className="text-[#a0a0a0]" />
            </div>
            <p className="text-sm font-medium text-[#666666] dark:text-[#a0a0a0]">No chat history</p>
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1 leading-relaxed">
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
                    group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer h-[55px]
                    ${activeChatId === chat.id ? 'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.03)]'}
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate mb-1">
                      {chat.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">
                        {getModelName(chat.modelId)}
                      </span>
                      <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">•</span>
                      <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">
                        {formatDate(chat.updatedAt)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDelete(chat.id, e)}
                    className={`
                      opacity-0 group-hover:opacity-100 p-1 rounded transition-all flex-shrink-0
                      ${deleteConfirm === chat.id ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-[#a0a0a0] hover:text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-900/20'}
                    `}
                    title={deleteConfirm === chat.id ? 'Click again to confirm' : 'Delete chat'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
