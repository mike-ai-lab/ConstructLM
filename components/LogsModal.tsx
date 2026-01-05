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
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [cachedFiles, setCachedFiles] = useState<string[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Use cached files if available, otherwise load
      if (cachedFiles) {
        setLogFiles(cachedFiles);
        if (cachedFiles.length > 0 && !selectedLog) {
          setSelectedLog(cachedFiles[0]);
          loadLogContent(cachedFiles[0]);
        }
      } else {
        loadLogFiles();
      }
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

  const handleSelectLog = (fileName: string) => {
    setSelectedLog(fileName);
    loadLogContent(fileName);
  };

  const handleCopyLog = async (fileName: string) => {
    try {
      const content = await activityLogger.readLogFile(fileName);
      const markdown = `# Activity Log: ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n`;
      
      // Use Electron clipboard if available
      if ((window as any).electron?.clipboard) {
        (window as any).electron.clipboard.writeText(markdown);
      } else {
        await navigator.clipboard.writeText(markdown);
      }
    } catch (error) {
      console.error('Failed to copy log:', error);
    }
  };

  const handleDownloadLog = async (fileName: string) => {
    try {
      const content = await activityLogger.readLogFile(fileName);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
      element.setAttribute('download', fileName);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
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

  const handleDownloadDiagnosticLogs = () => {
    const logs = diagnosticLogger.getAllLogs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `diagnostic-logs-${timestamp}.txt`;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logs));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
      .filter((entry): entry is typeof entry => entry !== null);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.02)] dark:bg-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#1a1a1a] dark:text-white">Activity Logs</h2>
            <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">({logFiles.length} files)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadDiagnosticLogs}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              title="Download RAG diagnostic logs"
            >
              <Bug size={16} />
              Diagnostic Logs
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
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">{logLines.length} entries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLog(selectedLog)}
                      className="p-2 text-[#4485d1] hover:bg-[rgba(68,133,209,0.1)] rounded-lg transition-colors"
                      title="Copy as Markdown"
                    >
                      <Copy size={18} />
                    </button>
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
                    logLines.reverse().map((entry, idx) => (
                      <div
                        key={idx}
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
                    ))
                  )}
                </div>
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
