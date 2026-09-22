import { FileSystemAdapter, Plugin, TFolder, type WorkspaceLeaf } from 'obsidian';
import { join } from 'node:path';
import { DEFAULTS, readSettings, type Settings } from './settings/model';
import { TerminalSettingsTab } from './settings/tab';
import { TerminalView, VIEW_TYPE } from './view';

export default class SidebarTerminalPlugin extends Plugin {
  settings: Settings = structuredClone(DEFAULTS);

  get vaultPath(): string {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) throw new Error('Sidebar Terminal needs a desktop vault.');
    return adapter.getBasePath();
  }

  async onload(): Promise<void> {
    this.settings = readSettings(await this.loadData());
    this.registerView(VIEW_TYPE, (leaf) => new TerminalView(leaf, this));
    this.app.workspace.onLayoutReady(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) void leaf.loadIfDeferred();
    });
    this.addSettingTab(new TerminalSettingsTab(this));
    this.addRibbonIcon('terminal', 'Open terminal workspace', () => {
      void this.open();
    });
    this.addCommand({
      id: 'open',
      name: 'Open terminal workspace',
      callback: () => {
        void this.open();
      },
    });
    this.addCommand({
      id: 'new-tab',
      name: 'New terminal tab',
      callback: () => {
        void this.open('shell');
      },
    });
    this.addCommand({
      id: 'open-editor',
      name: 'Open terminal in editor',
      callback: () => {
        void this.open('shell', undefined, true);
      },
    });
    for (const direction of ['right', 'down'] as const) {
      this.addCommand({
        id: `split-${direction}`,
        name: `Split terminal ${direction}`,
        checkCallback: (checking) => {
          const view = this.app.workspace.getActiveViewOfType(TerminalView);
          if (!view) return false;
          if (!checking) view.workspace.split(direction);
          return true;
        },
      });
    }
    const actions = [
      ['next-pane', 'Focus next pane', (view: TerminalView) => view.workspace.nextPane()],
      ['zoom', 'Toggle pane zoom', (view: TerminalView) => view.workspace.toggleZoom()],
      ['close-pane', 'Close active pane', (view: TerminalView) => view.workspace.closePane()],
    ] as const;
    for (const [id, name, action] of actions)
      this.addCommand({
        id,
        name,
        checkCallback: (checking) => {
          const view = this.app.workspace.getActiveViewOfType(TerminalView);
          if (!view) return false;
          if (!checking) action(view);
          return true;
        },
      });
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        const folder = file instanceof TFolder ? file.path : (file.parent?.path ?? '');
        menu.addItem((item) =>
          item
            .setTitle('Open terminal here')
            .setIcon('terminal')
            .onClick(() => {
              void this.open('shell', join(this.vaultPath, folder));
            }),
        );
      }),
    );
    this.registerObsidianProtocolHandler('sidebar-terminal', () => {
      void this.open();
    });
  }

  async open(profile?: string, cwd?: string, editor = false, beside?: WorkspaceLeaf): Promise<TerminalView> {
    let leaf = !profile && !editor ? this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] : undefined;
    if (!leaf) {
      if (beside) {
        this.app.workspace.setActiveLeaf(beside, { focus: false });
        editor = this.app.workspace.rootSplit === beside.getRoot();
      }
      leaf = editor
        ? this.app.workspace.getLeaf('tab')
        : (this.app.workspace.getRightLeaf(false) ?? undefined);
      if (!leaf) throw new Error('Could not create a terminal workspace.');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    const view = leaf.view as TerminalView;
    if (!view.workspace.state.root) view.workspace.initialize(profile ?? 'shell', cwd);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    view.workspace.activePane?.focus();
    return view;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof TerminalView) leaf.view.refreshAppearance();
    }
  }

  async onExternalSettingsChange(): Promise<void> {
    this.settings = readSettings(await this.loadData());
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof TerminalView) leaf.view.refreshAppearance();
    }
  }

  onunload(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof TerminalView) leaf.view.workspace.dispose();
    }
  }
}
