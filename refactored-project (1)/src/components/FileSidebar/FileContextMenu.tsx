import React from 'react';
import { createPortal } from 'react-dom';
import { Network, Scissors, BookOpen, Download, Edit2, Trash2, FolderPlus } from 'lucide-react';
import { ContextMenuState } from './types';
import { ProcessedFile } from '../../types';

interface FileContextMenuProps {
  context: ContextMenuState | null;
  files: ProcessedFile[];
  onClose: () => void;
  onGenerateMindMap?: (id: string) => void;
  onCut: (ids: string[]) => void;
  onPreview: (id: string) => void;
  onDownload: (file: ProcessedFile) => void;
  onRename: (id: string, isFolder: boolean) => void;
  onDelete: (ids: string[]) => void;
  onPaste: (targetFolder: string | null) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onDeleteFolder: (path: string) => void;
  hasCutFiles: boolean;
  cutFilesCount: number;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  context,
  files,
  onClose,
  onGenerateMindMap,
  onCut,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onPaste,
  onCreateFolder,
  onDeleteFolder,
  hasCutFiles,
  cutFilesCount
}) => {
  if (!context) return null;

  return createPortal(
    <div
      className="fixed bg-white dark:bg-[#222222] rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] py-1 min-w-[180px] max-h-[400px] overflow-y-auto z-[99999]"
      style={{
        left: `${context.x}px`,
        top: `${context.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {context.fileIds.length > 0 ? (
        <>
          {onGenerateMindMap && context.fileIds.length === 1 && (
            <button
              onClick={() => { onGenerateMindMap(context.fileIds[0]); onClose(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
            >
              <Network size={14} className="text-purple-500" />
              Generate Mind Map
            </button>
          )}
          <button
            onClick={() => { onCut(context.fileIds); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
          >
            <Scissors size={14} className="text-blue-500" />
            Cut
          </button>
          {context.fileIds.length === 1 && (
            <>
              <button
                onClick={() => { onPreview(context.fileIds[0]); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <BookOpen size={14} className="text-blue-500" />
                Preview
              </button>
              <button
                onClick={() => {
                  const file = files.find(f => f.id === context.fileIds[0]);
                  if (file?.fileHandle) onDownload(file);
                  onClose();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <Download size={14} className="text-green-500" />
                Download
              </button>
              <button
                onClick={() => { onRename(context.fileIds[0], false); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <Edit2 size={14} className="text-orange-500" />
                Rename
              </button>
            </>
          )}
          <button
            onClick={() => { onDelete(context.fileIds); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2 text-red-600"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </>
      ) : context.folderPath !== undefined && (
        <>
          {hasCutFiles && (
            <button
              onClick={() => { onPaste(context.folderPath || null); onClose(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
            >
              <Download size={14} className="text-blue-500" style={{ transform: 'rotate(180deg)' }} />
              Paste ({cutFilesCount})
            </button>
          )}
          <button
            onClick={() => { onCreateFolder(context.folderPath || null); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
          >
            <FolderPlus size={14} className="text-blue-500" />
            New Folder
          </button>
          {context.folderPath && (
            <>
              <button
                onClick={() => { onRename(context.folderPath!, true); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2"
              >
                <Edit2 size={14} className="text-orange-500" />
                Rename
              </button>
              <button
                onClick={() => { onDeleteFolder(context.folderPath!); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] flex items-center gap-2 text-red-600"
              >
                <Trash2 size={14} />
                Delete Folder
              </button>
            </>
          )}
        </>
      )}
    </div>,
    document.body
  );
};

export default FileContextMenu;
