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

The watcher checks types, lint and source line limits, builds, installs and reloads this plugin. It does not restart the vault. Each successful reload ends this plugin's terminal processes; saved layouts return with their previous output above fresh shells, without replaying preset commands. An optional second argument selects the Obsidian CLI executable.

## Live checks

Run these only against a development vault; they temporarily create tabs and change focus. They close their own tabs afterward.

```sh
node scripts/smoke.mjs "Vault name"
node scripts/smoke-clipboard.mjs "Vault name"
node scripts/smoke-profiles.mjs "Vault name"
```

The first checks color queries, theme changes, a real shell, Unicode, splits, sizing, zoom, layout restoration and process cleanup. The clipboard check uses a temporary marker and restores the prior clipboard if it remains unchanged. The profile check starts installed Claude and Codex, exits them using interrupts or their exit command and verifies the configured Zsh prompt returns. These live scripts are for macOS development; the basic shell check also supports Linux. The CLI path can be supplied as the second argument.

Automated CI covers macOS, Linux and Windows. CI runs the automated checks on each platform. Hands-on Obsidian checks are tracked in [releasing.md](releasing.md).

## Source map

Each native Obsidian tab owns a split tree. Each pane owns its terminal renderer and its own process session.

| Location                     | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `src/main.ts`, `src/view.ts` | Obsidian commands, views and lifecycle                    |
| `src/layout/`                | Saved layout validation, splits and dividers              |
| `src/terminal/`              | xterm.js rendering, input, settings and process transport |
| `src/settings/`, `src/ui/`   | Settings, presets, menus and dialogs                      |
| `bridge/`                    | Unix PTY, Windows ConPTY and process cleanup              |
| `scripts/`, `tests/`         | Builds, installation and checks                           |

Closing a pane disposes its renderer and bridge. Closing a tab detaches its panes into the plugin's session registry, where they keep running until the tab is reopened, the plugin unloads or the window closes. Restored layouts contain preset IDs and starting directories, never executable commands. Terminal output is saved separately in the plugin folder and replayed above a fresh shell. The only undocumented Obsidian API in use is `app.dragManager.draggable`, read during drops to identify dragged vault items; without it, only files from the operating system and text can be dropped.

The three release files contain the Python bridge sources, fonts and dependency notices. Python itself must already be installed. Authored source files are limited to 300 lines; the build checks this alongside TypeScript and Obsidian lint rules.

For versioning and publishing, see [releasing.md](releasing.md).

The public repository uses free standard GitHub-hosted runners. Check jobs do not upload build artifacts or retain dependency caches. Release assets are built separately by the release workflow.
