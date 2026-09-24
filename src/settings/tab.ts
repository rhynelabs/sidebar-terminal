import { Platform, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import type SidebarTerminalPlugin from '../main';
import { DEFAULTS, readSettings } from './model';
import { PresetEditor } from './presets';

const BUNDLED_FONT = 'JetBrains Mono';

const SPLIT_KEYS = Platform.isMacOS
  ? 'Cmd+D splits right, Cmd+Shift+D splits down.'
  : 'Ctrl+Shift+D splits right, Ctrl+Shift+E splits down.';

/** Declarative definitions integrate with Obsidian 1.13's settings search. */
export class TerminalSettingsTab extends PluginSettingTab {
  private presets: PresetEditor;

  constructor(private plugin: SidebarTerminalPlugin) {
    super(plugin.app, plugin);
    this.presets = new PresetEditor(plugin, () => this.update());
  }

  getControlValue(key: string): unknown {
    const value: unknown = Reflect.get(this.plugin.settings, key);
    // The bundled font is registered under an internal alias; show it as blank instead.
    if (key === 'fontFamily' && value === DEFAULTS.fontFamily) return '';
    return value;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === 'fontFamily' && typeof value === 'string') {
      const font = value.trim();
      value = !font || font.toLowerCase() === BUNDLED_FONT.toLowerCase() ? DEFAULTS.fontFamily : value;
    }
    this.plugin.settings = readSettings({ ...this.plugin.settings, [key]: value });
    await this.plugin.saveSettings();
    if (key === 'restoreScrollback' && !value) await this.plugin.history.prune(new Set());
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      this.presets.definition(),
      {
        type: 'group',
        heading: 'Appearance',
        items: [
          {
            name: 'Font family',
            desc: `Leave blank for the bundled ${BUNDLED_FONT}, or enter an installed font family.`,
            aliases: ['typeface', BUNDLED_FONT],
            control: { type: 'text', key: 'fontFamily', placeholder: BUNDLED_FONT },
          },
          {
            name: 'Font size',
            control: {
              type: 'slider',
              key: 'fontSize',
              min: 9,
              max: 32,
              step: 1,
              displayFormat: (value) => `${value}px`,
            },
          },
          {
            name: 'Cursor shape',
            control: {
              type: 'dropdown',
              key: 'cursorStyle',
              options: { bar: 'Bar', block: 'Block', underline: 'Underline' },
            },
          },
          { name: 'Blinking cursor', control: { type: 'toggle', key: 'cursorBlink' } },
          {
            name: 'Scrollback lines',
            desc: 'Lines of history kept per pane, from 1,000 to 100,000.',
            aliases: ['history', 'buffer'],
            control: {
              type: 'number',
              key: 'scrollback',
              min: 1000,
              max: 100000,
              step: 1000,
              validate: (value) =>
                value >= 1000 && value <= 100000 ? undefined : 'Choose 1,000 to 100,000 lines.',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Keyboard',
        items: [
          {
            name: 'Terminal shortcuts',
            desc: `${SPLIT_KEYS} Active only while a terminal has focus.`,
            aliases: ['hotkeys', 'split pane'],
            control: { type: 'toggle', key: 'shortcuts' },
          },
          {
            name: 'Tmux-style prefix',
            desc: 'Press Ctrl+B, then % or " to split, C for a new tab, O to switch pane, N or P to switch tab, Z to zoom, X to close. Ctrl+B twice passes through to tmux.',
            aliases: ['hotkeys', 'prefix key'],
            control: { type: 'toggle', key: 'tmuxKeys' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Sessions',
        items: [
          {
            name: 'Restore output after restart',
            desc: 'Save each pane’s terminal output in this vault’s plugin folder when a tab closes or Obsidian quits, and show it above the new shell. Turn off to keep terminal output out of the vault.',
            aliases: ['scrollback', 'history', 'persist'],
            control: { type: 'toggle', key: 'restoreScrollback' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Advanced',
        items: [
          {
            type: 'page',
            name: 'Executable paths',
            desc: 'Override automatic detection of Python and your shell.',
            displayValue: () =>
              this.plugin.settings.python || this.plugin.settings.shell ? 'Custom' : 'Automatic',
            items: [
              {
                type: 'group',
                items: [
                  {
                    name: 'Python executable',
                    desc: 'Full path to Python 3. Leave blank to detect it automatically. Windows also requires pywinpty.',
                    aliases: ['python3', 'interpreter'],
                    control: { type: 'text', key: 'python', placeholder: 'Automatic' },
                  },
                  {
                    name: 'Shell executable',
                    desc: 'Full path without arguments. Leave blank to use your login shell, or PowerShell on Windows.',
                    aliases: ['zsh', 'bash', 'powershell'],
                    control: { type: 'text', key: 'shell', placeholder: 'Automatic' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
  }
}
