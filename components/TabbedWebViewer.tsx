import React, { useState, useRef } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';

interface WebTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  blocked?: boolean;
}

interface TabbedWebViewerProps {
  initialUrl: string;
  onClose: () => void;
  onNewTabRequest?: (url: string) => void;
}

const TabbedWebViewer: React.FC<TabbedWebViewerProps> = ({ initialUrl, onClose, onNewTabRequest }) => {
  const [tabs, setTabs] = useState<WebTab[]>(() => {
    // Ensure initial URL has protocol
    let validUrl = initialUrl;
    if (!initialUrl.startsWith('http://') && !initialUrl.startsWith('https://')) {
      validUrl = 'https://' + initialUrl;
    }
    console.log('🚀 TabbedWebViewer initialized with URL:', validUrl);
    return [{ id: Date.now().toString(), url: validUrl, title: new URL(validUrl).hostname, isLoading: true }];
  });
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [tabsScrollPosition, setTabsScrollPosition] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});

  // Log iframe cookie access
  React.useEffect(() => {
    console.log('🔍 TabbedWebViewer: Checking cookie storage capability...');
    console.log('🔍 Third-party cookies enabled:', document.hasStorageAccess ? 'API available' : 'API not available');
    console.log('🔍 Active tabs:', tabs.length);
  }, []); // Only run once on mount

  // Listen for new tab requests
  React.useEffect(() => {
    if (onNewTabRequest) {
      (window as any).__openWebViewerNewTab = (url: string) => {
        handleNewTab(url);
      };
    }
    return () => {
      delete (window as any).__openWebViewerNewTab;
    };
  }, [onNewTabRequest]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const openActiveInNewAppTab = () => {
    if (!activeTab?.url) return;
    window.open(activeTab.url, '_blank', 'noopener,noreferrer');
  };

  const handleNewTab = (url: string) => {
    // Ensure URL has protocol
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validUrl = 'https://' + url;
    }
    
    const newTab: WebTab = {
      id: Date.now().toString(),
      url: validUrl,
      title: new URL(validUrl).hostname,
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
    const iframe = iframeRefs.current[activeTabId];
    if (iframe && activeTab?.url) {
      iframe.src = activeTab.url;
    }
  };

  const handleBack = () => {
    const iframe = iframeRefs.current[activeTabId];
    if (iframe) {
      iframe.contentWindow?.history.back();
    }
  };

  const handleForward = () => {
    const iframe = iframeRefs.current[activeTabId];
    if (iframe) {
      iframe.contentWindow?.history.forward();
    }
  };

  const handleTabLoad = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    console.log(`✅ Tab loaded: ${tabId}, URL: ${tab?.url}`);
    
    const iframe = iframeRefs.current[tabId];
    
    // Check if iframe is blocked by CSP
    try {
      if (iframe && !iframe.contentDocument?.body?.innerHTML) {
        // CSP blocked - no content accessible
        setTimeout(() => {
          if (!iframe.contentDocument?.body?.innerHTML) {
            console.error('❌ Tab blocked by CSP:', tabId);
            setTabs(prev =>
              prev.map(t =>
                t.id === tabId ? { ...t, isLoading: false, blocked: true } : t
              )
            );
            return;
          }
        }, 500);
      }
    } catch (e) {
      // Cross-origin but loaded successfully
    }

    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, isLoading: false } : t
      )
    );

    if (iframe?.contentDocument) {
      try {
        // Hide cookie banners
        const style = iframe.contentDocument.createElement('style');
        style.textContent = `
          [class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"],
          [class*="gdpr"], [id*="gdpr"], .cli-modal-backdrop, #cookie-law-info-bar { display: none !important; }
        `;
        iframe.contentDocument.head.appendChild(style);

        const tab = tabs.find(t => t.id === tabId);
        const title = iframe.contentDocument.title || new URL(tab?.url || '').hostname;
        console.log(`📄 Page title: ${title}`);
        setTabs(prev =>
          prev.map(t =>
            t.id === tabId ? { ...t, title } : t
          )
        );
      } catch (e) {
        console.warn('⚠️ Cross-origin: Cannot access iframe content', e);
      }
    }
  };

  const handleTabError = (tabId: string) => {
    console.error('❌ Tab blocked by CSP:', tabId);
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, isLoading: false, blocked: true } : t
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

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Minimal Top Bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-transparent bg-transparent">
        {/* Tabs: compact, pill, single-line */}
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

      {/* Content Area */}
      <div className="flex-1 h-0 overflow-hidden relative">
        {tabs.map(tab => (
          <React.Fragment key={tab.id}>
            {tab.blocked ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: tab.id === activeTabId ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '32px'
                }}
              >
                <div style={{ fontSize: '14px', opacity: 0.7, textAlign: 'center' }}>
                  {new URL(tab.url).hostname} requires external browsing for security restrictions
                </div>
                <a
                  href={tab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    fontSize: '13px'
                  }}
                >
                  Open in Browser
                </a>
              </div>
            ) : (
              <iframe
                ref={el => { 
                  iframeRefs.current[tab.id] = el;
                  if (el) {
                    console.log(`🔗 Iframe mounted for tab: ${tab.id}, URL: ${tab.url}`);
                    // Force load if src is not set
                    if (!el.src || el.src === 'about:blank') {
                      console.log('⚠️ Forcing iframe src:', tab.url);
                      el.src = tab.url;
                    }
                  }
                }}
                src={tab.url}
                key={tab.url}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: tab.id === activeTabId ? 'block' : 'none',
                  visibility: tab.id === activeTabId ? 'visible' : 'hidden'
                }}
                title={tab.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation allow-modals allow-presentation"
                allow="geolocation; microphone; camera; payment; display-capture; autoplay; encrypted-media; picture-in-picture; clipboard-read; clipboard-write; web-share"
                onLoad={() => handleTabLoad(tab.id)}
                onError={() => handleTabError(tab.id)}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TabbedWebViewer;
