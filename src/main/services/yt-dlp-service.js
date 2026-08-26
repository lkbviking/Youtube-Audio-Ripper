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

function isZeroTimecode(timecode) {
  const trimmed = typeof timecode === 'string' ? timecode.trim() : '';

  if (!trimmed || !TIME_PATTERN.test(trimmed)) {
    return false;
  }

  return trimmed.split(':').every((part) => Number(part) === 0);
}

function normalizeYouTubeUrl(url) {
  const trimmed = typeof url === 'string' ? url.trim() : '';

  if (!trimmed) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmed);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const [videoId] = parsedUrl.pathname.split('/').filter(Boolean);

      if (!videoId) {
        return trimmed;
      }

      const normalizedUrl = new URL('https://www.youtube.com/watch');
      normalizedUrl.searchParams.set('v', videoId);

      const playlistId = parsedUrl.searchParams.get('list');

      if (playlistId) {
        normalizedUrl.searchParams.set('list', playlistId);
      }

      return normalizedUrl.toString();
    }

    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      parsedUrl.searchParams.delete('si');
      return parsedUrl.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function isPlaylistUrl(url) {
  const trimmed = typeof url === 'string' ? url.trim() : '';

  if (!trimmed) {
    return false;
  }

  try {
    return new URL(trimmed).searchParams.has('list');
  } catch {
    return /(?:\?|&)list=/.test(trimmed);
  }
}

function hasClipRange(request) {
  return Boolean((request.startTime || '').trim() && (request.endTime || '').trim());
}

function createDenoRuntimeOption(denoPath) {
  if (typeof denoPath !== 'string' || !denoPath.trim()) {
    throw new Error('A bundled Deno JavaScript runtime is required for YouTube downloads.');
  }

  return `deno:${denoPath}`;
}

function validateDownloadRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error('Missing download request payload.');
  }

  const url = normalizeYouTubeUrl(request.url);
  const outputDirectory = typeof request.outputDirectory === 'string'
    ? request.outputDirectory.trim()
    : '';
  let startTime = typeof request.startTime === 'string' ? request.startTime.trim() : '';
  const endTime = typeof request.endTime === 'string' ? request.endTime.trim() : '';

  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('A valid YouTube URL is required.');
  }

  if (isPlaylistUrl(url)) {
    throw new Error('Playlist URLs are not supported. Please use a single-video YouTube URL.');
  }

  if (!outputDirectory) {
    throw new Error('An output folder is required.');
  }

  if (startTime && !TIME_PATTERN.test(startTime)) {
    throw new Error('Start time must use mm:ss or hh:mm:ss.');
  }

  if (endTime && !TIME_PATTERN.test(endTime)) {
    throw new Error('End time must use mm:ss or hh:mm:ss.');
  }

  if (startTime && !endTime && isZeroTimecode(startTime)) {
    startTime = '';
  }

  if ((startTime && !endTime) || (!startTime && endTime)) {
    throw new Error('Both start and end times are required for clip downloads.');
  }

  if (startTime && endTime && timecodeToSeconds(endTime) <= timecodeToSeconds(startTime)) {
    throw new Error('End time must be later than start time.');
  }

  return {
    ...request,
    url,
    outputDirectory,
    startTime,
    endTime
  };
}

function createValidatedClipPlan(request) {
  if (!hasClipRange(request)) {
    throw new Error('Clip planning requires both start and end times.');
  }

  const requestedStartSeconds = timecodeToSeconds(request.startTime);
  const requestedEndSeconds = timecodeToSeconds(request.endTime);
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

function createClipPlan(request) {
  const validatedRequest = validateDownloadRequest(request);
  return createValidatedClipPlan(validatedRequest);
}

function buildDownloadArguments(request, toolPaths = assertToolsExist()) {
  const validatedRequest = validateDownloadRequest(request);

  const { binDirectory, denoPath } = toolPaths;
  const args = [
    '-f',
    'ba/bestaudio',
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--ffmpeg-location',
    binDirectory,
    '--js-runtimes',
    createDenoRuntimeOption(denoPath),
    '--paths',
    `home:${validatedRequest.outputDirectory}`,
    '--windows-filenames',
    '--newline',
    '--progress',
    '--no-playlist',
    '--print',
    'after_move:filepath'
  ];

  if (validatedRequest.startTime && validatedRequest.endTime) {
    args.push('--download-sections', `*${validatedRequest.startTime}-${validatedRequest.endTime}`);
  }

  args.push(validatedRequest.url);

  return args;
}

function buildClipDownloadArguments(request, tempDirectory, toolPaths = assertToolsExist()) {
  const validatedRequest = validateDownloadRequest(request);
  const clipPlan = createValidatedClipPlan(validatedRequest);
  const { binDirectory, denoPath } = toolPaths;

  const args = [
    '-f',
    'ba/bestaudio',
    '--ffmpeg-location',
    binDirectory,
    '--js-runtimes',
    createDenoRuntimeOption(denoPath),
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

  args.push(validatedRequest.url);

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
  isPlaylistUrl,
  timecodeToSeconds,
  validateDownloadRequest
};
