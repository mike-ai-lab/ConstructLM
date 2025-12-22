import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessedFile, Message } from './types';
import { parseFile } from './services/fileParser';
import FileSidebar from './components/FileSidebar';
import MessageBubble from './components/MessageBubble';
import DocumentViewer from './components/DocumentViewer';
import LiveSession from './components/LiveSession';
import { sendMessageToLLM } from './services/llmService';
import { initializeGemini, getApiKey } from './services/geminiService';
import { MODEL_REGISTRY, DEFAULT_MODEL_ID, getRateLimitCooldown, clearRateLimitCooldown } from './services/modelRegistry';
import SettingsModal from './components/SettingsModal';
import { Send, Menu, Sparkles, X, FileText, Database, PanelLeft, PanelLeftOpen, Mic, Settings, Cpu, ChevronDown, Camera, Highlighter, Edit3, Trash2, Palette, Minus, Plus, Check, Network, Image, Moon, Sun, Phone, HelpCircle } from 'lucide-react';
import { snapshotService, Snapshot } from './services/snapshotService';

import { drawingService, DrawingTool, DRAWING_COLORS, DrawingState } from './services/drawingService';
import { chatRegistry, ChatSession, ChatMetadata } from './services/chatRegistry';
import MindMapViewer from './components/MindMapViewer';
import { generateMindMapData } from './services/mindMapService';
import { mindMapCache } from './services/mindMapCache';
import GraphicsLibrary from './components/GraphicsLibrary';
import { useUIHelpersInit, useToast } from './hooks/useUIHelpers';
import { contextMenuManager, createInputContextMenu, showToast } from './utils/uiHelpers';
import HelpDocumentation from './components/HelpDocumentation';
import { dataExportService } from './services/dataExportService';



interface ViewState {
  fileId: string;
  page?: number;
  quote?: string;
  location?: string;
}

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 500;
const MIN_VIEWER_WIDTH = 400;
const MAX_VIEWER_WIDTH = 800;
const MIN_CHAT_WIDTH = 600;

const App: React.FC = () => {
  // Initialize UI helpers
  useUIHelpersInit();
  

  
  // Chat Registry State
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Layout State
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [viewerWidth, setViewerWidth] = useState(600);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingViewer, setIsResizingViewer] = useState(false);

  // Document View State
  const [viewState, setViewState] = useState<ViewState | null>(null);

  // Mention State
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputHeight, setInputHeight] = useState(56);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isCallingEffect, setIsCallingEffect] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showGraphicsLibrary, setShowGraphicsLibrary] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [rateLimitTimers, setRateLimitTimers] = useState<Record<string, number>>({});
  
  // Drawing State
  const [drawingState, setDrawingState] = useState<DrawingState>(drawingService.getState());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(false);



  // Mind Map State
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [mindMapFileName, setMindMapFileName] = useState<string>('');
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);

  // Input field design specifications from gemini_dictation_and_assistant
  const inputFieldSpecs = {
    // Container positioning
    position: 'fixed',
    bottom: '32px', // Distance from bottom edge of window
    left: '50%',
    transform: 'translateX(-50%)',
    width: '82.8%', // Exact width percentage
    maxWidth: '800px',
    zIndex: 150,
    
    // Container styling
    containerStyle: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      background: 'var(--color-surface)',
      borderRadius: '50px', // Fully rounded corners
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      border: '1px solid var(--color-border)',
      padding: '6px',
    },
    
    // Input field styling
    inputStyle: {
      flexGrow: 1,
      fontSize: '16px', // var(--font-size-md)
      fontWeight: '400', // var(--font-weight-normal)
      padding: '8px 12px',
      color: '#374151',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontFamily: 'var(--font-primary)',
      resize: 'none',
      overflowY: 'auto',
      minHeight: '40px',
      lineHeight: '20px',
    },
    
    // Button styling
    buttonStyle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      background: '#000000',
      color: 'white',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      marginRight: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    },
    
    // Responsive adjustments
    mobileAdjustments: {
      width: '90%',
      bottom: '50px',
      padding: '12px 16px',
    }
  };

  useEffect(() => {
      initializeGemini();
      setSnapshots(snapshotService.getSnapshots());
      
      // Load chat history
      const chatHistory = chatRegistry.getAllChats();
      setChats(chatHistory);
      
      // Create default chat if none exists
      if (chatHistory.length === 0) {
        const newChat = chatRegistry.createNewChat('New Chat', DEFAULT_MODEL_ID);
        setCurrentChatId(newChat.id);
        setMessages(newChat.messages);
        setActiveModelId(newChat.modelId);
        setChats([{
          id: newChat.id,
          name: newChat.name,
          modelId: newChat.modelId,
          messageCount: newChat.messages.length,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }]);
      } else {
        // Load the most recent chat
        const mostRecent = chatHistory.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        loadChat(mostRecent.id);
      }
      
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      
      // Drawing service subscription
      const unsubscribeDrawing = drawingService.onStateChange(() => {
        setDrawingState(drawingService.getState());
      });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        unsubscribeDrawing();
      };
  }, []);

  // Separate effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleTakeSnapshot();
      }
      if (e.key === 'Escape' && showGraphicsLibrary) {
        setShowGraphicsLibrary(false);
      }
      if (e.key === 'Escape' && showModelMenu) {
        setShowModelMenu(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGraphicsLibrary, showModelMenu]);

  // Rate limit timer updater
  useEffect(() => {
    const interval = setInterval(() => {
      const timers: Record<string, number> = {};
      MODEL_REGISTRY.forEach(model => {
        const cooldown = getRateLimitCooldown(model.id);
        if (cooldown) {
          timers[model.id] = cooldown;
        }
      });
      setRateLimitTimers(timers);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Separate effect for click outside
  useEffect(() => {
    if (!showModelMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    
    // Delay attachment to avoid closing on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelMenu]);

  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (!userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    // Only auto-scroll for new messages, not streaming updates
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.isStreaming) {
      scrollToBottom();
    }
  }, [messages.length, userHasScrolled]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserHasScrolled(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH)));
      }
      if (isResizingViewer) {
        const newWidth = window.innerWidth - e.clientX;
        const sidebarSpace = isSidebarOpen ? sidebarWidth : 0;
        const availableWidth = window.innerWidth - sidebarSpace - MIN_CHAT_WIDTH;
        const maxAllowed = Math.min(MAX_VIEWER_WIDTH, availableWidth);
        setViewerWidth(Math.max(MIN_VIEWER_WIDTH, Math.min(newWidth, maxAllowed)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingViewer(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto'; // Re-enable selection
    };

    if (isResizingSidebar || isResizingViewer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Disable selection while dragging
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingViewer]);

  // Chat Management Functions
  const loadChat = (chatId: string) => {
    const chat = chatRegistry.getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setActiveModelId(chat.modelId);
      // Don't change files when switching chats - preserve them
    }
  };

  const saveCurrentChat = (updateTimestamp: boolean = false) => {
    if (!currentChatId) return;
    
    const existingChat = chats.find(c => c.id === currentChatId);
    const chat: ChatSession = {
      id: currentChatId,
      name: generateChatName(messages),
      modelId: activeModelId,
      messages,
      fileIds: [],
      createdAt: existingChat?.createdAt || Date.now(),
      updatedAt: updateTimestamp ? Date.now() : (existingChat?.updatedAt || Date.now())
    };
    
    chatRegistry.saveChat(chat);
    
    // Update chats list
    setChats(prev => {
      const existing = prev.find(c => c.id === currentChatId);
      const updated = {
        id: chat.id,
        name: chat.name,
        modelId: chat.modelId,
        messageCount: chat.messages.length,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
      
      if (existing) {
        return prev.map(c => c.id === currentChatId ? updated : c);
      } else {
        return [...prev, updated];
      }
    });
  };

  const generateChatName = (messages: Message[]): string => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'New Chat';
    
    const firstMessage = userMessages[0].content;
    const words = firstMessage.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const handleCreateChat = () => {
    saveCurrentChat();
    
    const newChat = chatRegistry.createNewChat('New Chat', activeModelId);
    setCurrentChatId(newChat.id);
    setMessages(newChat.messages);
    
    setChats(prev => [{
      id: newChat.id,
      name: newChat.name,
      modelId: newChat.modelId,
      messageCount: newChat.messages.length,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt
    }, ...prev]);
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId === currentChatId) return;
    saveCurrentChat(); // Save current chat first
    loadChat(chatId);
    // Don't update chat order just by selecting - only when sending messages
  };

  const handleDeleteChat = (chatId: string) => {
    chatRegistry.deleteChat(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    
    if (chatId === currentChatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        loadChat(remaining[0].id);
      } else {
        handleCreateChat();
      }
    }
  };

  const handleFileUpload = async (fileList: FileList) => {
    setIsProcessingFiles(true);
    const newFiles: ProcessedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (files.some(f => f.name === file.name)) continue;
      const processed = await parseFile(file);
      newFiles.push(processed);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFiles(false);
  };



  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (viewState?.fileId === id) setViewState(null);
  };

  // Auto-save chat when messages or files change (without updating timestamp)
  useEffect(() => {
    if (currentChatId && messages.length > 1) { // Don't save just the intro message
      const timeoutId = setTimeout(() => saveCurrentChat(false), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, files, activeModelId]);

  // --- Mention Logic ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart || 0;
    const lastAt = val.lastIndexOf('@', cursor - 1);
    
    if (lastAt !== -1) {
        const query = val.slice(lastAt + 1, cursor);
        if (!query.includes(' ')) {
            setShowMentionMenu(true);
            setMentionQuery(query.toLowerCase());
            setMentionIndex(0);
            return;
        }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (fileName: string) => {
      const cursor = inputRef.current?.selectionStart || 0;
      const lastAt = input.lastIndexOf('@', cursor - 1);
      if (lastAt !== -1) {
          const before = input.slice(0, lastAt);
          const after = input.slice(cursor);
          const newValue = `${before}@${fileName} ${after}`;
          setInput(newValue);
          setShowMentionMenu(false);
      }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(mentionQuery));

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (showMentionMenu && filteredFiles.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setMentionIndex(prev => (prev + 1) % filteredFiles.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              insertMention(filteredFiles[mentionIndex].name);
          } else if (e.key === 'Escape') {
              setShowMentionMenu(false);
          }
          return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };


  // --- Sending Logic ---
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
    const activeContextFiles = mentionedFiles;
    
    // Token validation
    const totalTokens = activeContextFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
    if (totalTokens > 50000) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**Token Limit Exceeded**\n\nYou're trying to send ~${(totalTokens / 1000).toFixed(0)}k tokens, but most models have a limit of 30-50k tokens.\n\n**Solution:** Remove some @mentions or use fewer/smaller files.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }, errorMsg]);
      setInput('');
      return;
    }

    const displayContent = input.replace(/@([^\s]+)/g, '$1');
    
    // Show helpful message if files exist but none mentioned
    if (files.length > 0 && activeContextFiles.length === 0 && input.toLowerCase().includes('file')) {
      const helpMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**Tip:** You have ${files.length} file(s) uploaded, but none are mentioned.\n\nUse **@filename** to include files in your question. Type **@** to see the list.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: displayContent, timestamp: Date.now() }, helpMsg]);
      setInput('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowMentionMenu(false);
    setIsGenerating(true);

    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        modelId: activeModelId
    };
    
    setMessages(prev => [...prev, modelMsg]);

    try {
      let accumText = "";
      let updateTimer: NodeJS.Timeout | null = null;
      
      const usage = await sendMessageToLLM(
          activeModelId,
          messages,
          userMsg.content,
          activeContextFiles, 
          (chunk) => {
              accumText += chunk;
              
              // Debounce updates to reduce jumpiness
              if (updateTimer) clearTimeout(updateTimer);
              updateTimer = setTimeout(() => {
                setMessages(prev => prev.map(msg => 
                    msg.id === modelMsgId 
                    ? { ...msg, content: accumText } 
                    : msg
                ));
              }, 50);
          }
      );
      
      // Final update
      if (updateTimer) clearTimeout(updateTimer);
      setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
          ? { ...msg, content: accumText } 
          : msg
      ));
      
      // Update message with usage stats
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, usage: { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0 } } 
            : msg
        ));
      }
    } catch (error: any) {
       console.error(error);
       const errorMsg = error?.message || "Sorry, I encountered an error. Please check your connection.";
       setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, content: `**Error:** ${errorMsg}` } 
            : msg
        ));
    } finally {
        setIsGenerating(false);
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, isStreaming: false } 
            : msg
        ));
        // Update timestamp only when sending messages
        saveCurrentChat(true);
    }
  };

  const handleViewDocument = (fileName: string, page?: number, quote?: string, location?: string) => {
      const file = files.find(f => f.name === fileName);
      if (file) {
          setViewState({
              fileId: file.id,
              page: page || 1,
              quote,
              location
          });
      }
  };

  const activeFile = viewState ? files.find(f => f.id === viewState.fileId) : null;

  const activeModel = MODEL_REGISTRY.find(m => m.id === activeModelId) || MODEL_REGISTRY[0];

  const handleTakeSnapshot = async () => {
    try {
      // Target the specific messages container in the chat area
      const messagesContainer = document.querySelector('.max-w-3xl.mx-auto.w-full');
      if (!messagesContainer) {
        showToast('Messages container not found', 'error');
        return;
      }
      
      const context = {
        fileCount: files.length,
        messageCount: messages.length
      };
      
      showToast('Taking snapshot...', 'info');
      const snapshot = await snapshotService.takeSnapshot(messagesContainer as HTMLElement, context);
      setSnapshots(snapshotService.getSnapshots());
      showToast('Snapshot saved!', 'success');
    } catch (error: any) {
      console.error('Failed to take snapshot:', error);
      const errorMessage = error?.message || 'Failed to take snapshot';
      showToast(errorMessage, 'error');
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    snapshotService.downloadSnapshot(snapshot);
  };

  const handleCopySnapshot = async (snapshot: Snapshot) => {
    try {
      await snapshotService.copyToClipboard(snapshot);
      showToast('Copied to clipboard!', 'success');
    } catch (error: any) {
      console.error('Failed to copy snapshot:', error);
      showToast('Failed to copy snapshot', 'error');
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    snapshotService.deleteSnapshot(id);
    setSnapshots(snapshotService.getSnapshots());
  };

  // Drawing handlers
  const handleDrawingToolChange = (tool: DrawingTool) => {
    drawingService.setTool(tool);
    if (tool === 'none') {
      setShowColorPicker(false);
    }
  };

  const handleColorChange = (colorId: string) => {
    drawingService.setColor(colorId);
    setShowColorPicker(false);
  };

  const handleStrokeWidthChange = (delta: number) => {
    drawingService.setStrokeWidth(drawingState.strokeWidth + delta);
  };

  const handleClearAll = () => {
    if (confirm('Clear all drawings and highlights?')) {
      drawingService.clearAll();
    }
  };

  const currentColor = DRAWING_COLORS.find(c => c.id === drawingState.colorId) || DRAWING_COLORS[0];

  const handleGenerateMindMap = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const cached = mindMapCache.get(fileId, activeModelId);
    if (cached) {
      setMindMapData(cached.data);
      setMindMapFileName(cached.fileName);
      return;
    }

    setIsGeneratingMindMap(true);
    try {
      const data = await generateMindMapData(file, activeModelId);
      mindMapCache.save(fileId, file.name, activeModelId, data);
      setMindMapData(data);
      setMindMapFileName(file.name);
    } catch (error: any) {
      console.error('Mind map generation error:', error);
      const errorMessage = (error as Error).message || 'Failed to generate mind map';
      showToast(errorMessage, 'error');
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleOpenMindMapFromLibrary = (fileId: string, modelId: string, data: any, fileName: string) => {
    setMindMapData(data);
    setMindMapFileName(fileName);
    setShowGraphicsLibrary(false);
  };

  const handleDeleteMindMap = (fileId: string, modelId: string) => {
    mindMapCache.delete(fileId, modelId);
  };

  const handleCloseLiveSession = useCallback(() => {
    setIsLiveMode(false);
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          await transcribeAudio(audioBlob);
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        showToast('Failed to access microphone', 'error');
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      showToast('Transcribing audio...', 'info');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const apiKey = getApiKey();
      if (!apiKey) {
        showToast('Please set your API key in .env.local', 'error');
        return;
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe this audio accurately.' },
                { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
              ]
            }]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (transcription) {
        setInput(prev => prev + (prev ? ' ' : '') + transcription);
        showToast('Transcription complete', 'success');
      } else {
        showToast('No transcription returned', 'error');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      showToast('Failed to transcribe audio', 'error');
    }
  };



  // Detect if running in Electron
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  
  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#1a1a1a] overflow-hidden text-sm relative">
      {/* LIVE MODE - BROWSER ONLY */}
      {isLiveMode && (
        <LiveSession onClose={handleCloseLiveSession} />
      )}
      {isCallingEffect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center">
          <div className="bg-white dark:bg-[#222222] rounded-3xl shadow-2xl p-12 flex flex-col items-center gap-6 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
              <div className="relative bg-green-500 p-6 rounded-full">
                <Phone size={48} className="text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Calling Gemini...</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connecting to live conversation</p>
            </div>
          </div>
        </div>
      )}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isHelpOpen && <HelpDocumentation onClose={() => setIsHelpOpen(false)} />}
      {isGeneratingMindMap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Generating Mind Map</h3>
              <p className="text-sm text-gray-600">AI is analyzing the document structure...</p>
            </div>
          </div>
        </div>
      )}
      {mindMapData && (
        <div className="fixed inset-0 z-[60]">
          <MindMapViewer 
            data={mindMapData} 
            fileName={mindMapFileName}
            onClose={() => { setMindMapData(null); setMindMapFileName(''); }}
          />
        </div>
      )}
      
      {/* Mobile Menu Button */}
      {isMobile && !isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 p-2 bg-white shadow-md rounded-full border border-gray-200"
          >
              <Menu size={20} className="text-gray-600" />
          </button>
      )}

      {/* --- LEFT SIDEBAR --- */}
      {true && (
      <div 
        className={`
            fixed md:relative z-40 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col transition-all duration-300 ease-in-out border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] md:border-r-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${!isSidebarOpen && !isMobile ? 'md:w-0 md:opacity-0 md:overflow-hidden' : ''}
        `}
        style={{ width: isMobile ? '85%' : (isSidebarOpen ? sidebarWidth : 0) }}
      >
        <div className="h-full flex flex-col relative w-full">
            {/* Mobile Close */}
            {isMobile && (
                <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-3 right-3 p-1 text-gray-400"
                >
                    <X size={20} />
                </button>
            )}
            
            {/* Hide content when collapsed to prevent squishing during transition */}
            <div className={`flex flex-col h-full w-full ${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                 <FileSidebar 
                    files={files} 
                    onUpload={handleFileUpload} 
                    onRemove={handleRemoveFile}
                    isProcessing={isProcessingFiles}
                    onGenerateMindMap={handleGenerateMindMap}
                    chats={chats}
                    activeChatId={currentChatId}
                    onSelectChat={handleSelectChat}
                    onCreateChat={handleCreateChat}
                    onDeleteChat={handleDeleteChat}
                    isDragOver={isSidebarDragOver}
                    onDragStateChange={setIsSidebarDragOver}
                />
            </div>
        </div>
      </div>
      )}

      {/* Resize Handle: Left */}
      {!isMobile && isSidebarOpen && !mindMapData && !isGeneratingMindMap && (
          <div 
            className={`resize-handle-vertical ${isResizingSidebar ? 'active' : ''}`}
            onMouseDown={() => setIsResizingSidebar(true)}
          />
      )}

      {/* --- MIDDLE CHAT AREA --- */}
      {true && (
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-[#1a1a1a] transition-all duration-300" style={{ minWidth: MIN_CHAT_WIDTH }}>
        {/* Header */}
        <header className="h-[65px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between px-6 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm z-10 min-w-0 overflow-visible">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
             {!isMobile && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="mr-2 p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                 >
                    {isSidebarOpen ? <PanelLeft size={20} /> : <PanelLeftOpen size={20} />}
                 </button>
             )}
             <div className="bg-gradient-to-tr from-[#4485d1] to-[#4485d1] p-1.5 rounded-lg shadow-sm flex-shrink-0">
                <Sparkles size={16} className="text-white" />
             </div>
             <h1 className="font-semibold text-[#1a1a1a] dark:text-white text-lg tracking-tight mr-4 truncate">ConstructLM</h1>
             
             <div className="relative" ref={modelMenuRef}>
                 <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-xs font-medium text-[#1a1a1a] dark:text-white"
                 >
                     <Cpu size={14} />
                     <span className="max-w-[120px] truncate">{activeModel.name}</span>
                     <ChevronDown size={12} />
                 </button>
                 
                 {showModelMenu && (
                     <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-[1000]">
                         <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase">Select Model</div>
                         <div className="max-h-[400px] overflow-y-auto p-1">
                             {MODEL_REGISTRY.map(model => {
                               const cooldown = rateLimitTimers[model.id];
                               const isRateLimited = cooldown && cooldown > Date.now();
                               const remainingMs = isRateLimited ? cooldown - Date.now() : 0;
                               const remainingMinutes = Math.floor(remainingMs / 60000);
                               const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                               const timeDisplay = remainingMinutes > 0 
                                 ? `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
                                 : `${remainingSeconds}s`;
                               
                               return (
                                 <button
                                     key={model.id}
                                     onClick={() => { setActiveModelId(model.id); setShowModelMenu(false); }}
                                     className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${activeModelId === model.id ? 'bg-[rgba(68,133,209,0.1)]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}`}
                                 >
                                     <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${model.provider === 'google' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                          <span className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{model.name}</span>
                                          {model.supportsThinking && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold flex-shrink-0">Thinks</span>
                                          )}
                                        </div>
                                        <div className="flex-shrink-0">
                                          {isRateLimited ? (
                                            <span className="text-[12px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-mono">▽{timeDisplay}</span>
                                          ) : (
                                            <span className={`text-[12px] px-1.5 py-0.5 rounded ${
                                              model.capacityTag === 'High' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                              model.capacityTag === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}>{model.capacityTag}</span>
                                          )}
                                        </div>
                                     </div>
                                     <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] pl-4 mt-0.5">{model.description}</div>
                                     {model.maxInputWords && model.maxOutputWords && (
                                       <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] pl-4 mt-1 flex gap-3">
                                         <span>In: ~{(model.maxInputWords / 1000).toFixed(0)}K</span>
                                         <span>Out: ~{(model.maxOutputWords / 1000).toFixed(0)}K</span>
                                       </div>
                                     )}
                                 </button>
                               );
                             })}
                         </div>
                     </div>
                 )}
             </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Call Button - BROWSER ONLY */}
            {!isElectron && (
              <button
              onClick={() => {
                if (!isCallingEffect && !isLiveMode) {
                  setIsCallingEffect(true);
                  setTimeout(() => {
                    setIsCallingEffect(false);
                    setIsLiveMode(true);
                  }, 5000);
                }
              }}
              disabled={isCallingEffect || isLiveMode}
              className={`p-2 rounded-full transition-all ${
                isCallingEffect 
                  ? 'bg-green-500 text-white animate-pulse scale-110' 
                  : 'text-[#a0a0a0] hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600'
              } ${isLiveMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Call Gemini Live"
            >
              <Phone size={18} className={isCallingEffect ? 'animate-bounce' : ''} />
            </button>
            )}
            {/* New Chat Button */}
            <button
              onClick={handleCreateChat}
              className="p-2 text-[#a0a0a0] hover:bg-[rgba(68,133,209,0.1)] hover:text-[#4485d1] rounded-full transition-colors"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            {/* Drawing Tools */}
            <div className="relative">
              <button
                onClick={() => setShowToolPicker(!showToolPicker)}
                className={`p-2 rounded-full transition-colors ${
                  drawingState.tool === 'highlighter'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : drawingState.tool === 'pen'
                    ? 'bg-[rgba(68,133,209,0.1)] text-[#4485d1]'
                    : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                }`}
                title="Drawing Tools"
              >
                {drawingState.tool === 'highlighter' ? <Highlighter size={18} /> : drawingState.tool === 'pen' ? <Edit3 size={18} /> : <Edit3 size={18} />}
              </button>
              
              {showToolPicker && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-50 flex gap-1">
                  <button
                    onClick={() => { handleDrawingToolChange('pen'); setShowToolPicker(false); }}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                      drawingState.tool === 'pen' ? 'bg-[rgba(68,133,209,0.2)] text-[#4485d1] scale-110' : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                    }`}
                    title="Pen"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => { handleDrawingToolChange('highlighter'); setShowToolPicker(false); }}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                      drawingState.tool === 'highlighter' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 scale-110' : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                    }`}
                    title="Highlighter"
                  >
                    <Highlighter size={18} />
                  </button>
                  <button
                    onClick={() => { handleClearAll(); setShowToolPicker(false); }}
                    className="p-2 rounded-full text-[#a0a0a0] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-[#ef4444] transition-all hover:scale-110"
                    title="Clear All"
                  >
                    <Trash2 size={18} />
                  </button>
                  {drawingState.isActive && (
                    <button
                      onClick={() => { handleDrawingToolChange('none'); setShowToolPicker(false); }}
                      className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 transition-all hover:scale-110"
                      title="Done"
                    >
                      <Check size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Drawing Controls - Show when drawing is active */}
            {drawingState.isActive && drawingState.tool !== 'none' && (
              <>
                {/* Color Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors"
                    title="Choose Color"
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: currentColor.color }}
                      />
                    </div>
                  </button>
                  
                  {showColorPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-50 flex gap-1">
                      {DRAWING_COLORS.map(color => (
                        <button
                          key={color.id}
                          onClick={() => handleColorChange(color.id)}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 ${
                            drawingState.colorId === color.id ? 'border-[#a0a0a0] scale-110' : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'
                          }`}
                          style={{ backgroundColor: color.color }}
                          title={(color as any).name}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Stroke Width - Only for pen */}
                {drawingState.tool === 'pen' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStrokeWidthChange(-1)}
                      disabled={drawingState.strokeWidth <= 1}
                      className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      title="Decrease stroke width"
                    >
                      <Minus size={14} />
                    </button>
                    <div 
                      className="rounded-full bg-gray-600"
                      style={{ 
                        width: `${Math.max(4, drawingState.strokeWidth * 2)}px`, 
                        height: `${Math.max(4, drawingState.strokeWidth * 2)}px` 
                      }}
                    />
                    <button
                      onClick={() => handleStrokeWidthChange(1)}
                      disabled={drawingState.strokeWidth >= 10}
                      className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      title="Increase stroke width"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
            
            <button 
              onClick={handleTakeSnapshot}
              className="p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors"
              title="Take Snapshot (Ctrl+Shift+S)"
            >
                <Camera size={18} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowGraphicsLibrary(!showGraphicsLibrary)}
                className="p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors relative"
                title="Graphics Library"
              >
                  <Image size={18} />
                  {(snapshots.length + Object.keys(mindMapCache.getAll()).length) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#4485d1] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {snapshots.length + Object.keys(mindMapCache.getAll()).length}
                    </span>
                  )}
              </button>
              <GraphicsLibrary
                isOpen={showGraphicsLibrary}
                onClose={() => setShowGraphicsLibrary(false)}
                snapshots={snapshots}
                onDownloadSnapshot={handleDownloadSnapshot}
                onCopySnapshot={handleCopySnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
                onOpenMindMap={handleOpenMindMapFromLibrary}
              />
            </div>
            <button 
              onClick={() => document.documentElement.classList.toggle('dark')}
              className="p-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full relative"
              title="Toggle Theme"
              style={{ width: '34px', height: '34px' }}
            >
                <Moon size={18} className="dark:!hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#666666' }} />
                <Sun size={18} className="!hidden dark:!block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#ffffff' }} />
            </button>
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors"
              title="Help & Documentation"
            >
                <HelpCircle size={18} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors"
              title="Settings"
            >
                <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-white dark:bg-[#1a1a1a]">
            <div className="max-w-3xl mx-auto w-full" style={{ paddingBottom: `${inputHeight + 100}px` }}>
                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        files={files} 
                        onViewDocument={handleViewDocument}
                    />
                ))}
                <div ref={messagesEndRef} className="h-4 snapshot-ignore" />
            </div>
        </div>


        
        {/* Floating Input Area */}
        {!mindMapData && !isSettingsOpen && !isCallingEffect && !isHelpOpen && (
        <>
        {/* Solid background layer */}
        <div 
          className="fixed bottom-0 bg-white dark:bg-[#1a1a1a] pointer-events-none"
          style={{
            left: isMobile ? '16px' : (isSidebarOpen ? `${sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (isMobile ? '16px' : `${viewerWidth + 16}px`) : '16px',
            height: '140px',
            zIndex: 149,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        {/* Gradient layer */}
        <div
          className="input-gradient-layer fixed bottom-[140px] pointer-events-none"
          style={{
            left: isMobile ? '16px' : (isSidebarOpen ? `${sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (isMobile ? '16px' : `${viewerWidth + 16}px`) : '16px',
            height: '30px',
            zIndex: 149,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <div 
          className="floating-input-container"
          style={{
            left: isMobile ? '16px' : (isSidebarOpen ? `${sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (isMobile ? '16px' : `${viewerWidth + 16}px`) : '16px'
          }}
        >
          <div className="max-w-3xl mx-auto w-full relative">
            {/* Context Indicator */}
            {isInputDragOver && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium bg-[#4485d1] text-white px-3 py-1.5 rounded-full shadow-lg animate-bounce">
                    Drop to add & mention
                </div>
            )}
            {!isInputDragOver && input.trim() && files.length > 0 && (() => {
                const mentionedFiles = files.filter(f => input.includes(`@${f.name}`));
                const totalTokens = mentionedFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
                const isOverLimit = totalTokens > 30000;
                
                return (
                  <div className="absolute -top-6 left-6 text-[12px] font-medium transition-all duration-300">
                      {mentionedFiles.length > 0 ? (
                          <span className={`flex items-center gap-1 ${isOverLimit ? 'text-[#ef4444]' : 'text-[#4485d1]'}`}>
                              <Sparkles size={10} /> {mentionedFiles.length} file(s) • ~{(totalTokens / 1000).toFixed(0)}k tokens
                              {isOverLimit && ' ⚠️'}
                          </span>
                      ) : (
                          <span className="text-[#666666] dark:text-[#a0a0a0] flex items-center gap-1">
                              <Database size={10} /> No files selected - Use @ to mention
                          </span>
                      )}
                  </div>
                );
            })()}

            {/* Mention Popup Menu */}
            {showMentionMenu && filteredFiles.length > 0 && (
                <div className="absolute bottom-full left-6 mb-2 w-64 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">
                        Mention a source
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredFiles.map((f, i) => (
                            <button
                                key={f.id}
                                onClick={() => insertMention(f.name)}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors ${i === mentionIndex ? 'bg-[rgba(68,133,209,0.1)] text-[#4485d1]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white'}`}
                            >
                                <FileText size={14} className={i === mentionIndex ? 'text-[#4485d1]' : 'text-[#a0a0a0]'} />
                                <span className="truncate">{f.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={`floating-input-wrapper transition-all ${
              isInputDragOver ? 'border-[#4485d1] ring-4 ring-[rgba(68,133,209,0.1)] bg-[rgba(68,133,209,0.05)]' : 'focus-within:ring-2 focus-within:ring-[rgba(68,133,209,0.1)]'
            }`}>
                <input
                    type="file"
                    id="chat-file-input"
                    multiple
                    accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.bmp,.webp,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                />
                <label
                    htmlFor="chat-file-input"
                    className="absolute left-2 p-2 rounded-full text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] transition-colors cursor-pointer"
                    title="Attach files"
                >
                    <FileText size={20} />
                </label>
                <button
                    onClick={handleToggleRecording}
                    className={`absolute left-12 p-2 rounded-full transition-colors ${
                      isRecording 
                        ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' 
                        : 'text-[#a0a0a0] hover:text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)]'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Voice input'}
                >
                    <Mic size={20} />
                </button>



                <textarea
                    ref={inputRef}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const element = e.currentTarget;
                      const menuItems = createInputContextMenu(element);
                      contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'input-context-menu');
                    }}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="floating-input-field"
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsInputDragOver(false);
                      
                      const cursorPos = inputRef.current?.selectionStart || input.length;
                      const before = input.slice(0, cursorPos);
                      const after = input.slice(cursorPos);
                      const space = (before && !before.endsWith(' ')) ? ' ' : '';
                      
                      const mention = e.dataTransfer.getData('text/plain');
                      if (mention && mention.startsWith('@')) {
                        const newValue = before + space + mention + ' ' + after;
                        setInput(newValue);
                        setTimeout(() => {
                          if (inputRef.current) {
                            const newPos = before.length + space.length + mention.length + 1;
                            inputRef.current.setSelectionRange(newPos, newPos);
                            inputRef.current.focus();
                          }
                        }, 10);
                        return;
                      }
                      
                      const droppedFiles = e.dataTransfer.files;
                      if (droppedFiles.length > 0) {
                        await handleFileUpload(droppedFiles);
                        const mentions = Array.from(droppedFiles).map(f => `@${f.name}`).join(' ');
                        const newValue = before + space + mentions + ' ' + after;
                        setInput(newValue);
                        setTimeout(() => {
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }, 100);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                      setIsInputDragOver(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsInputDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsInputDragOver(false);
                    }}
                    placeholder={files.length === 0 ? "Ask me anything or drag files here..." : "Type @ to mention files (required for file context)..."}
                    disabled={isGenerating}
                    autoComplete="off"
                    rows={1}
                    style={{ height: 'auto', paddingLeft: '106px', paddingRight: '56px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      const newHeight = Math.min(target.scrollHeight, 230);
                      target.style.height = newHeight + 'px';
                      setInputHeight(newHeight + 32);
                    }}
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isGenerating}
                        className={`floating-send-button ${
                            !input.trim() || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isGenerating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Footer Text - Independent Element */}
        {!mindMapData && !isSettingsOpen && !isCallingEffect && !isHelpOpen && (
        <div 
          className="fixed bottom-2 text-center pointer-events-none z-[9997]"
          style={{
            left: isMobile ? '16px' : (isSidebarOpen ? `${sidebarWidth + 16}px` : '16px'),
            right: activeFile ? (isMobile ? '16px' : `${viewerWidth + 16}px`) : '16px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <span className="text-[#666666] dark:text-[#a0a0a0] text-xs">AI can make mistakes. Please verify citations.</span>
        </div>
        )}
      </div>
      )}

      {/* Resize Handle: Right (Only if Viewer is open) */}
      {!isMobile && activeFile && !mindMapData && !isGeneratingMindMap && (
          <div 
            className={`resize-handle-vertical ${isResizingViewer ? 'active' : ''}`}
            onMouseDown={() => setIsResizingViewer(true)}
          />
      )}

      {/* --- RIGHT DOCUMENT VIEWER --- */}
      {activeFile && (
          <div 
            className={`
               fixed md:relative z-30 h-full bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex flex-col shadow-2xl md:shadow-none border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]
               animate-in slide-in-from-right duration-300
            `}
            style={{ 
                width: isMobile ? '100%' : viewerWidth,
                maxWidth: MAX_VIEWER_WIDTH,
                minWidth: MIN_VIEWER_WIDTH,
                display: 'flex'
            }}
          >
              <DocumentViewer 
                file={activeFile} 
                initialPage={viewState?.page} 
                highlightQuote={viewState?.quote}
                location={viewState?.location}
                onClose={() => setViewState(null)}
              />
          </div>
      )}
    </div>
  );
};

export default App;