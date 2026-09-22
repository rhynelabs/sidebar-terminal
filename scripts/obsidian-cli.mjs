import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

/** Shared CLI transport for disposable live integration tests. */
export function obsidianCli(vault, binary) {
  if (!vault) throw new Error('Pass a vault name and optionally an Obsidian CLI path.');
  const cli =
    binary ||
    (process.platform === 'darwin' ? '/Applications/Obsidian.app/Contents/MacOS/Obsidian' : 'obsidian');
  async function evaluate(code) {
    const { stdout } = await execute(cli, [`vault=${vault}`, 'eval', `code=${code}`], { timeout: 15000 });
    const result = stdout.split('\n').find((line) => line.startsWith('=> '));
    if (!result && /(?:^|\n)Error:/.test(stdout)) throw new Error(stdout.trim());
    return result ? JSON.parse(result.slice(3)) : null;
  }
  async function waitFor(code, predicate, attempts = 80) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const value = await evaluate(code);
      if (predicate(value)) return value;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`Timed out: ${code}`);
  }
  return { evaluate, waitFor };
}
