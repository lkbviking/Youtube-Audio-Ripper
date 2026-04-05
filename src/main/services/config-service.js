const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_CONFIG = {
  defaultOutputDirectory: ''
};

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function ensureConfigDirectory() {
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
}

function getConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function setConfig(partialConfig) {
  const nextConfig = { ...getConfig(), ...partialConfig };

  ensureConfigDirectory();
  fs.writeFileSync(getConfigPath(), JSON.stringify(nextConfig, null, 2), 'utf8');

  return nextConfig;
}

module.exports = {
  getConfig,
  setConfig
};
