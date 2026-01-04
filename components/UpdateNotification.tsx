import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
}

const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(window as any).electron) return;

    const electron = (window as any).electron;

    electron.onUpdateAvailable?.((info: any) => {
      setUpdateAvailable(true);
      setUpdateInfo({ version: info.version, releaseDate: info.releaseDate });
    });

    electron.onDownloadProgress?.((progress: any) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    electron.onUpdateDownloaded?.((info: any) => {
      setDownloading(false);
      setReadyToInstall(true);
    });

    electron.onUpdateError?.((err: string) => {
      setError(err);
      setDownloading(false);
    });
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    await (window as any).electron.downloadUpdate();
  };

  const handleInstall = () => {
    (window as any).electron.installUpdate();
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setReadyToInstall(false);
    setError(null);
  };

  if (!updateAvailable && !readyToInstall) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-80 bg-white dark:bg-[#222222] rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.1)] overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {readyToInstall ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <Download size={20} className="text-[#4485d1]" />
            )}
            <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white">
              {readyToInstall ? 'Update Ready!' : 'Update Available'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <X size={14} className="text-[#666666] dark:text-[#a0a0a0]" />
          </button>
        </div>

        {updateInfo && (
          <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-3">
            Version {updateInfo.version} is available
          </p>
        )}

        {error && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {downloading && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-[#666666] dark:text-[#a0a0a0] mb-1">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-[rgba(0,0,0,0.06)] dark:bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4485d1] transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {readyToInstall ? (
            <button
              onClick={handleInstall}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              Install & Restart
            </button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 px-3 py-2 bg-[#4485d1] hover:bg-[#3674c1] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Download size={12} />
              {downloading ? 'Downloading...' : 'Download Update'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
