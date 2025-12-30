import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';

interface WebTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface TabbedWebViewerElectronProps {
  initialUrl: string;
  onClose: () => void;
  onNewTabRequest?: (url: string) => void;
}

const TabbedWebViewerElectron: React.FC<TabbedWebViewerElectronProps> = ({ initialUrl, onClose, onNewTabRequest }) => {
  console.log('🚀 TabbedWebViewerElectron initialUrl:', initialUrl);
  const [tabs, setTabs] = useState<WebTab[]>([
    { id: Date.now().toString(), url: initialUrl, title: new URL(initialUrl).hostname, isLoading: true }
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  console.log('📋 Initial tabs:', tabs);
  console.log('🎯 Active tab ID:', activeTabId);
  const [tabsScrollPosition, setTabsScrollPosition] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const webviewRefs = useRef<{ [key: string]: any }>({});

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    console.log('🔧 Electron WebView mode enabled - cookies will persist properly');
    if (onNewTabRequest) {
      (window as any).__openWebViewerNewTab = (url: string) => {
        handleNewTab(url);
      };
    }
    return () => {
      delete (window as any).__openWebViewerNewTab;
    };
  }, [onNewTabRequest]);

  const handleNewTab = (url: string) => {
    const newTab: WebTab = {
      id: Date.now().toString(),
      url,
      title: new URL(url).hostname,
      isLoading: true
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      onClose();
      return;
    }

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleRefresh = () => {
    const webview = webviewRefs.current[activeTabId];
    if (webview) {
      webview.reload();
    }
  };

  const handleBack = () => {
    const webview = webviewRefs.current[activeTabId];
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  };

  const handleForward = () => {
    const webview = webviewRefs.current[activeTabId];
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  };

  const handleTabLoad = (tabId: string, title: string) => {
    console.log(`✅ WebView loaded: ${tabId}, Title: ${title}`);
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, isLoading: false, title: title || t.title } : t
      )
    );
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const scrollAmount = 200;
    const newPosition = direction === 'left'
      ? Math.max(0, tabsScrollPosition - scrollAmount)
      : tabsScrollPosition + scrollAmount;
    
    tabsContainerRef.current.scrollLeft = newPosition;
    setTabsScrollPosition(newPosition);
  };

  useEffect(() => {
    // Setup webview event listeners
    tabs.forEach(tab => {
      const webview = webviewRefs.current[tab.id];
      if (webview && !webview._listenersAttached) {
        webview._listenersAttached = true;

        webview.addEventListener('did-finish-load', () => {
          const title = webview.getTitle();
          handleTabLoad(tab.id, title);
        });

        webview.addEventListener('did-start-loading', () => {
          setTabs(prev =>
            prev.map(t => t.id === tab.id ? { ...t, isLoading: true } : t)
          );
        });

        webview.addEventListener('page-title-updated', (e: any) => {
          setTabs(prev =>
            prev.map(t => t.id === tab.id ? { ...t, title: e.title } : t)
          );
        });
      }
    });
  }, [tabs]);

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Minimal Top Bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-transparent bg-transparent">
        {/* Tabs */}
        <div className="relative flex-1 flex items-center gap-1 overflow-hidden">
          {tabs.length > 3 && (
            <button
              onClick={() => scrollTabs('left')}
              className="size-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-xs flex-shrink-0"
              title="Scroll tabs left"
            >
              <ChevronLeft size={14} className="opacity-70" />
            </button>
          )}

          <div
            ref={tabsContainerRef}
            className="flex gap-1 overflow-x-auto flex-1 scrollbar-hide pr-1"
            style={{ scrollBehavior: 'smooth' }}
            onWheel={(e) => {
              e.preventDefault();
              if (tabsContainerRef.current) {
                tabsContainerRef.current.scrollLeft += e.deltaY;
                setTabsScrollPosition(tabsContainerRef.current.scrollLeft);
              }
            }}
          >
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors border ${
                  activeTabId === tab.id
                    ? 'bg-black/5 dark:bg-white/10 border-transparent'
                    : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 border-transparent'
                }`}
                title={tab.title}
              >
                {tab.isLoading && (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
                )}
                <span className="text-[11px] max-w-[140px] truncate opacity-80">{tab.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Close tab"
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {tabs.length > 3 && (
            <button
              onClick={() => scrollTabs('right')}
              className="size-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-xs flex-shrink-0"
              title="Scroll tabs right"
            >
              <ChevronRight size={14} className="opacity-70" />
            </button>
          )}

          <button
            onClick={() => handleNewTab(activeTab?.url || 'about:blank')}
            className="size-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title={`New tab (${tabs.length} open)`}
          >
            <div className="relative">
              <Plus size={14} className="opacity-70" />
              {tabs.length > 1 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                  {tabs.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="size-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title="Back"
          >
            <ChevronLeft size={16} className="opacity-70" />
          </button>
          <button
            onClick={handleForward}
            className="size-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title="Forward"
          >
            <ChevronRight size={16} className="opacity-70" />
          </button>
          <button
            onClick={handleRefresh}
            className="size-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title="Refresh"
          >
            <RotateCcw size={16} className="opacity-70" />
          </button>
          <a
            href={activeTab?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="size-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title="Open in external browser"
          >
            <ExternalLink size={16} className="opacity-70" />
          </a>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            title="Close web viewer"
          >
            <X size={16} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* Content Area - Using Electron webview */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {tabs.map(tab => {
          console.log(`🔗 Rendering webview for tab ${tab.id}, active: ${tab.id === activeTabId}, url: ${tab.url}`);
          return (
          <webview
            key={tab.id}
            ref={(el: any) => { 
              if (el) {
                console.log(`✅ Webview ref set for tab ${tab.id}`);
                webviewRefs.current[tab.id] = el;
              }
            }}
            src={tab.url}
            style={{ 
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: tab.id === activeTabId ? 'flex' : 'none'
            }}
            partition="persist:webview"
            allowpopups="true"
            plugins="true"
            webpreferences="plugins=true"
          />
        );})}
      </div>
    </div>
  );
};

export default TabbedWebViewerElectron;
