# Development

Requires Node.js 22 or later and Python 3. Windows also needs `pywinpty>=3.0,<4` installed in that interpreter.

```sh
npm ci
npm test
npm run format:check
npm run build
npm run install:plugin -- "/path/to/vault"
```

The installer copies the build to `.obsidian/plugins/sidebar-terminal/` and preserves existing settings. Enable Sidebar Terminal under Community plugins. The manual installer currently expects the vault's default `.obsidian` configuration directory.

## Live reload

Enable Obsidian's CLI in Settings → General → Advanced, then run:

```sh
npm run dev -- "/path/to/vault"
```

The watcher checks types, lint and source line limits, builds, installs and reloads this plugin. It does not restart the vault. Each successful reload ends this plugin's terminal processes; saved layouts return with Start buttons. An optional second argument selects the Obsidian CLI executable.

## Live checks

Run these only against a development vault; they temporarily create tabs and change focus. They close their own tabs afterward.

```sh
node scripts/smoke.mjs "Vault name"
node scripts/smoke-clipboard.mjs "Vault name"
node scripts/smoke-profiles.mjs "Vault name"
```

The first checks color queries, theme changes, a real shell, Unicode, splits, sizing, zoom, layout restoration and process cleanup. The clipboard check uses a temporary marker and restores the prior clipboard if it remains unchanged. The profile check starts installed Claude and Codex, interrupts them and verifies the configured Zsh prompt returns. These live scripts are for macOS development; the basic shell check also supports Linux. The CLI path can be supplied as the second argument.

Automated CI covers macOS, Linux and Windows. A configured CI matrix is not evidence of a successful run; run it before a public release, then perform the platform checks in [releasing.md](releasing.md).

See [architecture.md](architecture.md) for module responsibilities.
