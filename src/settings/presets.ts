import { setTooltip, type Setting, type SettingDefinitionGroup } from 'obsidian';
import type SidebarTerminalPlugin from '../main';
import { id } from '../layout/tree';
import { element, iconButton } from '../ui/elements';
import type { Profile } from './model';

const UNTITLED = 'Untitled preset';

/** Builds the presets group: one card per custom preset and an add row. */
export class PresetEditor {
  private focusId = '';

  constructor(
    private plugin: SidebarTerminalPlugin,
    private refresh: () => void,
  ) {}

  definition(): SettingDefinitionGroup {
    const custom = this.plugin.settings.profiles.filter((p) => p.id !== 'shell');
    return {
      type: 'group',
      heading: 'Presets',
      cls: 'ot-presets',
      items: [
        ...custom.map((profile) => ({
          name: profile.name || UNTITLED,
          aliases: ['preset', 'profile', profile.command].filter(Boolean),
          render: (setting: Setting) => this.renderCard(setting, profile.id),
        })),
        {
          name: 'Add preset',
          desc: 'Start any installed command-line tool in a new terminal pane.',
          aliases: ['new preset', 'profile'],
          render: (setting) => this.renderAdd(setting),
        },
      ],
    };
  }

  private find(profileId: string): Profile | undefined {
    return this.plugin.settings.profiles.find((p) => p.id === profileId);
  }

  private renderAdd(setting: Setting): void {
    setting
      .setName('Add preset')
      .setDesc('Start any installed command-line tool in a new terminal pane.')
      .addButton((button) =>
        button
          .setButtonText('Add preset')
          .setTooltip('Add preset')
          .onClick(() => void this.add()),
      );
  }

  private renderCard(setting: Setting, profileId: string): void {
    const profile = this.find(profileId);
    if (!profile) return;
    const el = setting.settingEl;
    const doc = el.doc;
    el.empty();
    el.addClass('ot-preset');

    const fields = element(doc, 'div', 'ot-preset-fields');
    const name = this.field(fields, 'Name', profile.name, UNTITLED);
    const command = this.field(fields, 'Command', profile.command, 'e.g. claude');
    command.addClass('ot-preset-command');
    const remove = iconButton(
      doc,
      'trash-2',
      this.removeLabel(profile.name),
      () => void this.remove(profileId),
    );
    remove.addClass('ot-preset-remove');
    el.append(fields, remove);

    name.addEventListener('input', () => {
      const current = this.find(profileId);
      if (current) current.name = name.value;
      const label = this.removeLabel(name.value);
      remove.setAttribute('aria-label', label);
      setTooltip(remove, label);
    });
    name.addEventListener('change', () => {
      const current = this.find(profileId);
      if (!current) return;
      if (!name.value.trim()) name.value = UNTITLED;
      current.name = name.value.trim();
      void this.plugin.saveSettings();
    });
    command.addEventListener('input', () => {
      const current = this.find(profileId);
      if (current) current.command = command.value;
    });
    command.addEventListener('change', () => void this.plugin.saveSettings());

    if (this.focusId === profileId) {
      this.focusId = '';
      doc.win.requestAnimationFrame(() => {
        name.focus();
        name.select();
      });
    }
  }

  private field(parent: HTMLElement, label: string, value: string, placeholder: string): HTMLInputElement {
    const doc = parent.doc;
    const wrapper = element(doc, 'label', 'ot-preset-field');
    const input = element(doc, 'input');
    input.type = 'text';
    input.spellcheck = false;
    input.value = value;
    input.placeholder = placeholder;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }
    });
    wrapper.append(element(doc, 'span', 'ot-preset-label', label), input);
    parent.appendChild(wrapper);
    return input;
  }

  private removeLabel(name: string): string {
    return `Remove ${name.trim() || UNTITLED}`;
  }

  private async add(): Promise<void> {
    const profile = { id: id(), name: 'New preset', command: '' };
    this.plugin.settings.profiles.push(profile);
    this.focusId = profile.id;
    await this.plugin.saveSettings();
    this.refresh();
  }

  private async remove(profileId: string): Promise<void> {
    this.plugin.settings.profiles = this.plugin.settings.profiles.filter((p) => p.id !== profileId);
    await this.plugin.saveSettings();
    this.refresh();
  }
}
