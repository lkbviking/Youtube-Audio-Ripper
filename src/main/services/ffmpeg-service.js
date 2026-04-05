const { spawn } = require('child_process');

const { assertToolsExist } = require('./tool-path-service');

function parseNumericValue(value, fallbackValue = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function probeMediaTiming(inputPath) {
  return new Promise((resolve, reject) => {
    const { ffprobePath } = assertToolsExist();
    const args = [
      '-v',
      'error',
      '-show_entries',
      'format=start_time,duration',
      '-of',
      'json',
      inputPath
    ];

    const process = spawn(ffprobePath, args, {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    process.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    process.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    process.on('error', (error) => {
      reject(error);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ffprobe exited with code ${code}.`));
        return;
      }

      try {
        const parsedOutput = JSON.parse(stdout);
        const format = parsedOutput.format || {};

        resolve({
          startTimeSeconds: parseNumericValue(format.start_time, 0),
          durationSeconds: parseNumericValue(format.duration, 0)
        });
      } catch (error) {
        reject(new Error(`Unable to parse ffprobe output: ${error.message}`));
      }
    });
  });
}

function trimSourceToMp3({
  inputPath,
  outputPath,
  trimStartOffsetSeconds,
  trimDurationSeconds,
  onLog,
  onProcess
}) {
  return new Promise((resolve, reject) => {
    const { ffmpegPath } = assertToolsExist();
    const args = [
      '-hide_banner',
      '-y',
      '-i',
      inputPath,
      '-ss',
      String(trimStartOffsetSeconds),
      '-t',
      String(trimDurationSeconds),
      '-vn',
      '-acodec',
      'libmp3lame',
      '-q:a',
      '2',
      outputPath
    ];

    const process = spawn(ffmpegPath, args, {
      windowsHide: true
    });

    if (onProcess) {
      onProcess(process);
    }

    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    process.stdout.on('data', (chunk) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => onLog && onLog(line));
    });

    process.stderr.on('data', (chunk) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => onLog && onLog(line));
    });

    process.on('error', (error) => {
      reject(error);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}.`));
    });
  });
}

module.exports = {
  probeMediaTiming,
  trimSourceToMp3
};