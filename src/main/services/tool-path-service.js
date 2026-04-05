const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getBaseBinDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin');
  }

  return path.join(app.getAppPath(), 'bin');
}

function resolveToolPaths() {
  const binDirectory = getBaseBinDirectory();

  return {
    binDirectory,
    ytDlpPath: path.join(binDirectory, 'yt-dlp.exe'),
    ffmpegPath: path.join(binDirectory, 'ffmpeg.exe'),
    ffprobePath: path.join(binDirectory, 'ffprobe.exe')
  };
}

function assertToolsExist() {
  const toolPaths = resolveToolPaths();
  const missing = Object.entries(toolPaths)
    .filter(([key]) => key !== 'binDirectory')
    .filter(([, filePath]) => !fs.existsSync(filePath))
    .map(([key]) => key.replace('Path', ''));

  if (missing.length > 0) {
    throw new Error(`Missing required tool binaries: ${missing.join(', ')}`);
  }

  return toolPaths;
}

module.exports = {
  resolveToolPaths,
  assertToolsExist
};
