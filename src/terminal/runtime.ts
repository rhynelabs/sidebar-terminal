import { constants, accessSync } from 'node:fs';
import { delimiter, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

function executable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function expandHome(value: string): string {
  return value === '~' ? homedir() : value.startsWith('~/') ? join(homedir(), value.slice(2)) : value;
}

function onPath(names: string[], extra: string[] = []): string | undefined {
  const paths = [...extra, ...(process.env.PATH ?? '').split(delimiter)];
  return names.flatMap((name) => paths.map((dir) => join(dir, name))).find(executable);
}

function configuredPath(value: string, name: string): string {
  const file = expandHome(value);
  if (!isAbsolute(file) || !executable(file)) throw new Error(`${name} must be an executable absolute path.`);
  return file;
}

export function findPython(configured: string): { binary: string; args: string[] } {
  if (configured) return { binary: configuredPath(configured, 'Python'), args: [] };
  if (process.platform === 'win32') {
    const launcher = onPath(['py.exe']);
    if (launcher) return { binary: launcher, args: ['-3'] };
    const python = onPath(['python.exe', 'python3.exe']);
    if (python) return { binary: python, args: [] };
  } else {
    const python = onPath(['python3'], ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']);
    if (python) return { binary: python, args: [] };
  }
  throw new Error('Python 3 was not found. Install it or set its path in Sidebar Terminal settings.');
}

export function findShell(configured: string): string {
  if (configured) return configuredPath(configured, 'Shell');
  if (process.platform === 'win32') {
    return (
      onPath(['pwsh.exe', 'powershell.exe']) ??
      join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    );
  }
  return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
}
