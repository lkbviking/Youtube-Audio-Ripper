const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const testsDirectory = path.join(__dirname, '..', 'tests');
const testFiles = fs.readdirSync(testsDirectory)
  .filter((fileName) => fileName.endsWith('.test.js'))
  .sort()
  .map((fileName) => path.join(testsDirectory, fileName));

if (testFiles.length === 0) {
  console.error('No test files were found in the tests directory.');
  process.exit(1);
}

const args = ['--test'];

if (process.argv.includes('--watch')) {
  args.push('--watch');
}

args.push(...testFiles);

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  windowsHide: true
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
