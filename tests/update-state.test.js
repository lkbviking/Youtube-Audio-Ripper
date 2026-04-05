const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDevelopmentUpdateState,
  createDownloadingUpdateState,
  createInstallingUpdateState,
  createUpdateAvailableState,
  createUpdateErrorState,
  createUpToDateState
} = require('../src/main/services/update-state');

test('createDevelopmentUpdateState disables update actions in development builds', () => {
  const result = createDevelopmentUpdateState('0.1.6');

  assert.equal(result.status, 'unavailable');
  assert.equal(result.action, 'none');
  assert.match(result.message, /installed builds/i);
});

test('createUpdateAvailableState exposes an update action button', () => {
  const result = createUpdateAvailableState('0.1.6', '0.1.7');

  assert.equal(result.status, 'available');
  assert.equal(result.action, 'download');
  assert.equal(result.actionLabel, 'Update now');
  assert.match(result.message, /0.1.7/);
});

test('createDownloadingUpdateState includes progress', () => {
  const result = createDownloadingUpdateState('0.1.6', '0.1.7', 42.5);

  assert.equal(result.status, 'downloading');
  assert.equal(result.progressPercent, 42.5);
  assert.equal(result.action, 'none');
});

test('createInstallingUpdateState tells the user the app will restart automatically', () => {
  const result = createInstallingUpdateState('0.1.6', '0.1.7');

  assert.equal(result.status, 'installing');
  assert.match(result.message, /restart automatically/i);
});

test('createUpdateErrorState produces an error status', () => {
  const result = createUpdateErrorState('0.1.6', 'network failed');

  assert.equal(result.status, 'error');
  assert.match(result.message, /network failed/i);
});

test('createUpToDateState hides update actions when already current', () => {
  const result = createUpToDateState('0.1.6');

  assert.equal(result.status, 'up-to-date');
  assert.equal(result.action, 'none');
});