function createUpdateState(overrides = {}) {
  return {
    status: 'idle',
    message: '',
    localVersion: null,
    latestVersion: null,
    action: 'none',
    actionLabel: null,
    progressPercent: null,
    ...overrides
  };
}

function createDevelopmentUpdateState(localVersion) {
  return createUpdateState({
    status: 'unavailable',
    localVersion,
    message: 'Automatic updates are only available in installed builds.',
    action: 'none'
  });
}

function createUpdateAvailableState(localVersion, latestVersion) {
  return createUpdateState({
    status: 'available',
    localVersion,
    latestVersion,
    message: `Update ${latestVersion} is available. You are on ${localVersion}.`,
    action: 'download',
    actionLabel: 'Update now'
  });
}

function createDownloadingUpdateState(localVersion, latestVersion, progressPercent = 0) {
  return createUpdateState({
    status: 'downloading',
    localVersion,
    latestVersion,
    message: `Downloading update ${latestVersion}...`,
    action: 'none',
    progressPercent
  });
}

function createInstallingUpdateState(localVersion, latestVersion) {
  return createUpdateState({
    status: 'installing',
    localVersion,
    latestVersion,
    message: `Installing update ${latestVersion}. The app will restart automatically.`,
    action: 'none'
  });
}

function createUpdateErrorState(localVersion, errorMessage) {
  return createUpdateState({
    status: 'error',
    localVersion,
    message: `Unable to check or install updates: ${errorMessage}`,
    action: 'none'
  });
}

function createUpToDateState(localVersion) {
  return createUpdateState({
    status: 'up-to-date',
    localVersion,
    latestVersion: localVersion,
    message: `You are on the latest version (${localVersion}).`,
    action: 'none'
  });
}

module.exports = {
  createDevelopmentUpdateState,
  createDownloadingUpdateState,
  createInstallingUpdateState,
  createUpdateAvailableState,
  createUpdateErrorState,
  createUpdateState,
  createUpToDateState
};