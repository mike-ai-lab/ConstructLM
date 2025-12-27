
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Message, ProcessedFile, Highlight } from '../types';
import { Sparkles, User, Volume2, Loader2, StopCircle, BookmarkPlus, FileText, ExternalLink, Trash2, RotateCcw, ChevronLeft, ChevronRight, Highlighter, Undo2, Redo2 } from 'lucide-react';
import CitationRenderer from './CitationRenderer';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';
import { contextMenuManager, createMessageContextMenu } from '../utils/uiHelpers';
import { InteractiveBlob } from './InteractiveBlob';
import { highlightService } from '../services/highlightService';

// --- UTILITY: ROBUST DOM TEXT WALKER ---

/**
 * Helper to check if a node is a visible text node and not part of UI artifacts (like citation badges)
 * Add 'no-highlight' class to any UI elements you want the offset calculator to ignore.
 */
const isValidTextNode = (node: Node): boolean => {
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  // Ignore scripts, styles, and specific UI elements that shouldn't count towards offset
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return false;
  if (parent.closest('.no-highlight')) return false; 
  return true;
};

/**
 * Calculates the global character offset relative to root.
 * Ignores UI artifacts to ensure offsets remain stable even if CitationRenderer adds badges.
 */
const getGlobalOffset = (root: Node, targetNode: Node, targetOffset: number): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => isValidTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  
  let currentOffset = 0;
  let node = walker.nextNode();

  while (node) {
    if (node === targetNode) {
      return currentOffset + targetOffset;
    }
    currentOffset += node.textContent?.length || 0;
    node = walker.nextNode();
  }
  return -1;
};

/**
 * Converts global offsets back to a Range.
 */
const createRangeFromOffsets = (root: Node, start: number, end: number): Range | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => isValidTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });

  let currentOffset = 0;
  let startNode: Node | null = null;
  let startOffsetLocal = 0;
  let endNode: Node | null = null;
  let endOffsetLocal = 0;
  let node = walker.nextNode();

  while (node) {
    const len = node.textContent?.length || 0;
    const nodeEnd = currentOffset + len;

    if (!startNode && start >= currentOffset && start < nodeEnd) {
      startNode = node;
      startOffsetLocal = start - currentOffset;
    }
    
    // Note: end can be equal to nodeEnd (end of selection)
    if (!endNode && end > currentOffset && end <= nodeEnd) {
      endNode = node;
      endOffsetLocal = end - currentOffset;
    }

    if (startNode && endNode) break;

    currentOffset += len;
    node = walker.nextNode();
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffsetLocal);
    range.setEnd(endNode, endOffsetLocal);
    return range;
  }
  return null;
};

/**
 * NEW: Safely highlights a range by wrapping ONLY text nodes.
 * This prevents breaking block structure (h3, ul, p) when selecting across them.
 */
const safeHighlightRange = (range: Range, color: string, id: string) => {
  const root = range.commonAncestorContainer;
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  // Create a TreeWalker to find all text nodes within the range
  const walker = document.createTreeWalker(
    root.nodeType === Node.TEXT_NODE ? root.parentNode! : root, 
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!isValidTextNode(node)) return NodeFilter.FILTER_REJECT;
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const nodesToWrap: { node: Node; start: number; end: number }[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    const nodeStart = currentNode === startContainer ? startOffset : 0;
    const nodeEnd = currentNode === endContainer ? endOffset : (currentNode.textContent?.length || 0);

    // Only wrap if there is actual content selected in this node
    if (nodeEnd > nodeStart) {
      nodesToWrap.push({ node: currentNode, start: nodeStart, end: nodeEnd });
    }
    currentNode = walker.nextNode();
  }

  // Apply wraps in reverse order to avoid messing up offsets of subsequent nodes during DOM manipulation
  nodesToWrap.reverse().forEach(({ node, start, end }) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);

    const span = document.createElement('span');
    span.className = 'msg-highlight';
    span.style.backgroundColor = color;
    span.style.borderRadius = '2px';
    span.style.cursor = 'pointer';
    span.dataset.highlightId = id;
    
    // Since we are wrapping a single text node (or part of it), surroundContents is 100% safe
    try {
      range.surroundContents(span);
    } catch (e) {
      console.warn('Failed to wrap node', e);
    }
  });
};

// --- END UTILITY ---

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
  alternativeOutputs = [],
  currentOutputIndex = 0,
  onSwitchOutput,
  onOpenWebViewer,
  onOpenWebViewerNewTab
}) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [noteStyle, setNoteStyle] = useState(localStorage.getItem('noteStyle') || 'border');
  
  // Highlight State
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightMode, setHighlightMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const handleStyleChange = () => setNoteStyle(localStorage.getItem('noteStyle') || 'border');
    window.addEventListener('noteStyleChange', handleStyleChange);
    return () => window.removeEventListener('noteStyleChange', handleStyleChange);
  }, []);

  // 1. Load Highlights
  useEffect(() => {
    if (!isUser) {
      const loaded = highlightService.getHighlightsByMessage(chatId, message.id);
      setHighlights(loaded);
    }
  }, [chatId, message.id, isUser]);

  // 2. The Robust Rendering Effect
  const paintHighlights = useCallback(() => {
    if (!contentRef.current || isUser) return;
    
    const root = contentRef.current;
    
    // Step A: Clean up existing highlights
    // We must be careful not to merge text nodes across block boundaries during normalization
    const existing = root.querySelectorAll('.msg-highlight');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
    
    // Normalize is usually safe, but if CitationRenderer is fragile, 
    // we rely on React to heal the DOM on next render if needed.
    root.normalize();

    if (highlights.length === 0) return;

    // Step B: Sort highlights
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

    // Step C: Apply Highlights using the Safe Wrapper
    sortedHighlights.forEach(h => {
      try {
        const range = createRangeFromOffsets(root, h.startOffset, h.endOffset);
        if (range) {
          // Use the new safe highlighter that handles block boundaries
          safeHighlightRange(range, h.color, h.id);
          
          // Re-attach event listeners to the newly created spans
          // (Since we created multiple spans per highlight, we query them by ID)
          const spans = root.querySelectorAll(`.msg-highlight[data-highlight-id="${h.id}"]`);
          spans.forEach((span) => {
             (span as HTMLElement).onclick = (e) => {
                e.stopPropagation();
                handleRemoveHighlight(h.id);
             };
          });
        }
      } catch (e) {
        console.warn("Failed to apply highlight:", h.id, e);
      }
    });
  }, [highlights, isUser]);

  // Trigger painting on data change or citations loading
  useLayoutEffect(() => {
    paintHighlights();
    
    if (contentRef.current && !observerRef.current) {
      observerRef.current = new MutationObserver(() => {
        // Debounce could be added here if CitationRenderer updates frequently
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
  }, [paintHighlights, message.content]);

  // 3. Handle Selection (Creation)
  const handleTextSelection = () => {
    if (isUser || !highlightMode || !contentRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text.trim()) return;

    const startOffset = getGlobalOffset(contentRef.current, range.startContainer, range.startOffset);
    const endOffset = getGlobalOffset(contentRef.current, range.endContainer, range.endOffset);

    if (startOffset === -1 || endOffset === -1) return;

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
    highlightService.deleteHighlight(lastId);
    setHighlights(prev => prev.filter(h => h.id !== lastId));
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastId]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastId = redoStack[redoStack.length - 1];
    const allHighlights = highlightService.getHighlightsByMessage(chatId, message.id);
    const highlight = allHighlights.find(h => h.id === lastId);
    if (highlight) {
      setHighlights(prev => [...prev, highlight]);
      setUndoStack(prev => [...prev, lastId]);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRemoveHighlight = (id: string) => {
    highlightService.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
    setUndoStack(prev => [...prev, id]);
  };

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
            <InteractiveBlob size={40} color="#a6aed9" />
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
             <span className="text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-widest">
                 {isUser ? 'You' : (message.modelId || 'AI')}
             </span>
             {noteNumber && (
               <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb] font-semibold">
                 Note #{noteNumber}
               </span>
             )}
             {!isUser && !message.isStreaming && (
                 <>
                   <button 
                     onClick={() => setHighlightMode(!highlightMode)}
                     className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                       highlightMode 
                         ? 'bg-[#4485d1] text-white' 
                         : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] text-[#a0a0a0] hover:text-[#4485d1]'
                     }`}
                     title="Highlight Mode"
                   >
                     <Highlighter size={12} />
                   </button>
                   {highlightMode && (
                     <div className="flex gap-1 items-center">
                       {HIGHLIGHT_COLORS.map(c => (
                         <button
                           key={c.id}
                           onClick={() => setSelectedColor(c)}
                           className={`w-4 h-4 rounded border-2 transition-all ${
                             selectedColor.id === c.id ? 'border-gray-600 scale-110' : 'border-transparent'
                           }`}
                           style={{ backgroundColor: c.color }}
                         />
                       ))}
                       <button
                         onClick={handleUndo}
                         disabled={undoStack.length === 0}
                         className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30"
                         title="Undo"
                       >
                         <Undo2 size={12} />
                       </button>
                       <button
                         onClick={handleRedo}
                         disabled={redoStack.length === 0}
                         className="p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30"
                         title="Redo"
                       >
                         <Redo2 size={12} />
                       </button>
                     </div>
                   )}
                   <button 
                     onClick={handlePlayAudio}
                     disabled={isLoadingAudio}
                     className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                     title="Read Aloud"
                   >
                     {isLoadingAudio ? <Loader2 size={12} className="animate-spin" /> : (isPlaying ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                   </button>
                   {onRetryMessage && (
                     <button
                       onClick={() => onRetryMessage(message.id)}
                       className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded text-[#a0a0a0] hover:text-[#4485d1] transition-all"
                       title="Regenerate"
                     >
                       <RotateCcw size={12} />
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
              suppressHydrationWarning
              onContextMenu={(e) => {
                e.preventDefault();
                const menuItems = createMessageContextMenu(e.currentTarget, message.content);
                contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'message-context-menu');
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
              {(files.filter(f => message.content.includes(f.name)).length > 0 || sources.filter(s => s.status === 'fetched').length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {files.filter(f => message.content.includes(f.name)).map(file => (
                    <span key={file.id} className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded text-xs text-[#1a1a1a] dark:text-white">
                      <FileText size={12} className="text-[#a0a0a0]" />
                      {file.name}
                    </span>
                  ))}
                  {sources.filter(s => s.status === 'fetched').map(source => (
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
              
              {/* Bottom Row - Stats and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#666666] dark:text-[#a0a0a0]">
                  {/* Token Usage */}
                  {message.usage && (
                    <span>{message.usage.inputTokens.toLocaleString()} → {message.usage.outputTokens.toLocaleString()} tokens</span>
                  )}
                  
                  {/* Alternative Outputs */}
                  {alternativeOutputs.length > 1 && onSwitchOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSwitchOutput(message.id, currentOutputIndex - 1)}
                        disabled={currentOutputIndex === 0}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span>{currentOutputIndex + 1} of {alternativeOutputs.length}</span>
                      <button
                        onClick={() => onSwitchOutput(message.id, currentOutputIndex + 1)}
                        disabled={currentOutputIndex === alternativeOutputs.length - 1}
                        className="p-1 text-[#a0a0a0] hover:text-[#4485d1] disabled:opacity-30 disabled:cursor-not-allowed"
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
                
                {/* Save Button */}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;