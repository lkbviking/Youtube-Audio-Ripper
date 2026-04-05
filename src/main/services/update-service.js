const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

const {
  createDevelopmentUpdateState,
  createDownloadingUpdateState,
  createInstallingUpdateState,
  createUpdateAvailableState,
  createUpdateErrorState,
  createUpdateState,
  createUpToDateState
} = require('./update-state');

let currentUpdateState = createUpdateState();
let notifyRenderer = () => {};
let isInitialized = false;
let installScheduled = false;

function getLocalVersion() {
  return app.getVersion();
}

function setUpdateState(nextState) {
  currentUpdateState = nextState;
  notifyRenderer(currentUpdateState);
}

function scheduleInstall() {
  if (installScheduled) {
    return;
  }

  installScheduled = true;

  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 750).unref();
}

function registerAutoUpdaterListeners() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setUpdateState(createUpdateState({
      status: 'checking',
      localVersion: getLocalVersion(),
      message: 'Checking for updates...',
      action: 'none'
    }));
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateState(createUpdateAvailableState(getLocalVersion(), info.version));
  });

  autoUpdater.on('update-not-available', () => {
    setUpdateState(createUpToDateState(getLocalVersion()));
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState(createDownloadingUpdateState(
      getLocalVersion(),
      currentUpdateState.latestVersion,
      progress.percent
    ));
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState(createInstallingUpdateState(getLocalVersion(), info.version));
    scheduleInstall();
  });

  autoUpdater.on('error', (error) => {
    setUpdateState(createUpdateErrorState(getLocalVersion(), error.message));
  });
}

function initializeUpdateService(onUpdateState) {
  notifyRenderer = onUpdateState;

  if (isInitialized) {
    notifyRenderer(currentUpdateState);
    return;
  }

  isInitialized = true;

  if (!app.isPackaged) {
    setUpdateState(createDevelopmentUpdateState(getLocalVersion()));
    return;
  }

  registerAutoUpdaterListeners();
  autoUpdater.checkForUpdates().catch((error) => {
    setUpdateState(createUpdateErrorState(getLocalVersion(), error.message));
  });
}

function getUpdateState() {
  return currentUpdateState;
}

async function applyAvailableUpdate() {
  if (currentUpdateState.action !== 'download') {
    return {
      started: false,
      reason: 'No update is ready to download.'
    };
  }

  setUpdateState(createDownloadingUpdateState(
    getLocalVersion(),
    currentUpdateState.latestVersion,
    0
  ));

  try {
    await autoUpdater.downloadUpdate();
    return { started: true };
  } catch (error) {
    setUpdateState(createUpdateErrorState(getLocalVersion(), error.message));
    return {
      started: false,
      reason: error.message
    };
  }
}

module.exports = {
  applyAvailableUpdate,
  getUpdateState,
  initializeUpdateService
};