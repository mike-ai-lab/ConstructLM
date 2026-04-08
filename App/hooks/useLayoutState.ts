import { useState, useRef } from 'react';
import { ViewState } from '../types';
import { sessionPersistence } from '../../services/sessionPersistence';

export const useLayoutState = () => {
  // Load from session persistence
  const session = sessionPersistence.loadSession();
  
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(session.isSidebarOpen);
  const [sidebarWidth, setSidebarWidth] = useState(session.sidebarWidth);
  const [viewerWidth, setViewerWidth] = useState(session.viewerWidth);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [viewState, setViewState] = useState<ViewState | null>(session.viewState);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Wrap setters to persist changes
  const setIsSidebarOpenPersisted = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsSidebarOpen(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      sessionPersistence.saveSession({ isSidebarOpen: newValue });
      return newValue;
    });
  };

  const setSidebarWidthPersisted = (value: number | ((prev: number) => number)) => {
    setSidebarWidth(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      sessionPersistence.saveSession({ sidebarWidth: newValue });
      return newValue;
    });
  };

  const setViewerWidthPersisted = (value: number | ((prev: number) => number)) => {
    setViewerWidth(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      sessionPersistence.saveSession({ viewerWidth: newValue });
      return newValue;
    });
  };

  const setViewStatePersisted = (value: ViewState | null | ((prev: ViewState | null) => ViewState | null)) => {
    setViewState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      sessionPersistence.saveSession({ viewState: newValue });
      return newValue;
    });
  };

  return {
    isMobile,
    setIsMobile,
    isSidebarOpen,
    setIsSidebarOpen: setIsSidebarOpenPersisted,
    sidebarWidth,
    setSidebarWidth: setSidebarWidthPersisted,
    viewerWidth,
    setViewerWidth: setViewerWidthPersisted,
    isResizing,
    setIsResizing,
    viewState,
    setViewState: setViewStatePersisted,
    isSidebarDragOver,
    setIsSidebarDragOver,
    isInputDragOver,
    setIsInputDragOver,
    userHasScrolled,
    setUserHasScrolled,
    messagesEndRef,
    messagesContainerRef,
  };
};

