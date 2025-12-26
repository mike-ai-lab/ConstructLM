import { contextBridge, ipcRenderer, clipboard } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  proxyGroq: (key: string, body: any) => ipcRenderer.invoke('proxy-groq', { key, body }),
  proxyOpenai: (key: string, body: any) => ipcRenderer.invoke('proxy-openai', { key, body }),
  onStreamChunk: (callback: (data: string) => void) => {
    ipcRenderer.on('stream-chunk', (event, data) => callback(data));
  },
  removeStreamListener: () => {
    ipcRenderer.removeAllListeners('stream-chunk');
  },
  writeLogs: (logContent: string) => ipcRenderer.invoke('write-logs', logContent),
  getLogFiles: () => ipcRenderer.invoke('get-log-files'),
  readLogFile: (fileName: string) => ipcRenderer.invoke('read-log-file', fileName),
  getLogsDirectory: () => ipcRenderer.invoke('get-logs-directory'),
  openPath: (dirPath: string) => ipcRenderer.invoke('open-path', dirPath),
  clipboard: {
    writeText: (text: string) => clipboard.writeText(text)
  }
});
