import { contextBridge, ipcRenderer } from 'electron';

let streamChunkCallback: ((data: string) => void) | null = null;

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  proxyGroq: (apiKey: string, requestBody: any) => ipcRenderer.invoke('proxy-groq', apiKey, requestBody),
  proxyOpenai: (apiKey: string, requestBody: any) => ipcRenderer.invoke('proxy-openai', apiKey, requestBody),
  onStreamChunk: (callback: (data: string) => void) => {
    // Remove any existing listener first
    ipcRenderer.removeAllListeners('stream-chunk');
    
    // Store the callback and set up the listener
    streamChunkCallback = callback;
    ipcRenderer.on('stream-chunk', (_, data) => {
      if (streamChunkCallback) {
        streamChunkCallback(data);
      }
    });
  },
  removeStreamListener: () => {
    streamChunkCallback = null;
    ipcRenderer.removeAllListeners('stream-chunk');
  },
  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info));
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', () => callback());
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error));
  }
});
