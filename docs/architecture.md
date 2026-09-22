# Architecture

Sidebar Terminal is a desktop Obsidian plugin by Rhynelabs. Each native Obsidian tab owns a split tree; each leaf of that tree owns an xterm.js instance and a Python PTY bridge. Tabs never share buffers or process transports.

| Module                      | Responsibility                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `src/main.ts`               | Register commands, native views, settings and lifecycle hooks.                     |
| `src/view.ts`               | Adapt one Obsidian ItemView to a terminal workspace; own its keyboard scope.       |
| `src/layout/tree.ts`        | Validate saved state and transform the split tree.                                 |
| `src/layout/workspace.ts`   | Create, select, split and dispose terminal panes.                                  |
| `src/layout/render.ts`      | Render the split tree and manage accessible dividers.                              |
| `src/terminal/pane.ts`      | Own terminal rendering, focus, sizing and a process session.                       |
| `src/terminal/session.ts`   | Spawn Python and transport bounded JSON messages over private stdio.               |
| `src/terminal/bridge.ts`    | Provide bundled Python sources without installing runtime files.                   |
| `src/terminal/runtime.ts`   | Resolve Python, shell paths and starting directories.                              |
| `src/terminal/keyboard.ts`  | Terminal shortcuts and the optional tmux-style prefix.                             |
| `src/terminal/clipboard.ts` | Selection-aware copy and bracketed paste.                                          |
| `src/terminal/theme.ts`     | Resolve Obsidian defaults while preserving explicit TUI colors.                    |
| `src/settings/`             | Validate settings and render native searchable groups and preset controls.         |
| `src/ui/`                   | Shared menus, detached DOM helpers and text prompts.                               |
| `bridge/`                   | Unix PTY, Windows ConPTY and owned-process cleanup.                                |
| `scripts/`                  | Build, release checks, installation and disposable live checks.                    |
| `tests/`                    | Layout, settings, keyboard, clipboard, terminal sequences and process integration. |

## Lifetime and cleanup

The workspace owns panes; panes own terminal instances and sessions. Closing a pane disposes its observer, renderer and bridge. Closing a tab disposes every pane. The Python bridge closes the PTY and terminates its owned process groups and descendants. Windows uses ConPTY and process-tree termination. Switching tabs leaves processes alive.

Unix presets wait until the configured shell's interactive line editor is ready before submitting their command once. This uses PTY input mode and the foreground process group, not a fixed startup delay. The same configured shell remains after the program exits. Windows PowerShell uses `-NoExit`; cmd uses `/k`.

A restored layout contains pane IDs, preset IDs, names and starting directories, not terminal output or runnable commands. Restored panes wait for an explicit start. A full Obsidian restart or plugin reload ends live processes.

## Rendering and input

xterm.js parses terminal sequences and answers capability and color queries. WebGL provides continuous box glyphs where available, with the built-in renderer as fallback. The default font is bundled JetBrains Mono. Explicit 256-color and RGB output is not recolored or contrast-adjusted.

One focused Obsidian Scope dispatches split/tab shortcuts. Clipboard keys also have an xterm input-boundary fallback; the same event is handled only once. Ctrl+C copies selected text and remains a program interrupt when no text is selected. Paste uses xterm's paste API, retaining bracketed-paste behavior.

## Distribution

Obsidian installs only `main.js`, `manifest.json` and `styles.css`. Python source is bundled as text into `main.js` and passed directly to an installed Python interpreter. Fonts are embedded in CSS. Full applicable license notices are embedded in the shipped assets. No dependency or executable is downloaded or installed by the plugin.

TypeScript uses strict checking, including indexed access. The build enforces at most 300 authored lines per source file and the official Obsidian ESLint rules. Generated bundles and dependency sources are excluded from the line limit.
