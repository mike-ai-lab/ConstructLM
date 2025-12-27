import React, { useState, useEffect } from 'react';
import { X, Folder, File, ChevronRight, ChevronDown, Download, Search, GitBranch, Star, GitFork, ExternalLink, Loader2, CheckSquare, Square, FileCode } from 'lucide-react';
import { githubService, GitHubRepo, GitHubFile } from '../services/githubService';

interface GitHubBrowserProps {
  initialUrl?: string;
  onClose: () => void;
  onImportFiles: (files: { name: string; content: string; path: string }[]) => void;
}

const GitHubBrowser: React.FC<GitHubBrowserProps> = ({ initialUrl, onClose, onImportFiles }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [repoInfo, setRepoInfo] = useState<any>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (initialUrl) {
      handleLoadRepo(initialUrl);
    }
  }, [initialUrl]);

  const handleLoadRepo = async (repoUrl: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const parsedRepo = githubService.parseGitHubUrl(repoUrl);
      if (!parsedRepo) {
        setError('Invalid GitHub URL. Please enter a valid repository URL.');
        setLoading(false);
        return;
      }
      
      setRepo(parsedRepo);
      
      // Fetch repo info
      const info = await githubService.fetchRepoInfo(parsedRepo);
      setRepoInfo(info);
      
      // Fetch branches
      const branchList = await githubService.fetchBranches(parsedRepo);
      setBranches(branchList);
      
      // Fetch root files
      const rootFiles = await githubService.fetchRepoTree(parsedRepo);
      setFiles(rootFiles);
      setCurrentPath('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToDir = async (file: GitHubFile) => {
    if (file.type !== 'dir' || !repo) return;
    
    setLoading(true);
    try {
      const dirFiles = await githubService.fetchRepoTree(repo, file.path);
      setFiles(dirFiles);
      setCurrentPath(file.path);
      setExpandedDirs(prev => new Set([...prev, file.path]));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = async () => {
    if (!repo || !currentPath) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    
    setLoading(true);
    try {
      const parentFiles = await githubService.fetchRepoTree(repo, parentPath);
      setFiles(parentFiles);
      setCurrentPath(parentPath);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0 || !repo) return;
    
    setImporting(true);
    try {
      const filesToImport = files.filter(f => selectedFiles.has(f.path) && f.type === 'file');
      const contents = await githubService.fetchMultipleFiles(filesToImport);
      
      const importedFiles = contents.map(c => ({
        name: c.path.split('/').pop() || c.path,
        content: c.content,
        path: c.path
      }));
      
      onImportFiles(importedFiles);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import files');
    } finally {
      setImporting(false);
    }
  };

  const handleQuickImport = async (type: 'readme' | 'important') => {
    if (!repo) return;
    
    setImporting(true);
    try {
      if (type === 'readme') {
        const readme = await githubService.fetchReadme(repo);
        if (readme) {
          onImportFiles([{ name: 'README.md', content: readme, path: 'README.md' }]);
          onClose();
        } else {
          setError('README not found');
        }
      } else {
        const importantFiles = await githubService.getImportantFiles(repo);
        const contents = await githubService.fetchMultipleFiles(importantFiles);
        const imported = contents.map(c => ({
          name: c.path.split('/').pop() || c.path,
          content: c.content,
          path: c.path
        }));
        onImportFiles(imported);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  const handleBranchChange = async (branch: string) => {
    if (!repo) return;
    const newRepo = { ...repo, branch };
    setRepo(newRepo);
    handleLoadRepo(newRepo.url);
  };

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[rgba(68,133,209,0.1)] text-[#4485d1] rounded-lg">
            <FileCode size={16} />
          </div>
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">GitHub Repository Browser</h2>
        </div>
      </div>

        {/* URL Input */}
        <div className="p-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadRepo(url)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4485d1]"
            />
            <button
              onClick={() => handleLoadRepo(url)}
              disabled={loading || !url}
              className="px-4 py-2 bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1] disabled:opacity-50 text-sm font-medium"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Load'}
            </button>
          </div>
        </div>

        {/* Repo Info */}
        {repoInfo && (
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href={repoInfo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#4485d1] hover:underline flex items-center gap-1">
                  {repoInfo.full_name}
                  <ExternalLink size={12} />
                </a>
                <div className="flex items-center gap-3 text-xs text-[#666666] dark:text-[#a0a0a0]">
                  <span className="flex items-center gap-1"><Star size={12} /> {repoInfo.stargazers_count}</span>
                  <span className="flex items-center gap-1"><GitFork size={12} /> {repoInfo.forks_count}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={repo?.branch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="px-2 py-1 text-xs bg-white dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded"
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={() => handleQuickImport('readme')} className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded">
                  Import README
                </button>
                <button onClick={() => handleQuickImport('important')} className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded">
                  Import Config Files
                </button>
              </div>
            </div>
            {repoInfo.description && (
              <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">{repoInfo.description}</p>
            )}
          </div>
        )}

        {/* Search & Navigation */}
        {repo && (
          <div className="px-4 py-2 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center gap-2">
            {currentPath && (
              <button onClick={handleGoBack} className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded">
                ← Back
              </button>
            )}
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a0a0a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded focus:outline-none focus:ring-1 focus:ring-[#4485d1]"
              />
            </div>
            <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">
              {selectedFiles.size} selected
            </span>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {loading && !files.length ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-[#4485d1]" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-lg cursor-pointer group"
                  onClick={() => file.type === 'dir' ? handleNavigateToDir(file) : handleToggleFile(file.path)}
                >
                  {file.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFile(file.path);
                      }}
                      className="flex-shrink-0"
                    >
                      {selectedFiles.has(file.path) ? (
                        <CheckSquare size={16} className="text-[#4485d1]" />
                      ) : (
                        <Square size={16} className="text-[#a0a0a0]" />
                      )}
                    </button>
                  )}
                  {file.type === 'dir' ? (
                    <Folder size={16} className="text-[#4485d1] flex-shrink-0" />
                  ) : (
                    <File size={16} className="text-[#666666] dark:text-[#a0a0a0] flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-[#1a1a1a] dark:text-white truncate">{file.name}</span>
                  {file.type === 'dir' && (
                    <ChevronRight size={16} className="text-[#a0a0a0] flex-shrink-0" />
                  )}
                  {file.size && (
                    <span className="text-xs text-[#a0a0a0] flex-shrink-0">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex justify-between items-center">
          <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">
            Select files to import into your workspace
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedFiles.size === 0 || importing}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#4485d1] hover:bg-[#3674c1] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {importing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download size={12} />
                  Import {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
    </div>
  );
};

export default GitHubBrowser;
