// Notebook.tsx
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, BookMarked, Trash2, Star, Search, Tag, Download, Copy, Edit2, Check, ExternalLink, FileText, Grid, List, CheckSquare, Square, Save, ArrowUpDown, Folder, ChevronRight, Maximize2, Minimize2, Bold, Italic, Type, Menu } from 'lucide-react';
import { Note } from '../types';
import CitationRenderer from './CitationRenderer';
import { ProcessedFile } from '../types';

interface NotebookProps {
  notes: Note[];
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onNavigateToMessage?: (chatId: string, messageId: string) => void;
  files: ProcessedFile[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  chats?: any[];
  onRenderControls?: (controls: React.ReactNode) => void;
  onImportNotes?: (notes: Note[]) => void;
}

const Notebook: React.FC<NotebookProps> = ({ notes, onDeleteNote, onUpdateNote, onNavigateToMessage, files, onViewDocument, chats = [], onRenderControls, onImportNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'details'>('grid');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'modified' | 'model'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = b.timestamp - a.timestamp;
      } else if (sortBy === 'modified') {
        comparison = (b.lastModified || b.timestamp) - (a.lastModified || a.timestamp);
      } else if (sortBy === 'model') {
        comparison = (a.modelId || '').localeCompare(b.modelId || '');
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
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

  const exportSingleNote = (note: Note, format: 'md' | 'txt') => {
    const content = format === 'md'
      ? `# ${note.title || `Note #${note.noteNumber}`}\n\n**Date:** ${new Date(note.timestamp).toLocaleString()}\n**Model:** ${note.modelId || 'AI'}\n${note.category ? `**Category:** ${note.category}\n` : ''}${note.tags?.length ? `**Tags:** ${note.tags.join(', ')}\n` : ''}\n---\n\n${note.content}`
      : `${note.title || `Note #${note.noteNumber}`}\n\nDate: ${new Date(note.timestamp).toLocaleString()}\nModel: ${note.modelId || 'AI'}\n${note.category ? `Category: ${note.category}\n` : ''}${note.tags?.length ? `Tags: ${note.tags.join(', ')}\n` : ''}\n---\n\n${note.content}`;
    
    const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${note.noteNumber}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedNotes = async () => {
    if (selectedNotes.size === 0) return;
    
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    const notesToExport = notes.filter(n => selectedNotes.has(n.id));
    
    notesToExport.forEach(note => {
      const content = `# ${note.title || `Note #${note.noteNumber}`}\n\n**Date:** ${new Date(note.timestamp).toLocaleString()}\n**Model:** ${note.modelId || 'AI'}\n${note.category ? `**Category:** ${note.category}\n` : ''}${note.tags?.length ? `**Tags:** ${note.tags.join(', ')}\n` : ''}\n---\n\n${note.content}`;
      zip.file(`note-${note.noteNumber}.md`, content);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setSelectedNotes(new Set());
  };

  const handleImportNotes = () => {
    if (!onImportNotes) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.json';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      const importedNotes: Note[] = [];
      
      for (const file of files) {
        const content = await file.text();
        const newNote: Note = {
          id: Date.now().toString() + Math.random(),
          noteNumber: notes.length + importedNotes.length + 1,
          content,
          timestamp: Date.now(),
          title: file.name.replace(/\.(md|txt|json)$/, '')
        };
        importedNotes.push(newNote);
      }
      
      if (importedNotes.length > 0) {
        onImportNotes(importedNotes);
      }
    };
    input.click();
  };

  const toggleSelectNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotes(newSelected);
  };

  const selectAll = () => {
    setSelectedNotes(new Set(filteredNotes.map(n => n.id)));
  };

  const deselectAll = () => {
    setSelectedNotes(new Set());
  };

  const copyNote = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const openNote = (note: Note) => {
    setOpenNoteId(note.id);
    setEditContent(note.content);
    setEditTitle(note.title || '');
  };

  const saveNote = () => {
    if (openNoteId) {
      onUpdateNote(openNoteId, { content: editContent, title: editTitle, lastModified: Date.now() });
      setOpenNoteId(null);
    }
  };

  const insertFormat = (startTag: string, endTag: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea || !openNoteId) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editContent;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newContent = `${before}${startTag}${selection}${endTag}${after}`;
    setEditContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  const openedNote = openNoteId ? notes.find(n => n.id === openNoteId) : null;
  const wordCount = editContent.split(/\s+/).filter(w => w.length > 0).length;

  // Render header controls
  React.useEffect(() => {
    if (onRenderControls) {
      const controls = {
        element: (
          <>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#2a2a2a] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 shadow-sm' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 shadow-sm' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'details' ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 shadow-sm' : 'text-[#666666] dark:text-[#a0a0a0]'}`}
              title="Details View"
            >
              <FileText size={16} />
            </button>
          </div>

          {selectedNotes.size > 0 && (
            <>
              <button onClick={exportSelectedNotes} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1 transition-colors" title="Export Selected">
                <Download size={14} />
                Export ({selectedNotes.size})
              </button>
              <button onClick={deselectAll} className="text-sm text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white px-2">Clear</button>
            </>
          )}
          {selectedNotes.size === 0 && (
            <>
              <button onClick={handleImportNotes} className="p-2 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg text-[#666666] dark:text-[#a0a0a0] transition-colors" title="Import Notes">
                <FileText size={18} />
              </button>
              <button onClick={exportNotes} className="p-2 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg text-[#666666] dark:text-[#a0a0a0] transition-colors" title="Export All">
                <Download size={18} />
              </button>
            </>
          )}
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] border-none focus:outline-none cursor-pointer"
          >
            <option value="date">Created</option>
            <option value="modified">Modified</option>
            <option value="model">Model</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown size={16} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </button>
          </>
        )
      };
      onRenderControls(controls as any);
    }
  }, [viewMode, selectedNotes.size, sortBy, sortOrder, onRenderControls]);

  if (openedNote) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs px-2 py-1 bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] rounded font-mono font-semibold">
                Note #{openedNote.noteNumber}
              </span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Untitled Note"
                className="flex-1 text-2xl font-bold text-[#1a1a1a] dark:text-white bg-transparent border-none focus:outline-none placeholder-slate-300"
              />
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-[#666666] dark:text-[#a0a0a0] px-3 py-2">
                {wordCount} words
              </span>
              <button onClick={saveNote} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors">
                <Save size={16} />
                Save
              </button>
              <button onClick={() => setOpenNoteId(null)} className="p-2 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors">
                <X size={20} className="text-[#666666] dark:text-[#a0a0a0]" />
              </button>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[#fcfcfc] dark:bg-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <button onClick={() => insertFormat('**', '**')} className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] transition-colors" title="Bold">
                <Bold size={16} />
              </button>
              <button onClick={() => insertFormat('_', '_')} className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] transition-colors" title="Italic">
                <Italic size={16} />
              </button>
              <div className="w-px h-4 bg-[rgba(0,0,0,0.15)] dark:bg-[rgba(255,255,255,0.05)] mx-1"></div>
              <button onClick={() => insertFormat('- ')} className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] transition-colors" title="List">
                <List size={16} />
              </button>
              <button onClick={() => insertFormat('# ')} className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] transition-colors" title="Heading">
                <Type size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 flex items-center gap-4 text-xs text-[#666666] dark:text-[#a0a0a0] font-medium tracking-wide uppercase">
                <span>{new Date(openedNote.timestamp).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: 'numeric' })}</span>
                <span>•</span>
                <span>{openedNote.category || 'Uncategorized'}</span>
              </div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[400px] bg-transparent text-[#1a1a1a] dark:text-white resize-none focus:outline-none text-lg leading-relaxed font-serif"
                placeholder="Start typing your story..."
                spellCheck="false"
              />
            </div>
          </div>

          <div className="p-4 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-xs text-[#666666] dark:text-[#a0a0a0] flex items-center justify-between">
            <span>{openedNote.modelId || 'AI'} • {new Date(openedNote.timestamp).toLocaleDateString()}</span>
            {openedNote.lastModified && (
              <span>Last modified: {new Date(openedNote.lastModified).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="flex h-full w-full relative box-border bg-white dark:bg-[#1a1a1a]">
      {/* Sidebar */}
      <div className="flex flex-col h-full w-80 flex-shrink-0">
        {/* Tab Navigation */}
        <div className="h-[65px] flex-shrink-0 flex bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex-1 h-full px-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 text-[#333333] dark:text-[#cccccc] border-b-2 border-[#4485d1]">
            <BookMarked size={14} className="flex-shrink-0" />
            <span className="truncate">Notes</span>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ height: 'calc(100% - 65px)' }} className="flex flex-col min-h-0 box-border bg-white dark:bg-[#1a1a1a] border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-col min-h-0 w-full relative box-border">
            {/* Toolbar */}
            <div className="px-4 py-2 flex-shrink-0 bg-transparent">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterCategory === cat 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                        : 'bg-slate-50 dark:bg-[#2a2a2a] text-slate-500 dark:text-[#a0a0a0] border border-slate-200 dark:border-[rgba(255,255,255,0.05)] hover:bg-slate-100 dark:hover:bg-[#222222]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] dark:text-[#a0a0a0]" size={16} />
                <input 
                  type="text" 
                  placeholder="Search notes..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#2a2a2a] border border-slate-200 dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-400 dark:focus:border-blue-600 transition-all placeholder-slate-400 dark:placeholder-[#666666]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-2 py-2">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-[#666666] dark:text-[#a0a0a0] text-sm">
                  <Folder size={32} className="mb-2 opacity-50" />
                  <span>No notes in {filterCategory}</span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredNotes.map(note => (
                    <div 
                      key={note.id}
                      onClick={() => openNote(note)}
                      className={`group relative p-3 rounded-md cursor-pointer transition-all ${
                        openNoteId === note.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20' 
                          : 'hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a]'
                      }`}
                    >
                      <div className="mb-1 pr-6">
                        <h3 className={`font-semibold text-sm truncate ${openNoteId === note.id ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-white'}`}>
                          {note.title || 'Untitled Note'}
                        </h3>
                      </div>
                      <p className="text-xs text-[#666666] dark:text-[#a0a0a0] line-clamp-2 font-medium leading-relaxed">
                        {note.content || 'No content yet...'}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium bg-slate-100 dark:bg-[#222222] px-2 py-0.5 rounded-full">
                          {note.category || 'Uncategorized'}
                        </span>
                        <span className="text-[10px] text-[#666666] dark:text-[#a0a0a0]">
                          {new Date(note.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                        className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#1a1a1a] relative min-w-0">
          <div className="p-6">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 bg-white dark:bg-[#2a2a2a] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
                  <BookMarked size={40} className="text-blue-200 dark:text-blue-800" />
                </div>
                <p className="text-xl font-medium text-slate-500 dark:text-[#a0a0a0]">Notebook</p>
                <p className="text-sm mt-2 text-[#666666] dark:text-[#a0a0a0]">Select a note from the sidebar to begin.</p>
              </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md rounded-lg p-3 border-2 transition-all hover:shadow-lg ${
                    selectedNotes.has(note.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={(e) => toggleSelectNote(note.id, e)}>
                      {selectedNotes.has(note.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-[#666666] dark:text-[#a0a0a0]" />}
                      <span className="text-xs px-1.5 py-0.5 bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] rounded font-mono font-semibold">
                        #{note.noteNumber}
                      </span>
                    </div>
                    {note.isFavorite && <Star size={12} fill="currentColor" className="text-[#25b5cd]" />}
                  </div>
                  <div onClick={() => openNote(note)} className="cursor-pointer">
                    {note.title && <h3 className="font-semibold text-sm text-[#1a1a1a] dark:text-white mb-1 line-clamp-2">{note.title}</h3>}
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] line-clamp-3 mb-2">{note.content.substring(0, 100)}...</p>
                    <div className="flex flex-col gap-0.5 text-xs text-[#666666] dark:text-[#a0a0a0]">
                      <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                      {note.lastModified && (
                        <span className="text-[10px]">Modified: {new Date(note.lastModified).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                </div>
            ) : viewMode === 'details' ? (
                <div className="space-y-2">
              <div className="grid grid-cols-6 gap-3 px-3 py-2 text-xs font-semibold text-[#666666] dark:text-[#a0a0a0] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
                <div>ID</div>
                <div className="col-span-2">Title</div>
                <div>Chat</div>
                <div>Model</div>
                <div className="text-right">Last Modified</div>
              </div>
              {filteredNotes.map((note) => {
                const chat = chats.find(c => c.id === note.chatId);
                return (
                  <div
                    key={note.id}
                    onClick={() => openNote(note)}
                    className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg p-3 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 transition-colors cursor-pointer grid grid-cols-6 gap-3 items-center text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => { e.stopPropagation(); toggleSelectNote(note.id, e); }} className="cursor-pointer">
                        {selectedNotes.has(note.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-[#666666] dark:text-[#a0a0a0]" />}
                      </div>
                      <span className="px-1.5 py-0.5 bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] rounded font-mono font-semibold">
                        #{note.noteNumber}
                      </span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className="font-medium text-[#1a1a1a] dark:text-white">{note.title || 'Untitled'}</span>
                    </div>
                    <div className="text-[#666666] dark:text-[#a0a0a0] truncate">
                      {chat ? chat.name : 'Unknown'}
                    </div>
                    <div className="text-[#666666] dark:text-[#a0a0a0]">
                      {note.modelId || 'AI'}
                    </div>
                    <div className="text-[#666666] dark:text-[#a0a0a0] text-right">
                      {note.lastModified ? new Date(note.lastModified).toLocaleDateString() : new Date(note.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
                </div>
            ) : (
                <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div key={note.id} className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-xl p-4 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 cursor-pointer" onClick={() => openNote(note)}>
                      {editingId === note.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white dark:bg-[#1a1a1a] rounded text-sm border border-blue-500"
                            placeholder="Add title..."
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
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
                            onClick={(e) => {
                              e.stopPropagation();
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
                        <span className="text-xs px-2 py-0.5 bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] rounded-full font-mono font-semibold">
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
                          }}
                          className="p-1.5 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded text-[#1a1a1a] dark:text-white transition-colors"
                          title="Go to conversation"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onUpdateNote(note.id, { isFavorite: !note.isFavorite })}
                        className={`p-1.5 rounded transition-colors ${
                          note.isFavorite
                            ? 'text-[#25b5cd] hover:bg-[#25b5cd]/10 dark:hover:bg-[#25b5cd]/5'
                            : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'
                        }`}
                        title="Favorite"
                      >
                        <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => copyNote(note.content)}
                        className="p-1.5 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded text-[#1a1a1a] dark:text-white transition-colors"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                      <div className="relative group/export">
                        <button className="p-1.5 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded text-[#1a1a1a] dark:text-white transition-colors" title="Export">
                          <FileText size={14} />
                        </button>
                        <div className="hidden group-hover/export:flex absolute right-0 top-full mt-1 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex-col overflow-hidden z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); exportSingleNote(note, 'md'); }}
                            className="px-3 py-1.5 text-xs hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-left whitespace-nowrap"
                          >
                            Export as Markdown
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); exportSingleNote(note, 'txt'); }}
                            className="px-3 py-1.5 text-xs hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] text-left whitespace-nowrap"
                          >
                            Export as Text
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded text-[#1a1a1a] dark:text-white transition-colors"
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
              ))}
                </div>
            )}
          </div>
      </main>
    </div>
  );
};

export default Notebook;
