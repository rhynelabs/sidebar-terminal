import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const { version } = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const repo = 'https://github.com/rhynelabs/sidebar-terminal';
const archive = 'dist/sidebar-terminal.zip';
execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [
  '-c',
  `import zipfile
from pathlib import Path
with zipfile.ZipFile('${archive}', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['main.js', 'manifest.json', 'styles.css']:
        archive.write(Path('dist') / name, 'sidebar-terminal/' + name)
`,
]);
const changelog = await readFile('CHANGELOG.md', 'utf8');
const section = changelog.split(`## ${version} · `)[1];
if (!section) throw new Error(`Missing changelog for ${version}`);
const changes = section.slice(section.indexOf('\n')).split('\n## ')[0].trim();
await writeFile(
  'dist/release-notes.md',
  `## AI agents, right inside Obsidian.

Run Claude Code, Codex and other terminal agents beside your notes, with native tabs and tmux-style splits.

![Claude Code above Codex beside an Obsidian note](${repo}/raw/${version}/docs/images/workspace.png)

### Install

**[Download Sidebar Terminal ${version}](${repo}/releases/download/${version}/sidebar-terminal.zip)** · [Usage & shortcuts](${repo}/blob/${version}/docs/usage.md)

1. Unzip the download.
2. Move the \`sidebar-terminal\` folder into your vault's \`.obsidian/plugins/\` folder.
3. Reload Obsidian and enable **Sidebar Terminal** in **Settings → Community plugins**.

Requires **Obsidian 1.13.1+** and **Python 3** on desktop. Windows also needs \`pywinpty>=3.0,<4\`. [Setup details](${repo}/blob/${version}/README.md#requirements).

### In this release

${changes}

---

The ZIP is the ready-to-install plugin. The three individual files below are provided for Obsidian and manual updates; GitHub's “Source code” archives are for development.
`,
);
console.log(`Packaged Sidebar Terminal ${version}: ${archive} and release notes.`);
