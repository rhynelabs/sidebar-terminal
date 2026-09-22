import { cp, mkdir, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const vault = process.argv[2];
if (!vault) throw new Error('Usage: npm run install:plugin -- /absolute/vault/path');
const configDir = join(resolve(vault), '.obsidian');
await access(configDir);
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const destination = join(configDir, 'plugins', manifest.id);
await mkdir(destination, { recursive: true });
await cp('dist', destination, { recursive: true });
console.log(`Installed ${manifest.name} ${manifest.version} at ${destination}`);
console.log('Enable the plugin in Obsidian Settings → Community plugins.');
