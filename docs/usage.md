# Using Sidebar Terminal

A reference for shortcuts, presets, settings and session behavior. For installation, see the [README](../README.md).

## Keyboard shortcuts

These keys apply while a terminal has focus.

| Action                              | macOS         | Windows / Linux                 |
| ----------------------------------- | ------------- | ------------------------------- |
| New terminal tab                    | `⌘ T`         | `Ctrl Shift T`                  |
| Split right                         | `⌘ D`         | `Ctrl Shift D`                  |
| Split down                          | `⌘ Shift D`   | `Ctrl Shift E`                  |
| Close active pane                   | `⌘ W`         | `Ctrl Shift W`                  |
| Clear history, keep the prompt line | `⌘ K`         | `Ctrl Shift K`                  |
| Previous / next terminal tab        | `⌘ [` / `⌘ ]` | `Ctrl Shift [` / `Ctrl Shift ]` |
| Copy / paste                        | `⌘ C` / `⌘ V` | `Ctrl Shift C` / `Ctrl Shift V` |

`Ctrl C` copies when text is selected. With no selection, it interrupts the running program. Copy and Paste are also in the terminal's context menu. `Ctrl Shift C` / `Ctrl Shift V` and `Shift Insert` for paste work on macOS too.

Drag a divider to resize panes, or double-click it to balance the layout.

## Drag and drop

Drop a note, folder or a multi-selection from the file explorer into a terminal to insert its absolute path, quoted for your shell and followed by a space. Files from Finder or Explorer and dragged text work the same way. Dragging a tab header still moves the tab.

## Sessions

When a shell ends, its output stays and a new shell starts underneath a dimmed divider. If a shell keeps ending within seconds, the pane waits until you press a key. Closing a terminal tab keeps its shells and jobs; the ribbon icon or **Reopen closed terminal tab** brings the tab back with its output. **Close pane and its processes** ends a shell for good.

After Obsidian restarts or the plugin reloads, each pane shows its previous output above a fresh shell. The output is saved in `.obsidian/plugins/sidebar-terminal/scrollback/` when a tab closes or Obsidian quits, without alternate-screen programs such as editors or agents. **Settings → Sessions → Restore output after restart** turns this off and deletes the saved files.

### Tmux-style prefix

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

Press `Ctrl B` twice to send one `Ctrl B` to a real tmux process. Terminal shortcuts and prefix mode can be disabled separately in settings.

## Presets

Open **Settings → Sidebar Terminal → Presets** to edit names and commands or add your own. Claude and Codex are included as editable starting points; their CLI tools must be installed separately.

A plain **New terminal tab** always opens your normal shell. A preset submits its command once the Unix shell's interactive editor is ready, so it runs with the same configuration as a command you type yourself. When the tool exits, you return to that shell without rerunning shell startup. Ctrl+C is passed to the running tool, which decides whether to cancel an operation or exit.

The native tab menu groups tab actions, presets and split actions. Expanding a pane is available from the command palette and with the tmux-style prefix, so Enter combinations always reach programs such as Claude Code or Codex.

## Appearance

**Appearance** controls font, size, cursor and retained history in memory. The default font is the bundled JetBrains Mono. Leave the font field blank to use it, or enter the name of a locally installed font family.

The terminal is rendered with xterm.js, using GPU rendering when available and a built-in fallback. Background, default text and selection colors follow your Obsidian theme and update with light and dark mode. The standard 16-color palette is adapted from Ghostty's defaults with Obsidian's blue. Explicit 256-color and RGB output from applications is shown unchanged.

TUI programs get continuous box drawing, terminal color query responses and bracketed paste.

## Executable paths

**Advanced → Executable paths** provides optional Python and shell overrides. Leave both blank for automatic detection. On macOS, Homebrew installations are detected. If you choose a different Python on Windows, install `pywinpty>=3.0,<4` into that interpreter.

| Platform      | Default shell                                             |
| ------------- | --------------------------------------------------------- |
| macOS         | Your login shell, normally Zsh                            |
| Linux         | Your login shell, normally Bash                           |
| Windows 10/11 | PowerShell 7 when available, otherwise Windows PowerShell |

## Sessions and processes

- Switching tabs leaves their processes running.
- Closing a pane ends its shell and the child processes it owns. Closing a tab does this for every pane in it.
- Restarting Obsidian, or disabling or reloading the plugin, ends live sessions.
- Saved layouts restore tabs, splits, names and starting directories. Restored panes automatically start fresh shells; previous commands and preset commands are not replayed.
- A new split starts in the pane's configured starting directory, not in a directory you later changed to with `cd`.

Sidebar Terminal is a multiplexer interface, not a persistent tmux server. Run tmux inside a pane if you need sessions that survive closing Obsidian.

## Privacy and system access

Sidebar Terminal starts local processes and can use working directories outside the vault. It looks for Python and shell executables on your system, and shells load their usual configuration and history from your home directory. Programs you run have your normal operating-system permissions and may read or write files outside the vault.

The plugin has no telemetry, accounts, paid features or network service of its own, and it does not download or install anything. External tools such as Claude Code and Codex have their own accounts, network access and billing, and manage their own credentials. Ctrl/Cmd-clicking an HTTP(S) link in the terminal opens it in your browser.
