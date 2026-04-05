const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

const {
  buildClipDownloadArguments,
  buildDownloadArguments,
  hasClipRange
} = require('./yt-dlp-service');
const { inferClipTrimStartOffsetSeconds } = require('./clip-timing');
const { probeMediaTiming, trimSourceToMp3 } = require('./ffmpeg-service');
const {
  assertValidOutputFile,
  resolveDownloadedFilePath
} = require('./output-file-service');
const { assertToolsExist } = require('./tool-path-service');

function parseDownloadLine(line) {
  const trimmed = line.trim();

  if (!trimmed.startsWith('[download]')) {
    return null;
  }

  const percentMatch = trimmed.match(/(\d+(?:\.\d+)?)%/);
  const speedMatch = trimmed.match(/at\s+([^\s].*?)\s+ETA/i);
  const etaMatch = trimmed.match(/ETA\s+(.+)$/i);

  return {
    percent: percentMatch ? Number(percentMatch[1]) : null,
    speed: speedMatch ? speedMatch[1].trim() : null,
    eta: etaMatch ? etaMatch[1].trim() : null
  };
}

class DownloadJob extends EventEmitter {
  constructor(request) {
    super();
    this.id = randomUUID();
    this.request = request;
    this.process = null;
    this.ffmpegProcess = null;
    this.outputPath = null;
    this.cancelled = false;
    this.tempDirectory = null;
  }

  emitUpdate(patch) {
    this.emit('update', {
      jobId: this.id,
      status: 'queued',
      percent: null,
      speed: null,
      eta: null,
      outputPath: this.outputPath,
      error: null,
      logLine: null,
      ...patch
    });
  }

  async start() {
    try {
      this.emitUpdate({ status: 'running' });

      this.outputPath = hasClipRange(this.request)
        ? await this.runPreciseClipDownload()
        : await this.runStandardDownload();

      assertValidOutputFile(this.outputPath);

      if (this.cancelled) {
        this.emitUpdate({ status: 'cancelled' });
        return;
      }

      this.emitUpdate({
        status: 'completed',
        percent: 100,
        outputPath: this.outputPath
      });
    } catch (error) {
      if (this.cancelled) {
        this.emitUpdate({ status: 'cancelled' });
        return;
      }

      this.emitUpdate({
        status: 'failed',
        error: error.message
      });
    } finally {
      this.cleanupTempDirectory();
      this.process = null;
      this.ffmpegProcess = null;
    }
  }

  async runStandardDownload() {
    const args = buildDownloadArguments(this.request);
    return this.runYtDlpProcess(args, {
      expectedDirectory: this.request.outputDirectory
    });
  }

  async runPreciseClipDownload() {
    this.tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'youtube-audio-ripper-'));

    const { args, clipPlan } = buildClipDownloadArguments(this.request, this.tempDirectory);

    this.emitUpdate({
      status: 'running',
      logLine: 'Downloading padded source clip for exact trimming...'
    });

    const sourcePath = await this.runYtDlpProcess(args, {
      expectedDirectory: this.tempDirectory
    });

    if (!sourcePath) {
      throw new Error('yt-dlp completed, but the downloaded source file could not be resolved.');
    }

    const finalOutputPath = path.join(
      this.request.outputDirectory,
      `${path.parse(sourcePath).name}.mp3`
    );

    const mediaTiming = await probeMediaTiming(sourcePath);

    const { inferredSourceStartSeconds, actualTrimStartOffsetSeconds } = inferClipTrimStartOffsetSeconds({
      requestedStartSeconds: clipPlan.requestedStartSeconds,
      paddedEndSeconds: clipPlan.paddedEndSeconds,
      downloadedDurationSeconds: mediaTiming.durationSeconds,
      trimDurationSeconds: clipPlan.trimDurationSeconds
    });

    this.emitUpdate({
      status: 'postprocessing',
      logLine: `Resolved source duration ${mediaTiming.durationSeconds.toFixed(3)}s; inferred original start ${inferredSourceStartSeconds.toFixed(3)}s; trimming from ${actualTrimStartOffsetSeconds.toFixed(3)}s.`
    });

    this.emitUpdate({
      status: 'postprocessing',
      logLine: `Applying exact trim from ${this.request.startTime} to ${this.request.endTime}...`
    });

    await trimSourceToMp3({
      inputPath: sourcePath,
      outputPath: finalOutputPath,
      trimStartOffsetSeconds: actualTrimStartOffsetSeconds,
      trimDurationSeconds: clipPlan.trimDurationSeconds,
      onProcess: (process) => {
        this.ffmpegProcess = process;
      },
      onLog: (line) => {
        this.emitUpdate({
          status: 'postprocessing',
          logLine: line
        });
      }
    });

    return finalOutputPath;
  }

  runYtDlpProcess(args, { expectedDirectory }) {
    return new Promise((resolve, reject) => {
      const { ytDlpPath } = assertToolsExist();
      let printedPath = null;

      this.process = spawn(ytDlpPath, args, {
        windowsHide: true
      });

      this.process.stdout.setEncoding('utf8');
      this.process.stderr.setEncoding('utf8');

      this.process.stdout.on('data', (chunk) => {
        const lines = chunk.split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          const parsed = parseDownloadLine(line);

          if (parsed) {
            this.emitUpdate({
              status: 'running',
              percent: parsed.percent,
              speed: parsed.speed,
              eta: parsed.eta,
              logLine: line
            });
            continue;
          }

          if (/^([A-Za-z]:\\|\\\\)/.test(line.trim())) {
            printedPath = line.trim();
            continue;
          }

          if (line.includes('Deleting original file')) {
            this.emitUpdate({ status: 'postprocessing', logLine: line });
            continue;
          }

          this.emitUpdate({ status: 'running', logLine: line });
        }
      });

      this.process.stderr.on('data', (chunk) => {
        const lines = chunk.split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          this.emitUpdate({ status: 'running', logLine: line });
        }
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      this.process.on('close', (code) => {
        if (this.cancelled) {
          reject(new Error('Download cancelled.'));
          return;
        }

        if (code === 0) {
          resolve(resolveDownloadedFilePath({
            preferredPath: printedPath,
            expectedDirectory
          }));
          return;
        }

        reject(new Error(`yt-dlp exited with code ${code}.`));
      });
    });
  }

  cleanupTempDirectory() {
    if (!this.tempDirectory) {
      return;
    }

    fs.rmSync(this.tempDirectory, {
      recursive: true,
      force: true
    });

    this.tempDirectory = null;
  }

  cancel() {
    this.cancelled = true;

    if (this.process && !this.process.killed) {
      this.process.kill();
    }

    if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
      this.ffmpegProcess.kill();
    }
  }
}

module.exports = {
  DownloadJob
};
