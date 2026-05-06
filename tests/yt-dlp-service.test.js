const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createClipPlan,
  isPlaylistUrl,
  validateDownloadRequest
} = require('../src/main/services/yt-dlp-service');

test('createClipPlan builds the expected padded clip window', () => {
  const result = createClipPlan({
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    outputDirectory: 'D:\\Temp',
    startTime: '00:35',
    endTime: '00:40'
  });

  assert.equal(result.requestedStartSeconds, 35);
  assert.equal(result.requestedEndSeconds, 40);
  assert.equal(result.paddedStartSeconds, 20);
  assert.equal(result.paddedEndSeconds, 45);
  assert.equal(result.trimDurationSeconds, 5);
});

test('validateDownloadRequest rejects one-sided clip ranges', () => {
  assert.throws(() => {
    validateDownloadRequest({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      outputDirectory: 'D:\\Temp',
      startTime: '00:35',
      endTime: ''
    });
  }, /both start and end times are required/i);
});

test('validateDownloadRequest treats a zero start time without an end time as blank', () => {
  const result = validateDownloadRequest({
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    outputDirectory: 'D:\\Temp',
    startTime: '00:00',
    endTime: ''
  });

  assert.equal(result.startTime, '');
  assert.equal(result.endTime, '');
});

test('createClipPlan supports clips that begin at zero', () => {
  const result = createClipPlan({
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    outputDirectory: 'D:\\Temp',
    startTime: '00:00',
    endTime: '00:05'
  });

  assert.equal(result.requestedStartSeconds, 0);
  assert.equal(result.paddedStartSeconds, 0);
  assert.equal(result.trimDurationSeconds, 5);
});

test('validateDownloadRequest normalizes youtu.be share URLs for clip requests', () => {
  const result = validateDownloadRequest({
    url: 'https://youtu.be/aVzecmgFPq0?si=S23M0XTKqtECSCRI',
    outputDirectory: 'D:\\Temp',
    startTime: '00:05',
    endTime: '00:10'
  });

  assert.equal(result.url, 'https://www.youtube.com/watch?v=aVzecmgFPq0');
});

test('validateDownloadRequest rejects end times before start times', () => {
  assert.throws(() => {
    validateDownloadRequest({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      outputDirectory: 'D:\\Temp',
      startTime: '00:40',
      endTime: '00:35'
    });
  }, /end time must be later than start time/i);
});

test('isPlaylistUrl detects playlist query parameters', () => {
  assert.equal(isPlaylistUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL123'), true);
  assert.equal(isPlaylistUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw'), false);
});

test('validateDownloadRequest rejects playlist URLs', () => {
  assert.throws(() => {
    validateDownloadRequest({
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL123',
      outputDirectory: 'D:\\Temp',
      startTime: '',
      endTime: ''
    });
  }, /playlist urls are not supported/i);
});
