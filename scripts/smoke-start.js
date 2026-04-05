const { spawn } = require('child_process');
const path = require('path');

const electronBinary = require('electron');

const projectRoot = path.resolve(__dirname, '..');
const child = spawn(electronBinary, ['.'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    SMOKE_EXIT_AFTER_READY_MS: '1500'
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

let stderr = '';

child.stderr.setEncoding('utf8');
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

const timeout = setTimeout(() => {
  child.kill();
  console.error('Smoke start timed out while waiting for Electron to exit.');
  process.exit(1);
}, 15000);

child.on('close', (code) => {
  clearTimeout(timeout);

  if (code === 0) {
    console.log('Electron startup smoke test passed.');
    process.exit(0);
  }

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  console.error(`Electron startup smoke test failed with exit code ${code}.`);
  process.exit(code || 1);
});