import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { ChatMetadata } from '../services/chatRegistry';
import { MODEL_REGISTRY } from '../services/modelRegistry';
import { MessageCircle, Plus, Trash2, Download } from 'lucide-react';

interface ChatHistoryProps {
  chats: ChatMetadata[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onExportChat: (chatId: string) => void;
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
  onDeleteClick,
  onExportClick
}: {
  chat: ChatMetadata;
  isActive: boolean;
  isDeleteConfirming: boolean;
  modelName: string;
  onSelect: (id: string) => void;
  onDeleteClick: (id: string, e: React.MouseEvent) => void;
  onExportClick: (id: string, e: React.MouseEvent) => void;
}) => {
  return (
    <div
      onClick={() => onSelect(chat.id)}
      className={`
        group relative flex items-start gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer min-h-[50px]
        ${isActive 
          ? 'bg-[#4485d1] shadow-sm' 
          : 'bg-[#181819] hover:bg-[#2a2a2a]'}
      `}
      role="button"
      aria-selected={isActive}
    >
      {/* Content Area - Full width without icon */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`
            text-sm font-semibold leading-tight
            ${isActive 
              ? 'text-white' 
              : 'text-white'}
          `}>
            {chat.name}
          </h3>
          
          {/* Timestamp - now white for better visibility */}
          <span className={`
            text-[10px] flex-shrink-0 font-medium leading-tight
            ${isActive 
              ? 'text-white opacity-90' 
              : 'text-white opacity-70'}
          `}>
            {formatDate(chat.updatedAt)}
          </span>
        </div>
        
        {/* Model info and action buttons */}
        <div className="flex items-center justify-between">
          <span className={`
            text-[11px] truncate font-medium
            ${isActive 
              ? 'text-white opacity-80' 
              : 'text-[#a0a0a0]'}
          `}>
            {modelName}
          </span>
          
          {/* Action Buttons - always visible icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => onExportClick(chat.id, e)}
              className={`
                p-1 rounded transition-all flex-shrink-0
                ${isActive 
                  ? 'text-white hover:bg-[rgba(255,255,255,0.2)]' 
                  : 'text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)]'}
              `}
              title="Export chat as markdown"
            >
              <Download size={14} />
            </button>

            <button
              onClick={(e) => onDeleteClick(chat.id, e)}
              className={`
                p-1 rounded transition-all flex-shrink-0
                ${isDeleteConfirming 
                  ? 'bg-red-500 text-white scale-105' 
                  : isActive
                    ? 'text-white hover:bg-red-500 hover:text-white'
                    : 'text-[#a0a0a0] hover:text-red-500 hover:bg-red-900/20'}
              `}
              title={isDeleteConfirming ? 'Click again to confirm' : 'Delete chat'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatListItem.displayName = 'ChatListItem';

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onExportChat
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

  const handleExportClick = useCallback((chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onExportChat(chatId);
  }, [onExportChat]);

  return (
    <div className="flex flex-col h-full bg-[#181819]">
      {/* Header Section */}
      <div className="px-4 py-4 flex-shrink-0 bg-[#181819] border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[rgba(68,133,209,0.15)] flex items-center justify-center">
              <MessageCircle size={16} className="text-[#4485d1]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Chats</span>
              <span className="text-[11px] text-[#a0a0a0] ml-2">
                {chats.length} conversations
              </span>
            </div>
          </div>
          <button
            onClick={onCreateChat}
            className="p-2 text-[#4485d1] hover:bg-[rgba(68,133,209,0.15)] rounded-lg transition-all shadow-sm border border-[rgba(68,133,209,0.3)]"
            title="New Chat"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* Tab Selector */}
        <div className="flex gap-1 bg-[#181819] rounded-lg p-1">
          <button
            onClick={() => setChatViewTab('files')}
            className={`
              flex-1 px-3 py-2 rounded-md text-[11px] font-semibold uppercase transition-all
              ${chatViewTab === 'files' 
                ? 'bg-[#181819] text-[#4485d1] shadow-sm border border-[rgba(68,133,209,0.2)]' 
                : 'text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(255,255,255,0.05)]'}
            `}
          >
            Files ({chats.filter(c => !c.sourceType || c.sourceType === 'files').length})
          </button>
          <button
            onClick={() => setChatViewTab('links')}
            className={`
              flex-1 px-3 py-2 rounded-md text-[11px] font-semibold uppercase transition-all
              ${chatViewTab === 'links' 
                ? 'bg-[#181819] text-[#4485d1] shadow-sm border border-[rgba(68,133,209,0.2)]' 
                : 'text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(255,255,255,0.05)]'}
            `}
          >
            Links ({chats.filter(c => c.sourceType === 'links').length})
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {chats.length === 0 ? (
          <div className="text-center mt-16 px-6">
            <div className="w-20 h-20 bg-[rgba(68,133,209,0.12)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-[#4485d1]" />
            </div>
            <p className="text-base font-semibold text-white mb-2">No conversations yet</p>
            <p className="text-sm text-[#a0a0a0] leading-relaxed max-w-xs mx-auto">
              Start a new chat to begin your conversation with AI
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
                onExportClick={handleExportClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
