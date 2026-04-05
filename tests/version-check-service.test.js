const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createVersionStatus,
  fetchGithubVersion
} = require('../src/main/services/version-check-service');

test('createVersionStatus returns an error status for development builds', () => {
  const result = createVersionStatus({
    isPackaged: false,
    localVersion: '0.1.0'
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /development builds/i);
});

test('createVersionStatus returns success when packaged and versions match', () => {
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

test('fetchGithubVersion returns the remote version from package.json', async () => {
  const version = await fetchGithubVersion(async () => ({
    ok: true,
    async json() {
      return { version: '1.2.3' };
    }
  }));

  assert.equal(version, '1.2.3');
});

test('fetchGithubVersion throws when the GitHub response is not ok', async () => {
  await assert.rejects(
    () => fetchGithubVersion(async () => ({ ok: false, status: 503 })),
    /HTTP 503/
  );
});