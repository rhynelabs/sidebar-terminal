<div align="center">

# Sidebar Terminal for Obsidian

**A real terminal workspace for Obsidian.**

Native tabs · Resizable splits · Your shell · Your tools

[![Checks](https://github.com/rhynelabs/sidebar-terminal/actions/workflows/check.yml/badge.svg)](https://github.com/rhynelabs/sidebar-terminal/actions/workflows/check.yml)

**By Rhynelabs · MIT · Desktop**

[Get started](#get-started) · [Shortcuts](#keyboard-shortcuts) · [Presets](#presets) · [Development](docs/development.md)

</div>

---

Keep a shell beside your notes. Open independent terminal tabs, split them into resizable panes, and run Claude Code, Codex, or any other installed command-line tool.

Sidebar Terminal uses Obsidian's own tabs. Each pane has its own terminal buffer and process session, with no extra tab bar inside it.

## Make room for your workflow

|                            |                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Native tabs**            | Open terminals in the sidebar or editor and switch between them without stopping their jobs.       |
| **Nested splits**          | Split right or down, drag dividers, or double-click a divider to balance the layout.               |
| **Your shell**             | Use your configured interactive shell, including its prompt, aliases and startup configuration.    |
| **Command presets**        | Start an installed tool in a new tab. When it exits, continue in the same shell.                   |
| **Theme-aware appearance** | Obsidian backgrounds, bundled JetBrains Mono, configurable cursor and live light/dark changes.     |
| **TUI support**            | Continuous box drawing, terminal color queries, bracketed paste and unchanged explicit RGB output. |

## Get started

**Before installing:** Obsidian 1.13.1 or later and Python 3 are required. This plugin runs on desktop only.

| Platform      | Requirements                                  | Default shell                                             |
| ------------- | --------------------------------------------- | --------------------------------------------------------- |
| macOS         | Python 3; Homebrew installations are detected | Your login shell, normally Zsh                            |
| Linux         | Python 3                                      | Your login shell, normally Bash                           |
| Windows 10/11 | Python 3 and `pywinpty>=3.0,<4`               | PowerShell 7 when available, otherwise Windows PowerShell |

On Windows, install the ConPTY adapter for your Python interpreter:

```powershell
py -3 -m pip install "pywinpty>=3.0,<4"
```

### Install

The Community directory submission is being prepared; this README does not claim the plugin is already listed.

For a manual installation, download the three assets from a [GitHub release](https://github.com/rhynelabs/sidebar-terminal/releases), or build them using the [development guide](docs/development.md). Place these files in `<vault>/.obsidian/plugins/sidebar-terminal/`:

```text
main.js
manifest.json
styles.css
```

Enable **Sidebar Terminal** in Obsidian's Community plugins settings. Use the terminal ribbon icon or the **Open terminal workspace** command. To open one next to a note, use **Open terminal in editor**.

## Keyboard shortcuts

These keys apply while a terminal has focus.

| Action                              | macOS         | Windows / Linux                 |
| ----------------------------------- | ------------- | ------------------------------- |
| New terminal tab                    | `⌘ T`         | `Ctrl Shift T`                  |
| Split right                         | `⌘ D`         | `Ctrl Shift D`                  |
| Split down                          | `⌘ Shift D`   | `Ctrl Shift E`                  |
| Close active pane                   | `⌘ W`         | `Ctrl Shift W`                  |
| Clear history, keep the prompt line | `⌘ K`         | `Ctrl Shift K`                  |
| Expand / restore active pane        | `⌘ Enter`     | `Ctrl Shift Enter`              |
| Previous / next terminal tab        | `⌘ [` / `⌘ ]` | `Ctrl Shift [` / `Ctrl Shift ]` |
| Copy / paste                        | `⌘ C` / `⌘ V` | `Ctrl Shift C` / `Ctrl Shift V` |

**Ctrl+C copies when text is selected.** With no selection, it interrupts the running program. Copy and Paste are also in the terminal's context menu. `Ctrl Shift C/V` and `Shift Insert` for paste work on macOS too.

<details>
<summary><strong>Tmux-style controls</strong></summary>

Press `Ctrl B`, release, then:

| Key       | Action                       |
| --------- | ---------------------------- |
| `%` / `"` | Split right / down           |
| `c`       | New terminal tab             |
| `o`       | Next pane                    |
| `n` / `p` | Next / previous tab          |
| `z`       | Expand / restore active pane |
| `x`       | Close active pane            |
| `,`       | Rename active pane           |
| `Esc`     | Cancel prefix                |

Press `Ctrl B` twice to send one `Ctrl B` to a real tmux process. Terminal shortcuts and prefix mode can be disabled separately.

</details>

## Presets

Open **Settings → Sidebar Terminal → Presets** to edit names and commands or add another preset. Claude and Codex are included as editable starting points; their CLI tools must be installed separately.

A plain **New terminal tab** always opens your normal shell. A preset submits its command after the Unix shell's interactive editor is ready, so it uses the same configuration as a command you type yourself. Exiting or interrupting the tool returns to that shell, without replacing it or rerunning shell startup.

The native tab menu groups tab actions, presets and split actions. Expanding a pane remains available by keyboard shortcut and command palette.

<details>
<summary>Preview the settings</summary>

![Preset editor, appearance, keyboard and advanced settings in Obsidian](docs/images/settings.png)

</details>

## Appearance and advanced options

**Appearance** controls font, size, cursor and retained history. The default font is bundled JetBrains Mono. Leave the font field blank to use it, or enter a locally installed font family.

The terminal uses xterm.js, with GPU rendering when available and a built-in fallback. Its standard palette follows Ghostty's defaults with Obsidian's stronger blue. The background, default text and selection follow Obsidian. Explicit 256-color and RGB colors emitted by applications are preserved.

**Advanced → Executable paths** provides optional Python and shell overrides. Leave both blank for automatic detection. If you choose a different Python on Windows, install pywinpty into that interpreter.

## Sessions and process ownership

- Switching tabs leaves their processes running.
- Closing a pane ends its shell and owned child processes. Closing a tab does so for every pane in the tab.
- Restarting Obsidian, disabling the plugin or reloading it ends live sessions.
- Saved layouts restore tabs, splits, names and starting directories. Restored panes wait for Start; commands are not replayed automatically.
- Splits inherit the pane's configured starting directory, not subsequent `cd` commands.

This is a terminal multiplexer interface, not a persistent tmux server. Use actual tmux inside a pane if you need sessions that survive closing Obsidian.

## Privacy and system access

Sidebar Terminal starts local processes and can use working directories outside the vault. It looks for Python and shell executables on the system; shells load their usual configuration and history from your home directory. Programs you run have your normal operating-system permissions and may access files outside the vault.

The plugin has no telemetry, accounts, paid features or network service of its own. It does not download or install dependencies. External programs such as Claude Code and Codex have their own account, network and payment requirements. Opening an HTTP(S) terminal link with Ctrl/Cmd-click opens that address in your browser. Credentials remain under each CLI tool's own management.

## Development and release status

[Development guide](docs/development.md) · [Architecture](docs/architecture.md) · [Release checklist](docs/releasing.md) · [Changelog](CHANGELOG.md)

macOS has been tested live in Obsidian. Linux and Windows adapters and CI jobs are included; native platform verification remains part of the release checklist. All authored source files are limited to 300 lines. Builds enforce strict TypeScript checking, the official Obsidian lint rules and the file-size limit.

## License

**Copyright © 2026 Rhynelabs. Sidebar Terminal is licensed under MIT.** See [LICENSE](LICENSE).

Bundled xterm.js dependencies retain their MIT notices. JetBrains Mono retains its SIL Open Font License. Those notices are included in the shipped assets and [third-party notices](THIRD-PARTY-NOTICES.txt). Independently installed pywinpty is MIT licensed.
