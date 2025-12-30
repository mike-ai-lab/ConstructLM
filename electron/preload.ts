import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  proxyGroq: (apiKey: string, requestBody: any) => ipcRenderer.invoke('proxy-groq', apiKey, requestBody),
  proxyOpenai: (apiKey: string, requestBody: any) => ipcRenderer.invoke('proxy-openai', apiKey, requestBody),
  onStreamChunk: (callback: (data: string) => void) => {
    ipcRenderer.on('stream-chunk', (_, data) => callback(data));
  },
  removeStreamListener: () => {
    ipcRenderer.removeAllListeners('stream-chunk');
  }
});
