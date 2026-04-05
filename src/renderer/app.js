const form = document.getElementById('download-form');
const browseButton = document.getElementById('browse-button');
const cancelButton = document.getElementById('cancel-button');

const versionAlert = document.getElementById('version-alert');
const versionAlertAction = document.getElementById('version-alert-action');
const versionAlertText = document.getElementById('version-alert-text');
const outputDirectoryInput = document.getElementById('output-directory');
const statusText = document.getElementById('status-text');
const progressBar = document.getElementById('progress-bar');
const progressValue = document.getElementById('progress-value');
const speedValue = document.getElementById('speed-value');
const etaValue = document.getElementById('eta-value');
const outputValue = document.getElementById('output-value');
const logOutput = document.getElementById('log-output');

let activeJobId = null;

function setUpdateAction(action, actionLabel) {
  if (action === 'download') {
    versionAlertAction.textContent = actionLabel || 'Update now';
    versionAlertAction.disabled = false;
    versionAlertAction.classList.remove('version-alert-hidden');
    return;
  }

  versionAlertAction.disabled = true;
  versionAlertAction.classList.add('version-alert-hidden');
}

function renderUpdateStatus(updateStatus) {
  if (!updateStatus || !updateStatus.message) {
    versionAlert.classList.add('version-alert-hidden');
    setUpdateAction('none');
    return;
  }

  if (updateStatus.status === 'up-to-date') {
    versionAlert.classList.add('version-alert-hidden');
    setUpdateAction('none');
    return;
  }

  versionAlertText.textContent = updateStatus.message;
  versionAlert.classList.remove('version-alert-hidden');
  setUpdateAction(updateStatus.action, updateStatus.actionLabel);
}

async function loadUpdateStatus() {
  try {
    const updateStatus = await window.youtubeAudioRipper.getUpdateStatus();
    renderUpdateStatus(updateStatus);
  } catch (error) {
    renderUpdateStatus({
      status: 'error',
      message: `Unable to check the installed version: ${error.message}`,
      action: 'none'
    });
  }
}

function setStatus(status) {
  statusText.textContent = status;
}

function appendLog(line) {
  if (!line) {
    return;
  }

  const current = logOutput.textContent.trim();
  logOutput.textContent = current === 'Waiting for a download.' ? line : `${current}\n${line}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function resetLog() {
  logOutput.textContent = 'Waiting for a download.';
}

function setProgress(percent) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  progressBar.style.width = `${safePercent}%`;
  progressValue.textContent = `${safePercent.toFixed(1)}%`;
}

function setRunningState(isRunning) {
  cancelButton.disabled = !isRunning;
}

async function loadSavedConfig() {
  const config = await window.youtubeAudioRipper.getConfig();

  if (config.defaultOutputDirectory) {
    outputDirectoryInput.value = config.defaultOutputDirectory;
  }
}

browseButton.addEventListener('click', async () => {
  const selectedFolder = await window.youtubeAudioRipper.pickOutputFolder();

  if (!selectedFolder) {
    return;
  }

  outputDirectoryInput.value = selectedFolder;
  await window.youtubeAudioRipper.setConfig({ defaultOutputDirectory: selectedFolder });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const request = {
    url: String(formData.get('url') || '').trim(),
    outputDirectory: String(formData.get('outputDirectory') || '').trim(),
    startTime: String(formData.get('startTime') || '').trim(),
    endTime: String(formData.get('endTime') || '').trim()
  };

  resetLog();
  setStatus('Starting');
  setProgress(0);
  speedValue.textContent = '-';
  etaValue.textContent = '-';
  outputValue.textContent = '-';

  try {
    const result = await window.youtubeAudioRipper.startDownload(request);
    activeJobId = result.jobId;
    setRunningState(true);

    if (request.outputDirectory) {
      await window.youtubeAudioRipper.setConfig({ defaultOutputDirectory: request.outputDirectory });
    }
  } catch (error) {
    setStatus('Failed');
    appendLog(error.message);
  }
});

cancelButton.addEventListener('click', async () => {
  if (!activeJobId) {
    return;
  }

  await window.youtubeAudioRipper.cancelDownload(activeJobId);
});

versionAlertAction.addEventListener('click', async () => {
  versionAlertAction.disabled = true;

  try {
    const result = await window.youtubeAudioRipper.applyUpdate();

    if (!result.started && result.reason) {
      renderUpdateStatus({
        status: 'error',
        message: `Unable to start the update: ${result.reason}`,
        action: 'none'
      });
    }
  } catch (error) {
    renderUpdateStatus({
      status: 'error',
      message: `Unable to start the update: ${error.message}`,
      action: 'none'
    });
  }
});

window.youtubeAudioRipper.onUpdateStatus((payload) => {
  renderUpdateStatus(payload);
});

window.youtubeAudioRipper.onDownloadUpdate((payload) => {
  if (activeJobId && payload.jobId !== activeJobId) {
    return;
  }

  setStatus(payload.status);

  if (typeof payload.percent === 'number') {
    setProgress(payload.percent);
  }

  if (payload.speed) {
    speedValue.textContent = payload.speed;
  }

  if (payload.eta) {
    etaValue.textContent = payload.eta;
  }

  if (payload.outputPath) {
    outputValue.textContent = payload.outputPath;
  }

  if (payload.logLine) {
    appendLog(payload.logLine);
  }

  if (payload.error) {
    appendLog(payload.error);
  }

  if (['completed', 'failed', 'cancelled'].includes(payload.status)) {
    setRunningState(false);

    if (payload.status === 'completed') {
      setProgress(100);
    }

    activeJobId = null;
  }
});

loadSavedConfig();
loadUpdateStatus();