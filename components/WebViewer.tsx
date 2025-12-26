import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface WebViewerProps {
  url: string;
  onClose: () => void;
}

const WebViewer: React.FC<WebViewerProps> = ({ url, onClose }) => {
  return (
    <div className="h-full flex flex-col bg-[#f9f9f9] dark:bg-[#2a2a2a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-white dark:bg-[#222222]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{new URL(url).hostname}</span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            title="Open in external browser"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#eaeaea] dark:hover:bg-[#333333] rounded transition-colors"
          title="Close web viewer"
        >
          <X size={18} className="text-[#666666] dark:text-[#a0a0a0]" />
        </button>
      </div>
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title="Web content"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"
        allow="geolocation; microphone; camera; payment"
      />
    </div>
  );
};

export default WebViewer;
