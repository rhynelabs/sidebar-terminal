import { App, Menu } from 'obsidian';
import { TextPrompt } from './prompt';
import type { TerminalWorkspace } from '../layout/workspace';
import type { Settings } from '../settings/model';

export function profileMenu(event: MouseEvent, settings: Settings, create: (id: string) => void): void {
  const menu = new Menu();
  for (const profile of settings.profiles) {
    menu.addItem((item) =>
      item
        .setTitle(profile.name)
        .setIcon('terminal')
        .onClick(() => create(profile.id)),
    );
  }
  menu.showAtMouseEvent(event);
}

export function paneMenu(app: App, event: MouseEvent, workspace: TerminalWorkspace): void {
  const menu = new Menu();
  menu.addItem((item) =>
    item
      .setTitle('Copy')
      .setIcon('copy')
      .setDisabled(!workspace.activePane?.terminal.getSelection())
      .onClick(() => workspace.activePane?.clipboard.copy()),
  );
  menu.addItem((item) =>
    item
      .setTitle('Paste')
      .setIcon('clipboard-paste')
      .onClick(() => workspace.activePane?.clipboard.paste()),
  );
  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle('New terminal tab')
      .setIcon('plus')
      .onClick(() => workspace.newTab()),
  );
  menu.addItem((item) =>
    item
      .setTitle('Rename pane')
      .setIcon('pencil')
      .onClick(() => workspace.actions.rename()),
  );
  menu.addItem((item) =>
    item
      .setTitle('Split right')
      .setIcon('columns-2')
      .onClick(() => workspace.split('right')),
  );
  menu.addItem((item) =>
    item
      .setTitle('Split down')
      .setIcon('rows-2')
      .onClick(() => workspace.split('down')),
  );
  menu.addItem((item) =>
    item
      .setTitle('New tab in directory…')
      .setIcon('folder')
      .onClick(() => {
        new TextPrompt(app, 'Working directory', workspace.activePane?.spec.cwd ?? '', (value) =>
          workspace.newTab('shell', value),
        ).open();
      }),
  );
  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle('Clear scrollback')
      .setIcon('eraser')
      .onClick(() => workspace.actions.clear()),
  );
  menu.addItem((item) =>
    item
      .setTitle('Close pane and its processes')
      .setIcon('x')
      .onClick(() => workspace.closePane()),
  );
  menu.showAtMouseEvent(event);
}

/** Separate native-tab actions, command presets and terminal splits. */
export function terminalTabMenu(
  menu: Menu,
  settings: Settings,
  workspace: TerminalWorkspace,
  rename: () => void,
): void {
  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle('New terminal tab')
      .setIcon('plus')
      .onClick(() => workspace.newTab()),
  );
  menu.addItem((item) => item.setTitle('Rename terminal tab').setIcon('pencil').onClick(rename));
  const profiles = settings.profiles.filter((profile) => profile.id !== 'shell');
  if (profiles.length) {
    menu.addSeparator();
    for (const profile of profiles) {
      menu.addItem((item) =>
        item
          .setTitle(`New ${profile.name} terminal`)
          .setIcon('terminal')
          .onClick(() => workspace.newTab(profile.id)),
      );
    }
  }
  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle('Split right')
      .setIcon('columns-2')
      .onClick(() => workspace.split('right')),
  );
  menu.addItem((item) =>
    item
      .setTitle('Split down')
      .setIcon('rows-2')
      .onClick(() => workspace.split('down')),
  );
}
