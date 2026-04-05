const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('youtubeAudioRipper', {
  pickOutputFolder: () => ipcRenderer.invoke('dialog:pickOutputFolder'),
  getVersionStatus: () => ipcRenderer.invoke('app:getVersionStatus'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (partialConfig) => ipcRenderer.invoke('config:set', partialConfig),
  startDownload: (request) => ipcRenderer.invoke('download:start', request),
  cancelDownload: (jobId) => ipcRenderer.invoke('download:cancel', jobId),
  onDownloadUpdate: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('download:update', wrapped);

    return () => {
      ipcRenderer.removeListener('download:update', wrapped);
    };
  }
});
