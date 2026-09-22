import { readdir, readFile } from 'node:fs/promises';

async function check(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${file.name}`;
    if (file.isDirectory() && file.name !== '__pycache__') await check(path);
    else if (/\.(ts|py|mjs|css)$/.test(file.name)) {
      const lines = (await readFile(path, 'utf8')).trimEnd().split('\n').length;
      if (lines > 300) throw new Error(`${path}: ${lines} lines, maximum 300`);
    }
  }
}
for (const dir of ['src', 'bridge', 'scripts', 'tests']) await check(dir);
console.log('All authored source files are at most 300 lines.');
