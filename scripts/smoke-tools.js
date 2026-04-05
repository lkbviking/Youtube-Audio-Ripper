const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const binDirectory = path.join(projectRoot, 'bin');
const tools = [
  {
    name: 'yt-dlp.exe',
    versionArgs: ['--version']
  },
  {
    name: 'ffmpeg.exe',
    versionArgs: ['-version']
  },
  {
    name: 'ffprobe.exe',
    versionArgs: ['-version']
  }
];

for (const tool of tools) {
  const toolName = tool.name;
  const toolPath = path.join(binDirectory, toolName);

  if (!fs.existsSync(toolPath)) {
    throw new Error(`Missing required tool: ${toolPath}`);
  }

  const result = spawnSync(toolPath, tool.versionArgs, {
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(`Unable to execute ${toolName}: ${result.stderr || result.stdout}`);
  }

  const firstLine = (result.stdout || '').split(/\r?\n/).find(Boolean) || 'version check passed';
  console.log(`${toolName}: ${firstLine}`);
}

console.log('Bundled tool smoke test passed.');