import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ContextWarningModalProps {
  totalTokens: number;
  filesUsed: string[];
  selectedCount: number;
  onCancel: () => void;
  onProceed: () => void;
}

const ContextWarningModal: React.FC<ContextWarningModalProps> = ({
  totalTokens,
  filesUsed,
  selectedCount,
  onCancel,
  onProceed
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#222222] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
          <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Large Context Warning</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#666666] dark:text-[#a0a0a0]">Selected sources:</span>
              <span className="font-semibold text-[#1a1a1a] dark:text-white">{selectedCount} files</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666666] dark:text-[#a0a0a0]">Estimated tokens:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">~{Math.round(totalTokens / 1000)}k</span>
            </div>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-orange-800 dark:text-orange-300">
              This is a large amount of context. Processing may be slower and could be more expensive with some models.
            </p>
          </div>

          {filesUsed.length > 0 && filesUsed.length <= 5 && (
            <div>
              <p className="text-xs font-semibold text-[#666666] dark:text-[#a0a0a0] mb-2">Files being used:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {filesUsed.map((fileName, i) => (
                  <div key={i} className="text-xs text-[#1a1a1a] dark:text-white truncate">
                    • {fileName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Send Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextWarningModal;
