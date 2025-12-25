import { app, BrowserWindow, ipcMain, protocol, Menu, shell } from 'electron';
import path from 'path';
import { net } from 'electron';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let logsDir: string;

// Initialize logs directory
function initializeLogsDirectory() {
  logsDir = path.join(app.getPath('userData'), 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
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
      sandbox: false
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
  // CRITICAL: Enable audio features
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
  app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
  app.commandLine.appendSwitch('auto-select-desktop-capture-source', 'Entire screen');
  
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

// Proxy handlers for API requests
ipcMain.handle('proxy-groq', async (event, { key, body }) => {
  try {
    // Force non-streaming for Electron to avoid complexity
    const requestBody = { ...body, stream: false };
    
    const response = await net.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error?.message || response.statusText 
      };
    }
    
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('proxy-openai', async (event, { key, body }) => {
  try {
    // Force non-streaming for Electron to avoid complexity
    const requestBody = { ...body, stream: false };
    
    const response = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error?.message || response.statusText 
      };
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
    if (!logsDir) {
      initializeLogsDirectory();
    }
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logsDir, `activity-${dateStr}.log`);
    
    fs.appendFileSync(logFile, logContent + '\n');
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
      .filter(file => file.startsWith('activity-') && file.endsWith('.log'))
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
