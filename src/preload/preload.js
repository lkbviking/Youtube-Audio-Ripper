const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('youtubeAudioRipper', {
  pickOutputFolder: () => ipcRenderer.invoke('dialog:pickOutputFolder'),
  getUpdateStatus: () => ipcRenderer.invoke('app:getUpdateStatus'),
  applyUpdate: () => ipcRenderer.invoke('app:applyUpdate'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (partialConfig) => ipcRenderer.invoke('config:set', partialConfig),
  startDownload: (request) => ipcRenderer.invoke('download:start', request),
  cancelDownload: (jobId) => ipcRenderer.invoke('download:cancel', jobId),
  onUpdateStatus: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('app:updateStatus', wrapped);

    return () => {
      ipcRenderer.removeListener('app:updateStatus', wrapped);
    };
  },
  onDownloadUpdate: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('download:update', wrapped);

    return () => {
      ipcRenderer.removeListener('download:update', wrapped);
    };
  }
});
