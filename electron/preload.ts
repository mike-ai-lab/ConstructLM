import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  proxyGroq: (key: string, body: any) => ipcRenderer.invoke('proxy-groq', { key, body }),
  proxyOpenai: (key: string, body: any) => ipcRenderer.invoke('proxy-openai', { key, body })
});
