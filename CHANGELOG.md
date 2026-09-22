# Changelog

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
