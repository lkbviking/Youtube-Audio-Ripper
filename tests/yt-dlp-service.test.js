const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createClipPlan,
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