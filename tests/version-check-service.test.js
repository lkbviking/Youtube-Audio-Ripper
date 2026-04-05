const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createVersionStatus,
  fetchLatestReleaseVersion
} = require('../src/main/services/version-check-service');

test('createVersionStatus returns an error status for development builds', () => {
  const result = createVersionStatus({
    isPackaged: false,
    localVersion: '0.1.0'
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /development builds/i);
});

test('createVersionStatus returns success when packaged and versions match the latest release', () => {
  const result = createVersionStatus({
    isPackaged: true,
    localVersion: '0.1.0',
    remoteVersion: '0.1.0'
  });

  assert.equal(result.ok, true);
  assert.match(result.message, /matches github/i);
});

test('createVersionStatus returns an error when packaged versions do not match', () => {
  const result = createVersionStatus({
    isPackaged: true,
    localVersion: '0.1.0',
    remoteVersion: '0.2.0'
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /does not match github version 0.2.0/i);
});

test('fetchLatestReleaseVersion returns the normalized version from the latest release tag', async () => {
  const version = await fetchLatestReleaseVersion(async () => ({
    ok: true,
    async json() {
      return { tag_name: 'v1.2.3' };
    }
  }));

  assert.equal(version, '1.2.3');
});

test('fetchLatestReleaseVersion accepts a tag name without the v prefix', async () => {
  const version = await fetchLatestReleaseVersion(async () => ({
    ok: true,
    async json() {
      return { tag_name: '1.2.4' };
    }
  }));

  assert.equal(version, '1.2.4');
});

test('fetchLatestReleaseVersion throws when the GitHub response is not ok', async () => {
  await assert.rejects(
    () => fetchLatestReleaseVersion(async () => ({ ok: false, status: 503 })),
    /HTTP 503/
  );
});