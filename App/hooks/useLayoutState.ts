import { useState, useRef } from 'react';
import { ViewState } from '../types';

export const useLayoutState = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [viewerWidth, setViewerWidth] = useState(600);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingViewer, setIsResizingViewer] = useState(false);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);
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
    isResizingSidebar,
    setIsResizingSidebar,
    isResizingViewer,
    setIsResizingViewer,
    viewState,
    setViewState,
    isSidebarDragOver,
    setIsSidebarDragOver,
    userHasScrolled,
    setUserHasScrolled,
    messagesEndRef,
    messagesContainerRef,
  };
};
