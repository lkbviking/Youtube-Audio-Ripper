const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const binDirectory = path.join(projectRoot, 'bin');
const ytDlpPath = path.join(binDirectory, 'yt-dlp.exe');
const ffmpegPath = path.join(binDirectory, 'ffmpeg.exe');
const ffprobePath = path.join(binDirectory, 'ffprobe.exe');
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'youtube-audio-ripper-smoke-'));

function runOrThrow(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${path.basename(command)} failed.`);
  }

  return result.stdout;
}

try {
  runOrThrow(ytDlpPath, [
    '--js-runtimes',
    `node:${process.execPath}`,
    '-f',
    'ba/bestaudio',
    '--ffmpeg-location',
    binDirectory,
    '--paths',
    `home:${tempDirectory}`,
    '--windows-filenames',
    '--no-playlist',
    '--print',
    'after_move:filepath',
    '--download-sections',
    '*00:00:00-00:00:15',
    'https://www.youtube.com/watch?v=jNQXAC9IVRw'
  ]);

  const sourcePath = fs.readdirSync(tempDirectory)
    .map((fileName) => path.join(tempDirectory, fileName))
    .find((filePath) => fs.statSync(filePath).isFile() && path.extname(filePath).toLowerCase() === '.webm');

  if (!sourcePath) {
    throw new Error('Smoke clip download did not produce a source audio file.');
  }

  const outputPath = path.join(tempDirectory, 'smoke-clip.mp3');

  runOrThrow(ffmpegPath, [
    '-hide_banner',
    '-y',
    '-i',
    sourcePath,
    '-ss',
    '5',
    '-t',
    '5',
    '-vn',
    '-acodec',
    'libmp3lame',
    '-q:a',
    '2',
    outputPath
  ]);

  const probeOutput = runOrThrow(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    outputPath
  ]);
  const duration = Number(JSON.parse(probeOutput).format.duration);

  if (!Number.isFinite(duration) || duration < 4.5 || duration > 5.5) {
    throw new Error(`Smoke clip duration was ${duration}, expected about 5 seconds.`);
  }

  console.log(`Clip smoke test passed with output duration ${duration.toFixed(3)} seconds.`);
} finally {
  fs.rmSync(tempDirectory, {
    recursive: true,
    force: true
  });
}