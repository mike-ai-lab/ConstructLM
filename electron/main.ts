import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import https from 'https';

let mainWindow: BrowserWindow | null = null;

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
    mainWindow.loadURL('http://localhost:5173');
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
      if (requestBody.stream) {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr !== '[DONE]') {
                event.sender.send('stream-chunk', dataStr);
              }
            }
          }
        });
        
        res.on('end', () => {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, streaming: true });
        });
        
        res.on('error', (error) => {
          resolve({ ok: false, status: res.statusCode, error: error.message });
        });
      } else {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ ok: res.statusCode === 200, status: res.statusCode, data });
          } catch (e) {
            resolve({ ok: false, status: res.statusCode, error: body });
          }
        });
      }
    });
    
    req.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
    
    req.write(data);
    req.end();
  });
}
