import React, { useState } from 'react';
import { X, BookMarked, Trash2, Star, Search, Tag, Download, Copy, Edit2, Check, ExternalLink } from 'lucide-react';
import { Note } from '../types';
import CitationRenderer from './CitationRenderer';
import { ProcessedFile } from '../types';

interface NotebookProps {
  notes: Note[];
  onClose: () => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onNavigateToMessage?: (chatId: string, messageId: string) => void;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
}

const Notebook: React.FC<NotebookProps> = ({ notes, onClose, onDeleteNote, onUpdateNote, onNavigateToMessage, files, onViewDocument }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const categories = ['all', ...Array.from(new Set(notes.map(n => n.category).filter(Boolean)))];
  
  const filteredNotes = notes
    .filter(n => filterCategory === 'all' || n.category === filterCategory)
    .filter(n => 
      searchQuery === '' || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.timestamp - a.timestamp;
    });

  const exportNotes = () => {
    const text = filteredNotes.map(n => 
      `# ${n.title || 'Untitled'} (${new Date(n.timestamp).toLocaleString()})\n${n.category ? `Category: ${n.category}\n` : ''}${n.tags?.length ? `Tags: ${n.tags.join(', ')}\n` : ''}\n${n.content}\n\n---\n\n`
    ).join('');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyNote = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <BookMarked size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">My Notebook</h2>
            <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">({filteredNotes.length} notes)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportNotes} className="p-2 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Export as Markdown">
              <Download size={16} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg">
              <X size={20} className="text-[#666666] dark:text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] dark:text-[#a0a0a0]" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg text-sm text-[#1a1a1a] dark:text-white border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <BookMarked size={48} className="text-[#666666] dark:text-[#a0a0a0] mb-4 opacity-50" />
              <p className="text-[#666666] dark:text-[#a0a0a0] text-lg">No notes found</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-xl p-4 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {editingId === note.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] rounded text-sm border border-blue-500"
                          placeholder="Add title..."
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onUpdateNote(note.id, { title: editTitle });
                            setEditingId(null);
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {note.title && <h3 className="font-semibold text-[#1a1a1a] dark:text-white">{note.title}</h3>}
                        <button
                          onClick={() => {
                            setEditingId(note.id);
                            setEditTitle(note.title || '');
                          }}
                          className="p-1 text-[#666666] dark:text-[#a0a0a0] hover:text-blue-600 opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-widest">
                        {note.modelId || 'AI'}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-mono font-semibold">
                        Note #{note.noteNumber}
                      </span>
                      <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">
                        {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString()}
                      </span>
                      {note.category && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                          {note.category}
                        </span>
                      )}
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {note.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center gap-1">
                            <Tag size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {note.chatId && note.messageId && onNavigateToMessage && (
                      <button
                        onClick={() => {
                          onNavigateToMessage(note.chatId!, note.messageId!);
                          onClose();
                        }}
                        className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-600 transition-colors"
                        title="Go to conversation"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onUpdateNote(note.id, { isFavorite: !note.isFavorite })}
                      className={`p-1.5 rounded transition-colors ${
                        note.isFavorite
                          ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                          : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'
                      }`}
                      title="Favorite"
                    >
                      <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => copyNote(note.content)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 transition-colors"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-[#1a1a1a] dark:text-white mt-3">
                  <CitationRenderer text={note.content} files={files} onViewDocument={onViewDocument} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notebook;
