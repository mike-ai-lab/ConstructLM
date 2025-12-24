import { useState, useRef } from 'react';
import { ViewState } from '../types';

export const useLayoutState = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [viewerWidth, setViewerWidth] = useState(450);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);
  const [isInputDragOver, setIsInputDragOver] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  return {
    isMobile,
    setIsMobile,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    viewerWidth,
    setViewerWidth,
    isResizing,
    setIsResizing,
    viewState,
    setViewState,
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

