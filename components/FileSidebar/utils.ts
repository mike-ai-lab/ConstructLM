import React from 'react';
import { ProcessedFile } from '../../types';
import { TreeNode, UserFolder } from './types';
import { FileText, FileSpreadsheet, Image, File as FileIcon } from 'lucide-react';

export const removeFolderHelper = (
  folderPath: string,
  files: ProcessedFile[],
  onRemove: (id: string) => void
) => {
  files
    .filter(f => f.userFolder === folderPath || f.userFolder?.startsWith(folderPath + '/'))
    .forEach(f => onRemove(f.id));
};

export const buildFileTree = (files: ProcessedFile[]) => {
  const root: Record<string, TreeNode> = {};

  files.forEach(file => {
    const path = file.path || file.name;
    const parts = path.split('/');
    
    if (parts.length === 1) return;
    
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          type: isLast ? 'file' : 'folder',
          path: currentPath,
          file: isLast ? file : undefined,
          children: {}
        };
      }
      
      if (!isLast) {
        currentLevel = currentLevel[part].children;
      }
    });
  });
  return root;
};

export const getIcon = (file: ProcessedFile) => {
  switch (file.type) {
    case 'pdf': return React.createElement(FileText, { size: 14, className: "text-rose-500" });
    case 'excel': return React.createElement(FileSpreadsheet, { size: 14, className: "text-emerald-600" });
    case 'image': return React.createElement(Image, { size: 14, className: "text-purple-500" });
    case 'document': return React.createElement(FileText, { size: 14, className: "text-blue-500" });
    default: return React.createElement(FileIcon, { size: 14, className: "text-slate-500" });
  }
};

export const getVisibleFileIds = (
  viewTab: 'all' | 'folders',
  files: ProcessedFile[],
  userFolders: UserFolder[],
  expandedFolders: Set<string>,
  fileTree: Record<string, TreeNode>
): string[] => {
  const visibleIds: string[] = [];

  if (viewTab === 'folders') {
    const traverse = (nodes: Record<string, TreeNode>) => {
      const sortedNodes = Object.values(nodes).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const node of sortedNodes) {
        if (node.type === 'file' && node.file) {
          visibleIds.push(node.file.id);
        } else if (node.type === 'folder' && expandedFolders.has(node.path)) {
          traverse(node.children);
        }
      }
    };
    traverse(fileTree);
  } else {
    const rootFolders = userFolders.filter(f => !f.parentPath);
    const getFilesIn = (path: string) => files.filter(f => f.userFolder === path);

    rootFolders.forEach(folder => {
      if (expandedFolders.has(folder.path)) {
        getFilesIn(folder.path).forEach(f => visibleIds.push(f.id));
      }
    });

    const standalone = files.filter(f => {
      const path = f.path || f.name;
      return !path.includes('/') && !f.userFolder;
    });
    standalone.forEach(f => visibleIds.push(f.id));
  }

  return visibleIds;
};

export const sanitizeHtml = (text: string): string => {
  return text.replace(/[<>"'&]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;'
  }[c] || c));
};
