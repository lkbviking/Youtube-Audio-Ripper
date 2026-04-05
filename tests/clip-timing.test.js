const test = require('node:test');
const assert = require('node:assert/strict');

const { inferClipTrimStartOffsetSeconds } = require('../src/main/services/clip-timing');

test('inferClipTrimStartOffsetSeconds matches the reproduced 35-40 second clip case', () => {
  const result = inferClipTrimStartOffsetSeconds({
    requestedStartSeconds: 35,
    paddedEndSeconds: 45,
    downloadedDurationSeconds: 35,
    trimDurationSeconds: 5
  });

  assert.equal(result.inferredSourceStartSeconds, 10);
  assert.equal(result.actualTrimStartOffsetSeconds, 25);
});

test('inferClipTrimStartOffsetSeconds throws when downloaded duration is invalid', () => {
  assert.throws(() => {
    inferClipTrimStartOffsetSeconds({
      requestedStartSeconds: 35,
      paddedEndSeconds: 45,
      downloadedDurationSeconds: 0,
      trimDurationSeconds: 5
    });
  }, /no measurable duration/i);
});

test('inferClipTrimStartOffsetSeconds clamps trim offset within file bounds', () => {
  const result = inferClipTrimStartOffsetSeconds({
    requestedStartSeconds: 25,
    paddedEndSeconds: 30,
    downloadedDurationSeconds: 10,
    trimDurationSeconds: 8
  });

  assert.equal(result.actualTrimStartOffsetSeconds, 2);
});