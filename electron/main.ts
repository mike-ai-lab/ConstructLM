import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import https from 'https';

let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5175');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (error) => {
  mainWindow?.webContents.send('update-error', error.message);
});

// IPC Handlers for updates
ipcMain.handle('check-for-updates', async () => {
  if (process.env.NODE_ENV === 'development') {
    return { available: false, message: 'Updates disabled in development' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: true, info: result?.updateInfo };
  } catch (error: any) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// IPC Handlers for API proxying
ipcMain.handle('proxy-groq', async (event, apiKey, requestBody) => {
  return proxyRequest('https://api.groq.com/openai/v1/chat/completions', apiKey, requestBody, event);
});

ipcMain.handle('proxy-openai', async (event, apiKey, requestBody) => {
  return proxyRequest('https://api.openai.com/v1/chat/completions', apiKey, requestBody, event);
});

function proxyRequest(url: string, apiKey: string, requestBody: any, event: Electron.IpcMainInvokeEvent) {
  return new Promise((resolve) => {
    const data = JSON.stringify(requestBody);
    const urlObj = new URL(url);
    
    console.log(`[Electron Proxy] Request size: ${Buffer.byteLength(data, 'utf8')} bytes`);
    console.log(`[Electron Proxy] Streaming: ${requestBody.stream}`);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };
    
    const req = https.request(options, (res) => {
      console.log(`[Electron Proxy] Response status: ${res.statusCode}`);
      
      if (requestBody.stream) {
        let buffer = '';
        let chunkCount = 0;
        let lastChunkTime = Date.now();
        
        res.on('data', (chunk) => {
          lastChunkTime = Date.now();
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr !== '[DONE]') {
                chunkCount++;
                console.log(`[Electron Proxy] Sending chunk ${chunkCount}: ${dataStr.substring(0, 100)}...`);
                // Send immediately to ensure no loss
                event.sender.send('stream-chunk', dataStr);
              }
            }
          }
        });
        
        res.on('end', () => {
          // Handle any remaining data in buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr !== '[DONE]') {
                chunkCount++;
                console.log(`[Electron Proxy] Sending final chunk ${chunkCount}: ${dataStr.substring(0, 100)}...`);
                event.sender.send('stream-chunk', dataStr);
              }
            }
          }
          
          console.log(`[Electron Proxy] Stream ended. Total chunks sent: ${chunkCount}`);
          if (chunkCount === 0) {
            console.error('[Electron Proxy] ERROR: No chunks received from API');
            resolve({ ok: false, status: res.statusCode, error: 'Empty response from API' });
          } else {
            resolve({ ok: res.statusCode === 200, status: res.statusCode, streaming: true });
          }
        });
        
        res.on('error', (error) => {
          console.error(`[Electron Proxy] Stream error:`, error);
          resolve({ ok: false, status: res.statusCode, error: error.message });
        });
      } else {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(body);
            console.log(`[Electron Proxy] Non-streaming response received: ${body.substring(0, 200)}...`);
            resolve({ ok: res.statusCode === 200, status: res.statusCode, data: parsedData });
          } catch (e) {
            console.error('[Electron Proxy] Failed to parse response:', e);
            resolve({ ok: false, status: res.statusCode, error: body });
          }
        });
      }
    });
    
    req.on('error', (error) => {
      console.error(`[Electron Proxy] Request error:`, error);
      resolve({ ok: false, error: error.message });
    });
    
    req.write(data);
    req.end();
  });
}
