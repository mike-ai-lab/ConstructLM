import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Message, ProcessedFile, Highlight } from '../types';
import { Sparkles, User, Volume2, Loader2, StopCircle, BookmarkPlus, FileText, ExternalLink, Trash2, RotateCcw, ChevronLeft, ChevronRight, Highlighter, Undo2, Redo2, FileDown } from 'lucide-react';
import CitationRenderer from './CitationRenderer';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';
import { contextMenuManager, createMessageContextMenu } from '../utils/uiHelpers';
import { InteractiveBlob } from './InteractiveBlob';
import { highlightService } from '../services/highlightService';

// --- ROBUST TEXT MAPPING UTILITIES ---

interface TextNodeInfo {
  node: Node;
  start: number;
  end: number;
  length: number;
}

/**
 * Flattens the DOM into a linear list of text nodes with their global offsets.
 * This allows us to treat the complex DOM as a simple string.
 */
const getTextNodes = (root: Node): TextNodeInfo[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes: TextNodeInfo[] = [];
  let offset = 0;
  let node = walker.nextNode();

  while (node) {
    const len = node.textContent?.length || 0;
    // We only care about nodes that actually have text
    if (len > 0) {
      nodes.push({
        node,
        start: offset,
        end: offset + len,
        length: len
      });
    }
    offset += len;
    node = walker.nextNode();
  }
  return nodes;
};

const getGlobalOffset = (root: Node, targetNode: Node, targetOffset: number): number => {
  const nodes = getTextNodes(root);
  
  // If selection is on a text node
  const targetInfo = nodes.find(n => n.node === targetNode);
  if (targetInfo) {
    return targetInfo.start + targetOffset;
  }

  // If selection is on an element node (e.g., selecting a whole heading)
  // Find the closest text node at that position
  if (targetNode.nodeType === Node.ELEMENT_NODE) {
    const element = targetNode as Element;
    // If offset is 0, find first text node in this element
    if (targetOffset === 0) {
      const firstNode = nodes.find(n => element.contains(n.node));
      return firstNode ? firstNode.start : 0;
    }
    // Otherwise, find the text node after the offset-th child
    const childAtOffset = element.childNodes[targetOffset];
    if (childAtOffset) {
      const nodeAfter = nodes.find(n => childAtOffset.contains(n.node) || n.node === childAtOffset);
      return nodeAfter ? nodeAfter.start : nodes[nodes.length - 1]?.end || 0;
    }
  }

  return -1;
};

// --- COMPONENT ---

interface MessageBubbleProps {
  message: Message;
  chatId: string;
  files: ProcessedFile[];
  sources: any[];
  onViewDocument: (fileName: string, page?: number, quote?: string, location?: string) => void;
  onSaveNote?: (content: string, modelId?: string) => void;
  onUnsaveNote?: (messageId: string) => void;
  noteNumber?: number;
  onDeleteMessage?: (messageId: string) => void;
  onRetryMessage?: (messageId: string) => void;
  alternativeOutputs?: string[];
  currentOutputIndex?: number;
  onSwitchOutput?: (messageId: string, index: number) => void;
  onOpenWebViewer?: (url: string) => void;
  onOpenWebViewerNewTab?: (url: string) => void;
  onEnableDrawing?: (x: number, y: number) => void;
  onCreateSummaryDoc?: (content: string, modelId: string) => void;
}

const HIGHLIGHT_COLORS = [
  { id: 'yellow', color: 'rgba(227, 250, 21, 0.4)' },
  { id: 'green', color: 'rgba(16, 185, 129, 0.4)' },
  { id: 'blue', color: 'rgba(59, 130, 246, 0.4)' },
  { id: 'pink', color: 'rgba(236, 72, 153, 0.4)' },
  { id: 'purple', color: 'rgba(139, 92, 246, 0.4)' }
];

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message,
  chatId,
  files, 
  sources, 
  onViewDocument, 
  onSaveNote, 
  onUnsaveNote, 
  noteNumber,
  onDeleteMessage,
  onRetryMessage,
  alternativeOutputs,
  currentOutputIndex,
  onSwitchOutput,
  onOpenWebViewer,
  onOpenWebViewerNewTab,
  onEnableDrawing,
  onCreateSummaryDoc
}) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [noteStyle, setNoteStyle] = useState(localStorage.getItem('noteStyle') || 'highlight');
  
  // Highlight State
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightMode, setHighlightMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<Highlight[]>([]);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const highlightModeRef = useRef(highlightMode);

  useEffect(() => {
    const handleStyleChange = () => setNoteStyle(localStorage.getItem('noteStyle') || 'border');
    window.addEventListener('noteStyleChange', handleStyleChange);
    return () => window.removeEventListener('noteStyleChange', handleStyleChange);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    highlightModeRef.current = highlightMode;
  }, [highlightMode]);

  // 1. Load Highlights on Mount
  useEffect(() => {
    if (!isUser) {
      const loaded = highlightService.getHighlightsByMessage(chatId, message.id);
      setHighlights(loaded);
    }
  }, [chatId, message.id, isUser]);

  const paintHighlights = useCallback(() => {
    if (!contentRef.current || isUser) return;
    const root = contentRef.current;

    const existing = root.querySelectorAll('.msg-highlight');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });
    root.normalize();

    if (highlights.length === 0) return;

    const sortedHighlights = [...highlights].sort((a, b) => b.startOffset - a.startOffset);

    sortedHighlights.forEach(h => {
      const textNodes = getTextNodes(root);
      const involvedNodes = textNodes.filter(n => 
        n.end > h.startOffset && n.start < h.endOffset
      );

      involvedNodes.forEach(nodeInfo => {
        try {
          const relativeStart = Math.max(0, h.startOffset - nodeInfo.start);
          const relativeEnd = Math.min(nodeInfo.length, h.endOffset - nodeInfo.start);
          const currentLength = nodeInfo.node.textContent?.length || 0;
          
          if (relativeStart >= currentLength || relativeEnd > currentLength || relativeStart >= relativeEnd) {
            return;
          }

          const range = document.createRange();
          range.setStart(nodeInfo.node, relativeStart);
          range.setEnd(nodeInfo.node, relativeEnd);

          const span = document.createElement('span');
          span.className = 'msg-highlight';
          span.style.backgroundColor = h.color;
          span.style.borderRadius = '2px';
          span.style.padding = '2px 0';
          span.dataset.highlightId = h.id;
          
          span.onclick = (e) => {
            if (highlightModeRef.current) {
              e.stopPropagation();
              handleRemoveHighlight(h.id);
            }
          };

          range.surroundContents(span);
        } catch (e) {
          console.warn("Skipped node segment:", e);
        }
      });
    });
  }, [highlights, isUser]);

  // 3. Trigger Painting
  // We use useLayoutEffect to paint *immediately* after React renders, preventing flash of unhighlighted text
  useLayoutEffect(() => {
    paintHighlights();

    // Observe changes (e.g., if CitationRenderer loads data asynchronously)
    if (contentRef.current && !observerRef.current) {
      observerRef.current = new MutationObserver(() => {
        paintHighlights();
      });
      observerRef.current.observe(contentRef.current, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = null;
    };
  }, [paintHighlights, message.content, highlightMode]);

  // 4. Handle Selection Creation
  const handleTextSelection = () => {
    if (isUser || !highlightMode || !contentRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text.trim()) return;

    const startOffset = getGlobalOffset(contentRef.current, range.startContainer, range.startOffset);
    const endOffset = getGlobalOffset(contentRef.current, range.endContainer, range.endOffset);

    if (startOffset === -1 || endOffset === -1) {
        console.warn("Could not calculate global offset");
        return;
    }

    const finalStart = Math.min(startOffset, endOffset);
    const finalEnd = Math.max(startOffset, endOffset);

    const fullText = contentRef.current.textContent || "";
    const prefix = fullText.substring(Math.max(0, finalStart - 30), finalStart);
    const suffix = fullText.substring(finalEnd, Math.min(fullText.length, finalEnd + 30));

    applyHighlight(text, finalStart, finalEnd, prefix, suffix);
    selection.removeAllRanges();
  };

  const applyHighlight = (text: string, start: number, end: number, prefix: string, suffix: string) => {
    const highlightId = `${Date.now()}_${Math.random()}`;
    const highlight: Highlight = {
      id: highlightId,
      messageId: message.id,
      chatId,
      text: text,
      startOffset: start,
      endOffset: end,
      color: selectedColor.color,
      timestamp: Date.now(),
      textBefore: prefix,
      textAfter: suffix
    };
    
    highlightService.saveHighlight(highlight);
    setHighlights(prev => [...prev, highlight]);
    setUndoStack(prev => [...prev, highlightId]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastId = undoStack[undoStack.length - 1];
    const highlight = highlights.find(h => h.id === lastId);
    if (highlight) {
      highlightService.deleteHighlight(lastId);
      setHighlights(prev => prev.filter(h => h.id !== lastId));
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, highlight]);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const highlight = redoStack[redoStack.length - 1];
    highlightService.saveHighlight(highlight);
    setHighlights(prev => [...prev, highlight]);
    setUndoStack(prev => [...prev, highlight.id]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const handleRemoveHighlight = (id: string) => {
    highlightService.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const handleClearAllHighlights = () => {
    highlights.forEach(h => highlightService.deleteHighlight(h.id));
    setHighlights([]);
    setUndoStack([]);
    setRedoStack([]);
  };

  const enableHighlightMode = (x: number, y: number) => {
    setHighlightMode(true);
    setToolbarPosition({ x, y });
  };

  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    setIsDraggingToolbar(true);
    setDragOffset({ x: e.clientX - toolbarPosition.x, y: e.clientY - toolbarPosition.y });
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDraggingToolbar) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setToolbarPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    
    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingToolbar, dragOffset]);

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
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`} data-message-id={message.id}>
      {/* Floating Highlight Toolbar */}
      {highlightMode && !isUser && (
        <div 
          className="fixed z-50 backdrop-blur-md bg-white/70 dark:bg-[#2a2a2a]/70 border border-[#4485d1]/30 rounded-full shadow-lg px-2 py-1.5 flex items-center gap-1.5 cursor-move select-none"
          style={{ left: `${toolbarPosition.x}px`, top: `${toolbarPosition.y}px`, userSelect: 'none' }}
          onMouseDown={handleToolbarMouseDown}
        >
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c)}
              className={`w-5 h-5 rounded-full border transition-all ${
                selectedColor.id === c.id ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1 hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50 rounded disabled:opacity-30"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1 hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50 rounded disabled:opacity-30"
          >
            <Redo2 size={14} />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={() => setHighlightMode(false)}
            className="p-1 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded text-green-600"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
          <button
            onClick={handleClearAllHighlights}
            className="p-1 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 group`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${
          isUser ? 'w-8 h-8' : 'w-10 h-10'
        } rounded-full flex items-center justify-center shadow-sm border ${
          isUser ? 'bg-white dark:bg-[#2a2a2a] border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[#666666] dark:text-[#a0a0a0]' : 'border-transparent overflow-hidden'
        }`}>
          {isUser ? (
            <User size={14} />
          ) : (
            <InteractiveBlob size={40} color="#4485d1" />
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
             <span className="text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-widest">
                 {isUser ? 'You' : (message.modelId || 'AI')}
             </span>
             <span className="text-[10px] text-[#999999] dark:text-[#666666]">
               {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
             </span>
             {noteNumber && (
               <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] font-semibold">
                 Note #{noteNumber}
               </span>
             )}
             {!isUser && !message.isStreaming && (
                 <>
                   <button 
                     onClick={handlePlayAudio}
                     disabled={isLoadingAudio}
                     className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                     title="Read Aloud"
                   >
                     {isLoadingAudio ? <Loader2 size={12} className="animate-spin" /> : (isPlaying ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                   </button>
                   {onCreateSummaryDoc && (
                     <button
                       onClick={() => onCreateSummaryDoc(message.content, message.modelId || 'gemini-2.0-flash-exp')}
                       className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-green-600 transition-all"
                       title="Create Summary Document"
                     >
                       <FileDown size={12} />
                     </button>
                   )}
                 </>
             )}
             {onDeleteMessage && (
               <button
                 onClick={() => onDeleteMessage(message.id)}
                 className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#f07a76] transition-all"
                 title="Delete Message"
               >
                 <Trash2 size={12} />
               </button>
             )}
          </div>
          
          <div className={`
             relative px-5 py-3.5 text-sm leading-5 rounded-2xl shadow-sm
             ${isUser 
               ? 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white rounded-tr-sm' 
               : 'text-[#1a1a1a] dark:text-white'
             }
             ${noteNumber && noteStyle === 'border' ? 'border-l-4 border-[#25b5cd]' : ''}
             ${noteNumber && noteStyle === 'glow' ? 'shadow-[0_0_20px_rgba(37,181,205,0.4)]' : ''}
             ${noteNumber && noteStyle === 'highlight' ? 'bg-[rgba(37,181,205,0.1)] dark:bg-[rgba(37,181,205,0.15)]' : ''}
          `}>
             {message.isStreaming && !isUser && (
                 <div className="absolute -left-5 top-4">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                 </div>
             )}
             {noteNumber && noteStyle === 'badge' && (
                 <div className="absolute -top-2 -right-2 bg-[#25b5cd] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                     Note #{noteNumber}
                 </div>
             )}
             
            <div 
              ref={contentRef}
              className="whitespace-pre-wrap font-normal message-content" 
              data-highlightable="true"
              onMouseUp={handleTextSelection}
              // suppressHydrationWarning is crucial here because we manually edit the DOM
              suppressHydrationWarning
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isUser) {
                  const baseItems = createMessageContextMenu(e.currentTarget, message.content);
                  const menuItems = [
                    ...baseItems,
                    { label: '—', action: () => {} },
                    { 
                      label: 'Highlight Text', 
                      action: () => enableHighlightMode(e.clientX, e.clientY)
                    },
                    { 
                      label: 'Draw on Screen', 
                      action: () => onEnableDrawing?.(e.clientX, e.clientY)
                    }
                  ];
                  contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'message-context-menu');
                } else {
                  const menuItems = createMessageContextMenu(e.currentTarget, message.content);
                  contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'message-context-menu');
                }
              }}
            >
              {isUser ? (
                  <div>{message.content}</div>
              ) : (
                  <>
                    {message.thinking && (
                      <details className="mb-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                        <summary className="cursor-pointer text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={12} />
                          Thinking Process
                        </summary>
                        <div className="mt-2 text-sm text-purple-900 dark:text-purple-200 whitespace-pre-wrap">
                          {message.thinking}
                        </div>
                      </details>
                    )}
                    <CitationRenderer 
                      text={message.content} 
                      files={files} 
                      onViewDocument={onViewDocument}
                      onOpenWebViewer={onOpenWebViewer}
                      onOpenWebViewerNewTab={onOpenWebViewerNewTab}
                    />
                  </>
              )}
            </div>
          </div>
          
          {/* Message Footer */}
          {!isUser && (
            <div className="mt-3 space-y-2" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
              {/* Sources Row */}
              {(files.filter(f => message.content.includes(f.name)).length > 0 || sources.filter(s => s.status === 'fetched' && s.selected !== false).length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {files.filter(f => message.content.includes(f.name)).map(file => (
                    <span key={file.id} className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded text-xs text-[#1a1a1a] dark:text-white">
                      <FileText size={12} className="text-[#a0a0a0]" />
                      {file.name}
                    </span>
                  ))}
                  {sources.filter(s => s.status === 'fetched' && s.selected !== false).map(source => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded text-xs text-[#1a1a1a] dark:text-white hover:bg-[rgba(68,133,209,0.1)]"
                    >
                      <ExternalLink size={12} className="text-[#a0a0a0]" />
                      {source.title || source.url}
                    </a>
                  ))}
                </div>
              )}
              
              {/* Bottom Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#666666] dark:text-[#a0a0a0]">
                  {/* Token Usage */}
                  {message.usage && (
                    <span>{message.usage.inputTokens.toLocaleString()} → {message.usage.outputTokens.toLocaleString()} tokens</span>
                  )}
                  
                  {/* Alternative Outputs */}
                  {alternativeOutputs && alternativeOutputs.length > 1 && onSwitchOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSwitchOutput(message.id, (currentOutputIndex || 0) - 1)}
                        disabled={(currentOutputIndex || 0) === 0}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous version"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[#666666] dark:text-[#a0a0a0]">{(currentOutputIndex || 0) + 1} of {alternativeOutputs.length}</span>
                      <button
                        onClick={() => onSwitchOutput(message.id, (currentOutputIndex || 0) + 1)}
                        disabled={(currentOutputIndex || 0) === alternativeOutputs.length - 1}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next version"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  
                  {/* Note Status */}
                  {noteNumber && (
                    <span className="text-[#25b5cd] dark:text-[#5bd8bb] font-medium">Note #{noteNumber}</span>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!message.isStreaming && onRetryMessage && (
                    <button
                      onClick={() => onRetryMessage(message.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] rounded transition-colors"
                      title="Regenerate response"
                    >
                      <RotateCcw size={14} />
                      <span>Regenerate</span>
                    </button>
                  )}
                  {!message.isStreaming && onSaveNote && (
                    <button
                      onClick={() => {
                        if (noteNumber && onUnsaveNote) {
                          onUnsaveNote(message.id);
                        } else {
                          onSaveNote(message.content, message.modelId);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] hover:text-[#25b5cd] hover:bg-[rgba(37,181,205,0.1)] rounded transition-colors"
                    >
                      <BookmarkPlus size={14} />
                      <span>{noteNumber ? "Unsave" : "Save"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;