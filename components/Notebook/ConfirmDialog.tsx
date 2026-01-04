import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200000]" onClick={onCancel}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl p-6 min-w-[400px] max-w-md border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
            <AlertTriangle size={24} className={variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-[#666666] dark:text-[#a0a0a0]">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
