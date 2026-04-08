import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, ChevronDown, ChevronUp, Loader2, FolderOpen, Copy, Bug } from 'lucide-react';
import { activityLogger } from '../services/activityLogger';
import { diagnosticLogger } from '../services/diagnosticLogger';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true); // Start with true
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [cachedFiles, setCachedFiles] = useState<string[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const ENTRIES_PER_PAGE = 50;
  
  let copyMenuTimeout: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (isOpen) {
      // Use cached files if available
      if (cachedFiles) {
        setLogFiles(cachedFiles);
        setLoadingFiles(false);
        if (cachedFiles.length > 0 && !selectedLog) {
          setSelectedLog(cachedFiles[0]);
          loadLogContent(cachedFiles[0]);
        }
      } else {
        setLoadingFiles(true);
      }
      // Load files async without blocking
      setTimeout(() => loadLogFiles(), 0);
    }
  }, [isOpen]);

  const loadLogFiles = async () => {
    setLoadingFiles(true);
    try {
      const files = await activityLogger.getLogFiles();
      const sortedFiles = files.sort((a, b) => b.localeCompare(a));
      setLogFiles(sortedFiles);
      setCachedFiles(sortedFiles); // Cache for next open
      if (sortedFiles.length > 0 && !selectedLog) {
        setSelectedLog(sortedFiles[0]);
        loadLogContent(sortedFiles[0]);
      }
    } catch (error) {
      console.error('Failed to load log files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadLogContent = async (fileName: string) => {
    setLoading(true);
    try {
      const content = await activityLogger.readLogFile(fileName);
      setLogContent(content);
    } catch (error) {
      console.error('Failed to load log content:', error);
      setLogContent('Failed to load log file');
    } finally {
      setLoading(false);
    }
  };



  const handleCopyLog = async (fileName: string, mode: 'all' | 'last-chat' = 'all') => {
    try {
      const content = await activityLogger.readLogFile(fileName);
      const lines = parseLogLines(content);
      
      let contentToCopy = '';
      
      if (mode === 'last-chat') {
        // Find the last NEW_SESSION marker and get entries after it
        let lastSessionIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].category.includes('NEW_SESSION') || lines[i].message.includes('STARTING NEW LOG SESSION')) {
            lastSessionIndex = i;
            break;
          }
        }
        
        const lastChatEntries = lastSessionIndex >= 0 ? lines.slice(lastSessionIndex) : lines;
        // Reverse to match display order (newest first)
        contentToCopy = lastChatEntries
          .map(entry => `[${entry.time}] [${entry.level}] [${entry.category}] ${entry.message}`)
          .join('\n');
      } else {
        // lines are already reversed (newest first), just format them
        contentToCopy = lines
          .map(entry => `[${entry.time}] [${entry.level}] [${entry.category}] ${entry.message}`)
          .join('\n');
      }
      
      const markdown = `# Activity Log: ${fileName}${mode === 'last-chat' ? ' (Last Chat Session)' : ''}\n\n\`\`\`\n${contentToCopy}\n\`\`\`\n`;
      
      // Use Electron clipboard if available
      if ((window as any).electron?.clipboard) {
        (window as any).electron.clipboard.writeText(markdown);
      } else {
        await navigator.clipboard.writeText(markdown);
      }
      
      // Show success feedback
      setCopySuccess(true);
      setShowCopyMenu(false);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy log:', error);
    }
  };

  const handleDownloadLog = async (fileName: string) => {
    try {
      const content = await activityLogger.readLogFile(fileName);
      
      if (!content || content.trim().length === 0) {
        console.error('Log file is empty');
        return;
      }
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', fileName);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download log:', error);
    }
  };

  const handleOpenLogsFolder = async () => {
    try {
      const logsDir = await activityLogger.getLogsDirectory();
      if (typeof window !== 'undefined' && (window as any).electron) {
        (window as any).electron.openPath(logsDir);
      } else {
        // Fallback for non-Electron environments
        console.log('Logs directory:', logsDir);
      }
    } catch (error) {
      console.error('Failed to open logs folder:', error);
    }
  };

  const handleClearAllLogs = async () => {
    try {
      await activityLogger.clearAllLogs();
      setLogFiles([]);
      setSelectedLog(null);
      setLogContent('');
      setCachedFiles(null);
      setCurrentPage(1);
      
      // Show success feedback
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 2000);
      
      await loadLogFiles();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleSelectLog = (fileName: string) => {
    setSelectedLog(fileName);
    setCurrentPage(1);
    loadLogContent(fileName);
  };

  const handleDownloadDiagnosticLogs = () => {
    const logs = diagnosticLogger.getAllLogs();
    
    if (!logs || logs.trim().length === 0) {
      console.error('Diagnostic logs are empty');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `diagnostic-logs-${timestamp}.txt`;
    
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const toggleLogExpanded = (fileName: string) => {
    const next = new Set(expandedLogs);
    if (next.has(fileName)) {
      next.delete(fileName);
    } else {
      next.add(fileName);
    }
    setExpandedLogs(next);
  };

  const parseLogLines = (content: string): Array<{ level: string; category: string; message: string; time: string }> => {
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)/);
        if (match) {
          return {
            time: match[1],
            level: match[2],
            category: match[3],
            message: match[4]
          };
        }
        return null;
      })
      .filter((entry): entry is typeof entry => entry !== null)
      .reverse(); // Newest first
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'ACTION':
        return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500';
      case 'INFO':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
      case 'WARNING':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500';
      case 'ERROR':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-l-4 border-gray-500';
    }
  };

  const getLevelTextColor = (level: string): string => {
    switch (level) {
      case 'ACTION':
        return 'text-blue-700 dark:text-blue-400';
      case 'INFO':
        return 'text-green-700 dark:text-green-400';
      case 'WARNING':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'ERROR':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  if (!isOpen) return null;

  const logLines = parseLogLines(logContent);
  const totalPages = Math.ceil(logLines.length / ENTRIES_PER_PAGE);
  const startIdx = (currentPage - 1) * ENTRIES_PER_PAGE;
  const endIdx = startIdx + ENTRIES_PER_PAGE;
  const paginatedLogs = logLines.slice(startIdx, endIdx);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[80vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.02)] dark:bg-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#1a1a1a] dark:text-white">Activity Logs</h2>
            <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">({logFiles.length} files)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllLogs}
              className={`p-2 rounded-lg transition-all ${
                clearSuccess 
                  ? 'bg-red-500 text-white' 
                  : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'
              }`}
              title="Clear all logs"
            >
              <Trash2 size={18} className={clearSuccess ? 'animate-pulse' : ''} />
            </button>
            <button
              onClick={handleDownloadDiagnosticLogs}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              title="Download RAG diagnostic logs"
            >
              <Bug size={16} />
              Diagnostic
            </button>
            <button
              onClick={handleOpenLogsFolder}
              className="p-2 text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded-lg transition-colors"
              title="Open logs folder"
            >
              <FolderOpen size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Log Files List */}
          <div className="w-64 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-y-auto bg-[rgba(0,0,0,0.02)] dark:bg-[#2a2a2a]">
            <div className="p-3 space-y-1">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-[#4485d1]" size={24} />
                </div>
              ) : logFiles.length === 0 ? (
                <div className="text-center py-8 text-[#666666] dark:text-[#a0a0a0]">
                  <p className="text-sm">No logs yet</p>
                </div>
              ) : (
                logFiles.map(fileName => (
                  <div key={fileName}>
                    <div
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        selectedLog === fileName
                          ? 'bg-blue-600 text-white'
                          : 'text-[#1a1a1a] dark:text-white hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'
                      }`}
                    >
                      <span onClick={() => handleSelectLog(fileName)} className="text-sm font-medium truncate flex-1">{fileName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLogExpanded(fileName);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        {expandedLogs.has(fileName) ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>
                    </div>

                    {expandedLogs.has(fileName) && (
                      <div className="px-3 py-2 space-y-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]">
                        <button
                          onClick={() => handleDownloadLog(fileName)}
                          className="w-full text-left px-2 py-1.5 text-xs text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded transition-colors flex items-center gap-2"
                        >
                          <Download size={12} />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Content - Log Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedLog ? (
              <>
                <div className="px-6 py-3 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.02)] dark:bg-[#2a2a2a] flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a] dark:text-white">{selectedLog}</h3>
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">
                      {logLines.length} entries • Page {currentPage} of {totalPages || 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="relative"
                      onMouseEnter={() => {
                        if (copyMenuTimeout) clearTimeout(copyMenuTimeout);
                        setShowCopyMenu(true);
                      }}
                      onMouseLeave={() => {
                        copyMenuTimeout = setTimeout(() => setShowCopyMenu(false), 300);
                      }}
                    >
                      <button
                        className={`p-2 rounded-lg transition-all ${
                          copySuccess 
                            ? 'bg-green-500 text-white' 
                            : 'text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)]'
                        }`}
                        title="Copy options"
                      >
                        <Copy size={18} className={copySuccess ? 'animate-pulse' : ''} />
                      </button>
                      
                      {showCopyMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.1)] py-1 z-10">
                          <button
                            onClick={() => handleCopyLog(selectedLog, 'all')}
                            className="w-full text-left px-4 py-2 text-sm text-[#1a1a1a] dark:text-white hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#333333] transition-colors"
                          >
                            Copy All Logs
                          </button>
                          <button
                            onClick={() => handleCopyLog(selectedLog, 'last-chat')}
                            className="w-full text-left px-4 py-2 text-sm text-[#1a1a1a] dark:text-white hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#333333] transition-colors"
                          >
                            Copy Last Chat Only
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadLog(selectedLog)}
                      className="p-2 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors"
                      title="Download log"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin text-[#4485d1]" size={32} />
                    </div>
                  ) : logLines.length === 0 ? (
                    <div className="text-center py-12 text-[#666666] dark:text-[#a0a0a0]">
                      <p className="text-sm">No log entries</p>
                    </div>
                  ) : (
                    paginatedLogs.map((entry, idx) => {
                      const isNewSession = entry.category.includes('NEW_SESSION') || entry.message.includes('STARTING NEW LOG SESSION');
                      return (
                        <React.Fragment key={startIdx + idx}>
                          {isNewSession && idx > 0 && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2">NEW CHAT SESSION</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-blue-500 via-transparent to-transparent"></div>
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-lg transition-colors ${getLevelColor(entry.level)}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold ${getLevelTextColor(entry.level)}`}>
                                    {entry.level}
                                  </span>
                                  <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded">
                                    {entry.category}
                                  </span>
                                  <span className="text-xs text-[#666666] dark:text-[#a0a0a0] ml-auto">
                                    {new Date(entry.time).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-[#1a1a1a] dark:text-white break-words">{entry.message}</p>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls */}
                {logLines.length > ENTRIES_PER_PAGE && (
                  <div className="px-6 py-3 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.02)] dark:bg-[#2a2a2a] flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-[#1a1a1a] dark:text-white bg-[rgba(0,0,0,0.05)] dark:bg-[#222222] hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[#333333] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-[#1a1a1a] dark:text-white bg-[rgba(0,0,0,0.05)] dark:bg-[#222222] hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[#333333] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#666666] dark:text-[#a0a0a0]">
                <p className="text-sm">Select a log file to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
