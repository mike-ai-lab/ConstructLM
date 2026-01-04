import { ProcessedFile } from '../../types';

export interface UserFolder {
  path: string;
  name: string;
  parentPath: string | null;
}

export interface ContextMenuState {
  x: number;
  y: number;
  fileIds: string[];
  folderPath?: string;
}

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  file?: ProcessedFile;
  children: Record<string, TreeNode>;
}

export type FileViewTab = 'all' | 'folders';
export type ActiveTab = 'files' | 'chats';
