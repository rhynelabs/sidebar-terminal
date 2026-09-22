import { build, transform } from 'esbuild';
import { mkdir, rm, readFile, writeFile, copyFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  external: ['obsidian', 'electron'],
  loader: { '.py': 'text' },
  minify: false,
  legalComments: 'eof',
});
const css = [
  await readFile('node_modules/@xterm/xterm/css/xterm.css', 'utf8'),
  await readFile('src/styles.css', 'utf8'),
  await readFile('src/settings/settings.css', 'utf8'),
];
for (const weight of [400, 700])
  for (const style of ['normal', 'italic']) {
    const bytes = await readFile(
      `node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-${style}.woff2`,
    );
    css.push(
      `@font-face { font-family: 'Sidebar Terminal Mono'; font-style: ${style}; font-weight: ${weight}; font-display: block; src: url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2'); }`,
    );
  }
await writeFile(
  'dist/styles.css',
  (
    await transform(css.join('\n'), {
      loader: 'css',
      minify: true,
    })
  ).code,
);
for (const file of ['manifest.json', 'LICENSE', 'README.md']) {
  await copyFile(file, `dist/${file}`);
}
const notices = [];
for (const name of [
  '@xterm/xterm',
  '@xterm/addon-fit',
  '@xterm/addon-webgl',
  '@xterm/addon-web-links',
  '@fontsource/jetbrains-mono',
]) {
  notices.push(`${name}\n\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`);
}
await writeFile('dist/THIRD-PARTY-NOTICES.txt', notices.join('\n\n'));
const bundledNotices = `\n/*!\n${await readFile('LICENSE', 'utf8')}\n\n${notices.join('\n\n').replaceAll('*/', '* /')}\n*/\n`;
await writeFile('dist/main.js', (await readFile('dist/main.js', 'utf8')) + bundledNotices);
await writeFile('dist/styles.css', (await readFile('dist/styles.css', 'utf8')) + bundledNotices);
console.log('Built the three Obsidian release assets with embedded bridge and licenses.');
