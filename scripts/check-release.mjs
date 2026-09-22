import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const manifest = await json('manifest.json');
const pkg = await json('package.json');
const versions = await json('versions.json');
assert.equal(manifest.author, 'Rhynelabs');
assert.equal(pkg.author, 'Rhynelabs');
assert.equal(pkg.license, 'MIT');
assert.equal(pkg.version, manifest.version);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.match(manifest.id, /^[a-z0-9-]+$/);
assert.ok(!/obsidian/i.test(manifest.id + manifest.name));
assert.ok(manifest.description.length <= 250 && manifest.description.endsWith('.'));
assert.equal(manifest.isDesktopOnly, true);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.deepEqual(await json('dist/manifest.json'), manifest);
for (const file of ['main.js', 'manifest.json', 'styles.css']) {
  assert.ok((await stat(`dist/${file}`)).size > 0, `Missing release asset ${file}`);
}
const main = await readFile('dist/main.js', 'utf8');
const css = await readFile('dist/styles.css', 'utf8');
for (const text of [main, css]) {
  assert.ok(text.includes('Copyright (c) 2026 Rhynelabs'));
  assert.ok(text.includes('SIL OPEN FONT LICENSE'));
  assert.ok(!text.includes('/Users/'), 'Local absolute path leaked into an asset');
}
assert.ok(main.includes('sources = json.loads(sys.argv.pop(1))'), 'Python bridge is not bundled');
assert.ok(css.includes('data:font/woff2;base64,'), 'Font is not bundled');
const notice = await readFile('THIRD-PARTY-NOTICES.txt', 'utf8');
assert.equal(notice, await readFile('dist/THIRD-PARTY-NOTICES.txt', 'utf8'));
if (process.env.RELEASE_TAG)
  assert.equal(process.env.RELEASE_TAG, manifest.version, 'Tag must match manifest.version, without v');
console.log(
  `Release structure checked: ${manifest.name} ${manifest.version}, Rhynelabs, MIT, three self-contained assets.`,
);
