import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { setTimeout, clearTimeout } from 'node:timers';
import type { Settings } from '../settings/model';
import { bridgeArguments } from './bridge';
import { expandHome, findPython, findShell } from './runtime';

export interface SessionEvents {
  data: (data: Uint8Array) => void;
  ready: () => void;
  exit: (code: number | null) => void;
  error: (message: string) => void;
}

export class TerminalSession {
  private process: ChildProcessWithoutNullStreams | null = null;
  private closed = false;
  private outputBytes = 0;
  private exitCode: number | null = null;

  constructor(private events: SessionEvents) {}

  start(settings: Settings, cwd: string, cols: number, rows: number, command: string): void {
    try {
      const python = findPython(settings.python);
      const shell = findShell(settings.shell);
      const directory = expandHome(cwd);
      if (!existsSync(directory)) throw new Error(`Working directory does not exist: ${directory}`);
      const child = spawn(
        python.binary,
        [
          ...python.args,
          ...bridgeArguments({ shell, cwd: directory, cols, rows, command }, process.platform === 'win32'),
        ],
        { cwd: directory, env: { ...process.env, PYTHONUNBUFFERED: '1' }, stdio: 'pipe', windowsHide: true },
      );
      this.process = child;
      const lines = createInterface({ input: child.stdout });
      lines.on('line', (line) => {
        if (this.closed) return;
        try {
          const message = JSON.parse(line) as Record<string, unknown>;
          if (message.type === 'data') {
            if (typeof message.data !== 'string') throw new Error('Invalid terminal data');
            const bytes = Buffer.from(message.data, 'base64');
            this.outputBytes += bytes.length;
            this.events.data(bytes);
            if (this.outputBytes > 262144) child.stdout.pause();
          } else if (message.type === 'ready') {
            this.events.ready();
          } else if (message.type === 'exit' && typeof message.code === 'number')
            this.exitCode = message.code;
          else if (message.type === 'error') this.events.error(String(message.message));
        } catch {
          this.events.error('Invalid response from the terminal process.');
        }
      });
      child.stderr.on('data', (data: Buffer) => {
        if (!this.closed) this.events.error(data.toString('utf8').slice(0, 2000));
      });
      child.stdin.on('error', (error) => {
        if (!this.closed) this.events.error(error.message);
      });
      child.once('error', (error) => {
        if (!this.closed) this.events.error(error.message);
      });
      child.once('close', (code) => {
        lines.close();
        this.process = null;
        if (!this.closed) this.events.exit(this.exitCode ?? code);
      });
    } catch (error) {
      this.events.error(error instanceof Error ? error.message : String(error));
    }
  }

  acknowledge(length: number): void {
    this.outputBytes = Math.max(0, this.outputBytes - length);
    if (this.outputBytes < 65536) this.process?.stdout.resume();
  }

  private send(message: object): void {
    const input = this.process?.stdin;
    if (!input || input.destroyed || this.closed) return;
    if (input.writableLength > 4 * 1024 * 1024) {
      this.events.error('Input queue is full. Wait before pasting more text.');
      return;
    }
    input.write(JSON.stringify(message) + '\n');
  }

  write(data: string): void {
    const bytes = Buffer.from(data, 'utf8');
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      this.send({ type: 'input', data: bytes.subarray(offset, offset + 32768).toString('base64') });
    }
  }

  resize(cols: number, rows: number): void {
    this.send({ type: 'resize', cols, rows });
  }

  dispose(): void {
    if (this.closed) return;
    const child = this.process;
    this.send({ type: 'close' });
    this.closed = true;
    if (!child) return;
    child.stdout.resume();
    child.stdin.end();
    if (process.platform !== 'win32') child.kill('SIGTERM');
    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }, 3000);
    timer.unref();
    child.once('close', () => clearTimeout(timer));
  }
}
