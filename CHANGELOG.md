# Changelog

## 0.1.4 · 2026-09-24

- Drop notes, folders, files and text into a terminal to insert quoted paths instead of replacing the terminal with the note.
- Restart an ended shell under its output, and wait for a key press only when the shell keeps ending.
- Keep shells and jobs alive when a terminal tab closes; reopen the tab with the ribbon icon or the new **Reopen closed terminal tab** command.
- Save each pane's output when a tab closes or Obsidian quits and show it above the new shell after a restart, with a setting to turn this off.
- Remove the start button that xterm's link layer covered.
- Pass Cmd+Enter and Ctrl+Shift+Enter through to the running program; expand a pane from the command palette or with the tmux-style prefix instead.
- Fit terminal rows to the visible area so the bottom row is never cut off, and re-measure glyphs once the bundled font has loaded.

## 0.1.3 · 2026-09-23

- Automatically start fresh shells in restored tabs and split panes without replaying preset commands or moving keyboard focus.

## 0.1.2 · 2026-09-22

- Replace clipped scrollbar thumbs with transparent borders and background clipping.
- Remove important CSS declarations while keeping pane hiding and drag selection behavior.
- Sign release assets with GitHub build-provenance attestations.
- Publish only the three standard Obsidian assets; Community installation is now available.
- Document the exact filesystem and clipboard access used by the plugin.

## 0.1.1 · 2026-09-22

- Handle a ConPTY output-handle race when a Windows shell exits.
- Minified release bundles with readable version, source and license headers.
- One-download ZIP installation alongside the standard Obsidian assets.
- Clearer release pages with a workspace screenshot and installation steps.

## 0.1.0 · 2026-09-22

- Native sidebar and editor tabs with independent terminal sessions.
- Nested resizable splits, pane expansion and terminal keyboard shortcuts.
- Shell, Claude and Codex presets with return to the configured shell after exit.
- Theme-aware xterm rendering, bundled JetBrains Mono and continuous box glyphs.
- Selection-aware copy, bracketed paste and grouped context menus.
- Searchable settings with a responsive preset editor and optional advanced executable paths.
- Saved layout restoration without replaying commands.
- Unix PTY and Windows ConPTY transports, bundled in the standard three Obsidian release assets.
- MIT license and authorship by Rhynelabs.

Verification: automated checks pass on macOS, Linux and Windows; live Obsidian checks have been performed on macOS. Native Windows/Linux UI checks and Community directory review remain pending.
