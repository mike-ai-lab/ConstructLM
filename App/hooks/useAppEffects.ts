import { useEffect, useRef } from 'react';
import { initializeGemini } from '../../services/geminiService';
import { snapshotService } from '../../services/snapshotService';
import { chatRegistry } from '../../services/chatRegistry';
import { drawingService } from '../../services/drawingService';
import { MODEL_REGISTRY, getRateLimitCooldown, DEFAULT_MODEL_ID } from '../../services/modelRegistry';
import { Message } from '../../types';

export const useAppEffects = (
  setSnapshots: any,
  setChats: any,
  setCurrentChatId: any,
  setMessages: any,
  setActiveModelId: any,
  loadChat: any,
  setIsMobile: any,
  setDrawingState: any,
  handleTakeSnapshot: any,
  showGraphicsLibrary: boolean,
  setShowGraphicsLibrary: any,
  showModelMenu: boolean,
  setShowModelMenu: any,
  modelMenuRef: any,
  messages: Message[],
  userHasScrolled: boolean,
  messagesEndRef: any,
  messagesContainerRef: any,
  setUserHasScrolled: any,
  isResizingSidebar: boolean,
  isResizingViewer: boolean,
  setSidebarWidth: any,
  setViewerWidth: any,
  setIsResizingSidebar: any,
  setIsResizingViewer: any,
  isSidebarOpen: boolean,
  sidebarWidth: number,
  MIN_SIDEBAR_WIDTH: number,
  MAX_SIDEBAR_WIDTH: number,
  MIN_VIEWER_WIDTH: number,
  MAX_VIEWER_WIDTH: number,
  MIN_CHAT_WIDTH: number,
  currentChatId: string | null,
  saveCurrentChat: any,
  files: any[],
  activeModelId: string,
  setRateLimitTimers: any
) => {
  // Initial setup
  useEffect(() => {
    initializeGemini();
    setSnapshots(snapshotService.getSnapshots());
    
    const chatHistory = chatRegistry.getAllChats();
    setChats(chatHistory);
    
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
      const mostRecent = chatHistory.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      loadChat(mostRecent.id);
    }
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const unsubscribeDrawing = drawingService.onStateChange(() => {
      setDrawingState(drawingService.getState());
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeDrawing();
    };
  }, []);

  // Keyboard shortcuts
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

  // Rate limit timer
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

  // Click outside model menu
  useEffect(() => {
    if (!showModelMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelMenu]);

  // Auto-scroll messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.isStreaming && !userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, userHasScrolled]);

  // Scroll detection
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

  // --- REFACTOR START: Resizer Logic ---
  
  // Use refs to track current widths/state without triggering re-binds of the event listener
  const sidebarWidthRef = useRef(sidebarWidth);
  const isSidebarOpenRef = useRef(isSidebarOpen);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isResizingSidebar && !isResizingViewer) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Sidebar Resizing
      if (isResizingSidebar) {
        e.preventDefault();
        // Basic clamp between Min and Max sidebar width
        let newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH));
        
        // Optional: Prevent sidebar from getting too large if it crushes the rest of the app
        // (Assumes a safe buffer, though we prioritize the Viewer logic below)
        const maxSafeWidth = window.innerWidth - MIN_CHAT_WIDTH - 50; 
        newWidth = Math.min(newWidth, maxSafeWidth);

        setSidebarWidth(newWidth);
      }

      // 2. Viewer Resizing (The source of the "squashed input" bug)
      if (isResizingViewer) {
        e.preventDefault();
        const rawNewWidth = window.innerWidth - e.clientX;
        
        // Calculate the maximum width the viewer is LEGALLY allowed to have 
        // while preserving the Sidebar (if open) and the Minimum Chat Width.
        const sidebarSpace = isSidebarOpenRef.current ? sidebarWidthRef.current : 0;
        const maxAllowedWidth = window.innerWidth - sidebarSpace - MIN_CHAT_WIDTH;

        // First, apply standard constraints (Min/Max for the Viewer itself)
        let clampedWidth = Math.max(MIN_VIEWER_WIDTH, Math.min(rawNewWidth, MAX_VIEWER_WIDTH));

        // CRITICAL FIX: If the calculated width exceeds the available space (crushing the input),
        // we force it down to the maxAllowedWidth.
        // This ensures the Chat Input always has at least MIN_CHAT_WIDTH.
        clampedWidth = Math.min(clampedWidth, maxAllowedWidth);

        // Edge case: If the window is extremely small, maxAllowedWidth might be negative.
        // We ensure we don't return a negative width.
        clampedWidth = Math.max(0, clampedWidth);

        setViewerWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingViewer(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Apply styles to indicate resizing
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingViewer, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, MIN_VIEWER_WIDTH, MAX_VIEWER_WIDTH, MIN_CHAT_WIDTH]);
  // --- REFACTOR END ---

  // Auto-save chat
  useEffect(() => {
    if (currentChatId && messages.length > 1) {
      const timeoutId = setTimeout(() => saveCurrentChat(false), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, files, activeModelId]);
};