const { dialog, BrowserWindow, ipcMain } = require('electron');

const { getConfig, setConfig } = require('./services/config-service');
const { DownloadJob } = require('./services/download-job');
const { getVersionStatus } = require('./services/version-check-service');

const activeJobs = new Map();

function sendToRenderer(channel, payload) {
  const window = BrowserWindow.getAllWindows()[0];

  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

function registerIpcHandlers() {
  ipcMain.handle('dialog:pickOutputFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('config:get', async () => getConfig());

  ipcMain.handle('config:set', async (_event, partialConfig) => setConfig(partialConfig));

  ipcMain.handle('app:getVersionStatus', async () => getVersionStatus());

  ipcMain.handle('download:start', async (_event, request) => {
    const job = new DownloadJob(request);

    activeJobs.set(job.id, job);

    job.on('update', (payload) => {
      sendToRenderer('download:update', payload);

      if (['completed', 'failed', 'cancelled'].includes(payload.status)) {
        activeJobs.delete(job.id);
      }
    });

    job.start();

    return { jobId: job.id };
  });

  ipcMain.handle('download:cancel', async (_event, jobId) => {
    const job = activeJobs.get(jobId);

    if (!job) {
      return { cancelled: false, reason: 'Job not found.' };
    }

    job.cancel();
    return { cancelled: true };
  });
}

module.exports = {
  registerIpcHandlers
};
