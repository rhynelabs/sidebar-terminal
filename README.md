# Sidebar Terminal

### AI agents, right inside Obsidian.

Run **Claude Code, Codex and other terminal agents** beside your notes. Keep your research, project plans and agent sessions in one workspace.

![Claude Code above Codex, beside an Obsidian note](docs/images/workspace.png)

[Install](#install) · [Usage](docs/usage.md) · [Shortcuts](docs/usage.md#keyboard-shortcuts) · [Development](docs/development.md)

## Work with agents beside your notes

Ask an agent to work with your notes while you keep the outline open. Give each project its own terminal tab, or split a tab to run several tools side by side. Presets launch your installed CLIs; when a tool exits, the shell stays open for the next command.

Need a script, a Git command or an ordinary shell? Those work here too.

## Built for Obsidian

- **Native tabs and splits.** Open several terminals as Obsidian tabs and split them right or down. Switching tabs keeps their jobs running.
- **Your shell.** Starts your configured interactive shell with its prompt, aliases and startup files.
- **Presets.** Launch an installed CLI in a new tab. When it exits, you are back in the same shell.
- **Split with a shortcut.** `⌘ D` splits right; `⌘ Shift D` splits down. Resize with a drag, or use the optional tmux-style prefix. [All shortcuts →](docs/usage.md#keyboard-shortcuts)
- **Theme-aware.** Background, text and selection follow your Obsidian theme. Explicit RGB colors from TUI programs are shown unchanged.

Rendering uses xterm.js with bundled JetBrains Mono.

<details>
<summary>Settings screenshot</summary>
<br>

![Preset editor, appearance, keyboard and advanced settings in Obsidian](docs/images/settings.png)

</details>

## Requirements

- Obsidian 1.13.1 or later, desktop only
- Python 3
- Windows 10/11 only: `pywinpty>=3.0,<4` installed for that Python

```powershell
py -3 -m pip install "pywinpty>=3.0,<4"
```

## Install

Sidebar Terminal is not listed in the Community plugins directory yet. Install it manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/rhynelabs/sidebar-terminal/releases/latest).
2. Create `<vault>/.obsidian/plugins/sidebar-terminal/` and put the three files inside.
3. Reload Obsidian and enable **Sidebar Terminal** under **Settings → Community plugins**.

Open a terminal with the ribbon icon or the **Open terminal workspace** command. To open one next to a note, use **Open terminal in editor**.

## Good to know

- **Sessions.** Closing a pane or tab ends its shell and the processes it owns. Quitting Obsidian or reloading the plugin ends all sessions.
- **Restored layouts.** Tabs, splits, names and starting directories come back after a restart. Each pane waits for you to press Start; nothing is replayed automatically.
- **Working directories.** New splits open in the pane's configured starting directory, not wherever you last moved with `cd`.
- **System access.** Shells, their configuration and the files your programs touch can live outside the vault. Programs run with your normal user permissions.
- **Privacy.** The plugin has no network service, telemetry or accounts of its own, and downloads nothing. External CLIs such as Claude Code or Codex have their own accounts, network access and billing.

More detail on presets, appearance, executable paths and sessions is in [docs/usage.md](docs/usage.md).

## Status

This is an early release (0.1.0). It has been tested live in Obsidian on macOS. Windows and Linux adapters are included, but hands-on checks in Obsidian on those platforms are still pending. Automated platform checks run on GitHub.

Issues and pull requests are welcome. See the [development guide](docs/development.md) and [changelog](CHANGELOG.md).

## License

Copyright © 2026 Rhynelabs. Released under the [MIT License](LICENSE).

Bundled xterm.js packages keep their MIT notices and JetBrains Mono keeps its SIL Open Font License. See [third-party notices](THIRD-PARTY-NOTICES.txt). pywinpty is installed separately and is MIT licensed.

Sidebar Terminal is an independent project and is not affiliated with or endorsed by Obsidian.
