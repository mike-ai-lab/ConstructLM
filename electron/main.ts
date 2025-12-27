import { app, BrowserWindow, ipcMain, protocol, Menu, shell } from 'electron';
import path from 'path';
import { net } from 'electron';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let logsDir: string;
let currentLogFile: string | null = null;

// Initialize logs directory
function initializeLogsDirectory() {
  logsDir = path.join(app.getPath('userData'), 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    // Create log file for this session
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    currentLogFile = path.join(logsDir, `session-${dateStr}-${timeStr}.log`);
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,  // Enable webview tag for proper cookie handling
      webSecurity: false, // Required for @xenova/transformers
      allowRunningInsecureContent: true // Required for local model loading
    },
    backgroundColor: '#1a1a1a',
    show: false
  });

  // Handle all media permissions for audio input/output
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle permission checks
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      return true;
    }
    return false;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize logs directory first
  initializeLogsDirectory();
  
  // CRITICAL: Enable audio features + transformers support
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
  app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
  app.commandLine.appendSwitch('auto-select-desktop-capture-source', 'Entire screen');
  app.commandLine.appendSwitch('disable-web-security'); // Required for transformers
  app.commandLine.appendSwitch('allow-running-insecure-content'); // Required for local models
  
  // Disable sandbox for audio to work properly in dev mode
  app.commandLine.appendSwitch('no-sandbox');
  
  // Set custom menu
  const template = [
    {
      label: 'ConstructLM',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());

// Proxy handlers for API requests with streaming
ipcMain.handle('proxy-groq', async (event, { key, body }) => {
  try {
    const response = await net.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error?.message || response.statusText 
      };
    }
    
    if (body.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
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
      }
      
      return { ok: true, status: response.status, streaming: true };
    }
    
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('proxy-openai', async (event, { key, body }) => {
  try {
    const response = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error?.message || response.statusText 
      };
    }
    
    if (body.stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
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
      }
      
      return { ok: true, status: response.status, streaming: true };
    }
    
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

// Logging IPC handlers
ipcMain.handle('write-logs', async (event, logContent: string) => {
  try {
    if (!currentLogFile) {
      initializeLogsDirectory();
    }
    
    if (currentLogFile) {
      fs.appendFileSync(currentLogFile, logContent + '\n');
    }
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to write logs:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('get-log-files', async (event) => {
  try {
    if (!logsDir) {
      initializeLogsDirectory();
    }
    
    if (!fs.existsSync(logsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('session-') && file.endsWith('.log'))
      .sort()
      .reverse();
    
    return files;
  } catch (error: any) {
    console.error('Failed to get log files:', error);
    return [];
  }
});

ipcMain.handle('read-log-file', async (event, fileName: string) => {
  try {
    if (!logsDir) {
      initializeLogsDirectory();
    }
    
    const filePath = path.join(logsDir, fileName);
    
    // Security: ensure the file is within the logs directory
    if (!filePath.startsWith(logsDir)) {
      throw new Error('Invalid log file path');
    }
    
    if (!fs.existsSync(filePath)) {
      return '';
    }
    
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error: any) {
    console.error('Failed to read log file:', error);
    return '';
  }
});

ipcMain.handle('get-logs-directory', async (event) => {
  try {
    if (!logsDir) {
      initializeLogsDirectory();
    }
    return logsDir;
  } catch (error: any) {
    console.error('Failed to get logs directory:', error);
    return '';
  }
});

ipcMain.handle('open-path', async (event, dirPath: string) => {
  try {
    shell.openPath(dirPath);
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to open path:', error);
    return { ok: false, error: error.message };
  }
});
