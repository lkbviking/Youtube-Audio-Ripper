const { app } = require('electron');

const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/lkbviking/Youtube-Audio-Ripper/releases/latest';

function normalizeReleaseVersion(tagName) {
  if (typeof tagName !== 'string') {
    throw new Error('GitHub release did not contain a valid tag name.');
  }

  const trimmedTagName = tagName.trim();

  if (!trimmedTagName) {
    throw new Error('GitHub release did not contain a valid tag name.');
  }

  return trimmedTagName.replace(/^v/i, '');
}

function createVersionStatus({
  isPackaged,
  localVersion,
  remoteVersion = null,
  errorMessage = null
}) {
  if (!isPackaged) {
    return {
      ok: false,
      localVersion,
      remoteVersion: null,
      message: 'Version verification is not enabled for development builds yet.'
    };
  }

  if (errorMessage) {
    return {
      ok: false,
      localVersion,
      remoteVersion,
      message: `Unable to verify the installed version against GitHub: ${errorMessage}`
    };
  }

  if (!remoteVersion) {
    return {
      ok: false,
      localVersion,
      remoteVersion: null,
      message: 'Unable to verify the installed version against GitHub because no remote version was returned.'
    };
  }

  if (localVersion !== remoteVersion) {
    return {
      ok: false,
      localVersion,
      remoteVersion,
      message: `Installed version ${localVersion} does not match GitHub version ${remoteVersion}.`
    };
  }

  return {
    ok: true,
    localVersion,
    remoteVersion,
    message: `Installed version ${localVersion} matches GitHub.`
  };
}

async function fetchLatestReleaseVersion(fetchImpl = fetch) {
  const response = await fetchImpl(GITHUB_LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'YouTube Audio Ripper'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload.tag_name !== 'string') {
    throw new Error('GitHub latest release did not contain a valid tag name.');
  }

  return normalizeReleaseVersion(payload.tag_name);
}

async function getVersionStatus(fetchImpl = fetch) {
  const localVersion = app.getVersion();

  if (!app.isPackaged) {
    return createVersionStatus({
      isPackaged: false,
      localVersion
    });
  }

  try {
    const remoteVersion = await fetchLatestReleaseVersion(fetchImpl);

    return createVersionStatus({
      isPackaged: true,
      localVersion,
      remoteVersion
    });
  } catch (error) {
    return createVersionStatus({
      isPackaged: true,
      localVersion,
      errorMessage: error.message
    });
  }
}

module.exports = {
  createVersionStatus,
  fetchLatestReleaseVersion,
  getVersionStatus
};