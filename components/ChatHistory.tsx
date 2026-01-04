import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { ChatMetadata } from '../services/chatRegistry';
import { MODEL_REGISTRY } from '../services/modelRegistry';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';

interface ChatHistoryProps {
  chats: ChatMetadata[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

// Utility for date formatting
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

// Memoized Chat Item Component
const ChatListItem = memo(({
  chat,
  isActive,
  isDeleteConfirming,
  modelName,
  onSelect,
  onDeleteClick
}: {
  chat: ChatMetadata;
  isActive: boolean;
  isDeleteConfirming: boolean;
  modelName: string;
  onSelect: (id: string) => void;
  onDeleteClick: (id: string, e: React.MouseEvent) => void;
}) => {
  return (
    <div
      onClick={() => onSelect(chat.id)}
      className={`
        group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer h-[55px]
        ${isActive 
          ? 'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]' 
          : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.03)]'}
      `}
      role="button"
      aria-selected={isActive}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate mb-0.5">
          {chat.name}
        </h3>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] truncate">
            {modelName}
          </span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] flex-shrink-0">•</span>
          <span className="text-[12px] text-[#666666] dark:text-[#a0a0a0] flex-shrink-0">
            {formatDate(chat.updatedAt)}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => onDeleteClick(chat.id, e)}
        className={`
          opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all flex-shrink-0
          ${isDeleteConfirming 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-100' 
            : 'text-[#a0a0a0] hover:text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-900/20'}
        `}
        title={isDeleteConfirming ? 'Click again to confirm' : 'Delete chat'}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
});

ChatListItem.displayName = 'ChatListItem';

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [chatViewTab, setChatViewTab] = useState<'files' | 'links'>('files');

  // Auto-clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  // Memoize model name lookup map to avoid O(n) find in render loop
  const modelNameMap = useMemo(() => {
    const map = new Map<string, string>();
    MODEL_REGISTRY.forEach(m => map.set(m.id, m.name));
    return map;
  }, []);

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    return chats
      .filter(chat => {
        if (chatViewTab === 'files') {
          return !chat.sourceType || chat.sourceType === 'files';
        } else {
          return chat.sourceType === 'links';
        }
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [chats, chatViewTab]);

  const handleDeleteClick = useCallback((chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === chatId) {
      onDeleteChat(chatId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(chatId);
    }
  }, [deleteConfirm, onDeleteChat]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium text-[#666666] dark:text-[#a0a0a0]">
            {chats.length} chats
          </span>
          <button
            onClick={onCreateChat}
            className="p-1.5 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex gap-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded p-0.5">
          <button
            onClick={() => setChatViewTab('files')}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${chatViewTab === 'files' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
          >
            Files
          </button>
          <button
            onClick={() => setChatViewTab('links')}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${chatViewTab === 'links' ? 'bg-white dark:bg-[#1a1a1a] text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
          >
            Links
          </button>
        </div>
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
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                isDeleteConfirming={deleteConfirm === chat.id}
                modelName={modelNameMap.get(chat.modelId) || chat.modelId}
                onSelect={onSelectChat}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
