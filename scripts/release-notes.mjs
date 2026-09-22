import { readFile, writeFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const repo = 'https://github.com/rhynelabs/sidebar-terminal';
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

**[Add to Obsidian](https://community.obsidian.md/plugins/sidebar-terminal)** · [Usage & shortcuts](${repo}/blob/${version}/docs/usage.md)

Find **Sidebar Terminal** under **Settings → Community plugins → Browse**, then install and enable it.

Requires **Obsidian 1.13.1+** and **Python 3** on desktop. Windows also needs \`pywinpty>=3.0,<4\`. [Setup details](${repo}/blob/${version}/README.md#requirements).

### In this release

${changes}

---

For manual installation, place the three files below in your vault’s \`.obsidian/plugins/sidebar-terminal/\` folder. GitHub's “Source code” archives are for development.
`,
);
console.log(`Prepared release notes for Sidebar Terminal ${version}.`);
