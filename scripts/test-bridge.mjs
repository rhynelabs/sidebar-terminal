import { spawn } from 'node:child_process';

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const child = spawn(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', '*_test.py'], {
  stdio: 'inherit',
  windowsHide: true,
});
child.once('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
