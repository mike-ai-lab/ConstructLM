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

  // Auto-save chat
  useEffect(() => {
    if (currentChatId && messages.length > 1) {
      const timeoutId = setTimeout(() => saveCurrentChat(false), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, files, activeModelId]);
};