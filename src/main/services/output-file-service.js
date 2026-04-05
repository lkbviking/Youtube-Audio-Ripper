const fs = require('fs');
const path = require('path');

function isIgnoredDownloadArtifact(fileName) {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.endsWith('.part')
    || lowerFileName.endsWith('.temp')
    || lowerFileName.endsWith('.ytdl')
    || lowerFileName.endsWith('.json')
    || lowerFileName.endsWith('.description')
    || lowerFileName.endsWith('.jpg')
    || lowerFileName.endsWith('.jpeg')
    || lowerFileName.endsWith('.png')
    || lowerFileName.endsWith('.webp')
    || lowerFileName.endsWith('.vtt')
    || lowerFileName.endsWith('.srt');
}

function listCandidateOutputFiles(directoryPath) {
  return fs.readdirSync(directoryPath, {
    withFileTypes: true
  })
    .filter((entry) => entry.isFile() && !isIgnoredDownloadArtifact(entry.name))
    .map((entry) => {
      const filePath = path.join(directoryPath, entry.name);
      const stats = fs.statSync(filePath);

      return {
        filePath,
        lastModifiedMs: stats.mtimeMs,
        size: stats.size
      };
    })
    .filter((entry) => entry.size > 0)
    .sort((left, right) => right.lastModifiedMs - left.lastModifiedMs);
}

function resolveDownloadedFilePath({ preferredPath, expectedDirectory }) {
  if (preferredPath && fs.existsSync(preferredPath)) {
    return preferredPath;
  }

  const candidateFiles = listCandidateOutputFiles(expectedDirectory);

  if (candidateFiles.length === 0) {
    return null;
  }

  return candidateFiles[0].filePath;
}

function assertValidOutputFile(filePath) {
  if (!filePath) {
    throw new Error('Download finished without producing an output file.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected output file was not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);

  if (!stats.isFile() || stats.size <= 0) {
    throw new Error(`Output file is missing or empty: ${filePath}`);
  }

  return filePath;
}

module.exports = {
  assertValidOutputFile,
  isIgnoredDownloadArtifact,
  listCandidateOutputFiles,
  resolveDownloadedFilePath
};