const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');

// Load environment variables after requiring electron
require('dotenv').config();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const storage = require('electron-json-storage');

// Import services from monorepo package
const { obcRagService } = require('@electron-2026/services');

// Set OBC docs path (adjust for your setup)
const OBC_DOCS_PATH = path.join(__dirname, 'assets/obc-docs');
obcRagService.setDocsPath(OBC_DOCS_PATH);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      webSecurity: !isDev,
      allowRunningInsecureContent: isDev,
    },
    show: false,
    icon: path.join(__dirname, 'public/icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

  const sendWindowState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state-changed', {
        isMaximized: mainWindow.isMaximized()
      });
    }
  };

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    setTimeout(sendWindowState, 100);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const { session } = require('electron');
  const ses = session.defaultSession;

  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; " +
          "worker-src 'self' blob: data:; " +
          "child-src 'self' blob: data:; " +
          "img-src 'self' blob: data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' blob: data: https: http:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "script-src-elem 'self' 'unsafe-inline' blob:; " +
          "script-src-attr 'self' 'unsafe-inline';"
        ]
      }
    });
  });

  if (!isDev) {
    protocol.registerFileProtocol('file', (request, callback) => {
      const filePath = request.url.replace('file:///', '');
      callback({ path: path.normalize(filePath) });
    });
  }

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

// IPC for window controls
ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.handle('close-window', () => mainWindow.close());

// IPC for file open
ipcMain.handle('select-pdf-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// ==================== OBC RAG Service IPC Handlers ====================

ipcMain.handle('obc-rag:set-api-key', async (event, apiKey) => {
  return new Promise((resolve) => {
    storage.set('gemini-api-key', apiKey, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('obc-rag:get-api-key', async () => {
  return new Promise((resolve) => {
    storage.get('gemini-api-key', (error, data) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, apiKey: data || null });
      }
    });
  });
});

ipcMain.handle('obc-rag:has-api-key', async () => {
  return new Promise((resolve) => {
    storage.get('gemini-api-key', (error, data) => {
      if (error) {
        resolve({ success: false, hasKey: false });
      } else {
        resolve({ success: true, hasKey: !!data });
      }
    });
  });
});

ipcMain.handle('obc-rag:initialize', async (event, apiKey) => {
  try {
    obcRagService.initialize(apiKey);
    return { success: true, usedEnvConfig: !apiKey };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:setup-store', async () => {
  try {
    const storeName = await obcRagService.setupStaticRagStore();
    return new Promise((resolve) => {
      storage.set('obc-rag-store-name', storeName, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, storeName });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:upload-documents', async (event) => {
  try {
    await obcRagService.uploadOBCDocuments((progress) => {
      mainWindow.webContents.send('obc-rag:upload-progress', progress);
    });
    return new Promise((resolve) => {
      storage.set('obc-rag-initialized', true, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:generate-questions', async () => {
  try {
    const questions = await obcRagService.generateExampleQuestions();
    return { success: true, questions };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:query', async (event, question) => {
  try {
    const result = await obcRagService.query(question);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:get-status', async () => {
  try {
    const status = obcRagService.getStatus();
    const hasEnvConfig = !!(process.env.GEMINI_API_KEY && process.env.FILE_SEARCH_STORE_NAME);

    return new Promise((resolve) => {
      storage.getAll((error, data) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({
            success: true,
            status: {
              ...status,
              isInitialized: data['obc-rag-initialized'] || status.isInitialized || false,
              ragStoreName: data['obc-rag-store-name'] || status.ragStoreName || null,
              hasEnvConfig
            }
          });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obc-rag:delete-store', async () => {
  try {
    await obcRagService.deleteRagStore();
    return new Promise((resolve) => {
      storage.remove('obc-rag-initialized', (error1) => {
        storage.remove('obc-rag-store-name', (error2) => {
          if (error1 || error2) {
            resolve({ success: false, error: (error1 || error2).message });
          } else {
            resolve({ success: true });
          }
        });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});
