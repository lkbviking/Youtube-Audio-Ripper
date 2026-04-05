const { assertToolsExist } = require('./tool-path-service');

const TIME_PATTERN = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;
const PRECISE_CLIP_PRE_PADDING_SECONDS = 15;
const PRECISE_CLIP_POST_PADDING_SECONDS = 5;

function timecodeToSeconds(timecode) {
  const parts = timecode.split(':').map(Number);

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60) + seconds;
  }

  const [hours, minutes, seconds] = parts;
  return (hours * 3600) + (minutes * 60) + seconds;
}

function secondsToTimecode(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function hasClipRange(request) {
  return Boolean((request.startTime || '').trim() && (request.endTime || '').trim());
}

function validateDownloadRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error('Missing download request payload.');
  }

  if (!request.url || !/^https?:\/\//i.test(request.url)) {
    throw new Error('A valid YouTube URL is required.');
  }

  if (!request.outputDirectory) {
    throw new Error('An output folder is required.');
  }

  const startTime = (request.startTime || '').trim();
  const endTime = (request.endTime || '').trim();

  if (startTime && !TIME_PATTERN.test(startTime)) {
    throw new Error('Start time must use mm:ss or hh:mm:ss.');
  }

  if (endTime && !TIME_PATTERN.test(endTime)) {
    throw new Error('End time must use mm:ss or hh:mm:ss.');
  }

  if ((startTime && !endTime) || (!startTime && endTime)) {
    throw new Error('Both start and end times are required for clip downloads.');
  }

  if (startTime && endTime && timecodeToSeconds(endTime) <= timecodeToSeconds(startTime)) {
    throw new Error('End time must be later than start time.');
  }
}

function createClipPlan(request) {
  validateDownloadRequest(request);

  if (!hasClipRange(request)) {
    throw new Error('Clip planning requires both start and end times.');
  }

  const requestedStartSeconds = timecodeToSeconds(request.startTime.trim());
  const requestedEndSeconds = timecodeToSeconds(request.endTime.trim());
  const paddedStartSeconds = Math.max(0, requestedStartSeconds - PRECISE_CLIP_PRE_PADDING_SECONDS);
  const paddedEndSeconds = requestedEndSeconds + PRECISE_CLIP_POST_PADDING_SECONDS;

  return {
    requestedStartSeconds,
    requestedEndSeconds,
    paddedStartSeconds,
    paddedEndSeconds,
    paddedStartTimecode: secondsToTimecode(paddedStartSeconds),
    paddedEndTimecode: secondsToTimecode(paddedEndSeconds),
    trimStartOffsetSeconds: requestedStartSeconds - paddedStartSeconds,
    trimDurationSeconds: requestedEndSeconds - requestedStartSeconds
  };
}

function buildDownloadArguments(request) {
  validateDownloadRequest(request);

  const { binDirectory } = assertToolsExist();
  const args = [
    '-f',
    'ba/bestaudio',
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--ffmpeg-location',
    binDirectory,
    '--paths',
    `home:${request.outputDirectory}`,
    '--windows-filenames',
    '--newline',
    '--progress',
    '--no-playlist',
    '--print',
    'after_move:filepath'
  ];

  if (request.startTime && request.endTime) {
    args.push('--download-sections', `*${request.startTime}-${request.endTime}`);
  }

  args.push(request.url);

  return args;
}

function buildClipDownloadArguments(request, tempDirectory) {
  const clipPlan = createClipPlan(request);
  const { binDirectory } = assertToolsExist();

  const args = [
    '-f',
    'ba/bestaudio',
    '--ffmpeg-location',
    binDirectory,
    '--paths',
    `home:${tempDirectory}`,
    '--windows-filenames',
    '--newline',
    '--progress',
    '--no-playlist',
    '--print',
    'after_move:filepath',
    '--download-sections',
    `*${clipPlan.paddedStartTimecode}-${clipPlan.paddedEndTimecode}`
  ];

  args.push(request.url);

  return {
    args,
    clipPlan
  };
}

module.exports = {
  buildDownloadArguments,
  buildClipDownloadArguments,
  createClipPlan,
  hasClipRange,
  timecodeToSeconds,
  validateDownloadRequest
};
