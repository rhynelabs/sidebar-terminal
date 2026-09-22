import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';

const vault = process.argv[2];
if (!vault) throw new Error('Usage: npm run dev -- /path/to/vault [obsidian-cli-path]');
const cli =
  process.argv[3] ||
  (process.platform === 'darwin' ? '/Applications/Obsidian.app/Contents/MacOS/Obsidian' : 'obsidian');
const target = `vault=${basename(resolve(vault))}`;
let queued = false;
let building = false;
let timer;

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${binary} exited ${code}`))));
  });
}

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    // Never replace the installed build when type checking or linting fails.
    await run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
    await run(process.execPath, ['node_modules/eslint/bin/eslint.js', 'src', '--max-warnings', '0']);
    await run(process.execPath, ['scripts/check-lines.mjs']);
    await run(process.execPath, ['scripts/build.mjs']);
    await run(process.execPath, ['scripts/install.mjs', vault]);
    await run(cli, [target, 'plugin:reload', 'id=sidebar-terminal']);
    await run(cli, [
      target,
      'eval',
      'code=Promise.all(app.workspace.getLeavesOfType("sidebar-terminal-workspace").map(leaf=>leaf.loadIfDeferred())); null',
    ]);
    console.log(
      `[${new Date().toLocaleTimeString()}] Sidebar Terminal reloaded. Existing terminal jobs ended.`,
    );
  } catch (error) {
    console.error(error.message);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      void rebuild();
    }
  }
}

const watchers = ['src', 'bridge', 'manifest.json'].map((path) =>
  watch(path, { recursive: true }, (_event, name) => {
    if (name && /(__pycache__|\.pyc$)/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 300);
  }),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    process.exit(0);
  });
console.log('Watching source. Each successful rebuild reloads only Sidebar Terminal. Ctrl+C stops.');
await rebuild();
