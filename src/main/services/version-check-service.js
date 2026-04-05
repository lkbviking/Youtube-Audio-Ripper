const { app } = require('electron');

const GITHUB_PACKAGE_URL = 'https://raw.githubusercontent.com/lkbviking/Youtube-Audio-Ripper/main/package.json';

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

async function fetchGithubVersion(fetchImpl = fetch) {
  const response = await fetchImpl(GITHUB_PACKAGE_URL, {
    headers: {
      'User-Agent': 'YouTube Audio Ripper'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload.version !== 'string' || !payload.version.trim()) {
    throw new Error('GitHub package.json did not contain a valid version.');
  }

  return payload.version.trim();
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
    const remoteVersion = await fetchGithubVersion(fetchImpl);

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
  GITHUB_PACKAGE_URL,
  createVersionStatus,
  fetchGithubVersion,
  getVersionStatus
};