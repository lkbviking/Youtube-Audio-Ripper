const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertValidOutputFile,
  resolveDownloadedFilePath
} = require('../src/main/services/output-file-service');

test('assertValidOutputFile accepts an existing non-empty file', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'yar-output-test-'));

  try {
    const filePath = path.join(tempDirectory, 'clip.mp3');
    fs.writeFileSync(filePath, 'audio');

    assert.equal(assertValidOutputFile(filePath), filePath);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('assertValidOutputFile rejects a missing file', () => {
  assert.throws(() => {
    assertValidOutputFile('Z:\\this\\file\\does\\not\\exist.mp3');
  }, /not found/i);
});

test('resolveDownloadedFilePath ignores sidecar files and falls back to the newest real file', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'yar-output-test-'));

  try {
    fs.writeFileSync(path.join(tempDirectory, 'video.info.json'), '{}');
    fs.writeFileSync(path.join(tempDirectory, 'clip.part'), 'partial');

    const olderFilePath = path.join(tempDirectory, 'older.webm');
    fs.writeFileSync(olderFilePath, 'old');

    const newerFilePath = path.join(tempDirectory, 'newer.webm');
    fs.writeFileSync(newerFilePath, 'new');

    assert.equal(
      resolveDownloadedFilePath({
        preferredPath: null,
        expectedDirectory: tempDirectory
      }),
      newerFilePath
    );
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});