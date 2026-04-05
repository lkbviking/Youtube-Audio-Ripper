const path = require('path');
const { app, BrowserWindow } = require('electron');

const { registerIpcHandlers } = require('./ipc');

function getSmokeExitDelayMs() {
  const rawValue = process.env.SMOKE_EXIT_AFTER_READY_MS;

  if (!rawValue) {
    return null;
  }

  const delayMs = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    return null;
  }

  return delayMs;
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#f4efe6',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload', 'preload.js')
    }
  });

  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  const smokeExitDelayMs = getSmokeExitDelayMs();

  if (smokeExitDelayMs !== null) {
    setTimeout(() => {
      app.quit();
    }, smokeExitDelayMs).unref();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
