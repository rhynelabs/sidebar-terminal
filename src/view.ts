import { ItemView, Scope, Menu, type WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import type SidebarTerminalPlugin from './main';
import { TerminalWorkspace } from './layout/workspace';
import { panes } from './layout/tree';
import { renderLayout } from './layout/render';
import { element } from './ui/elements';
import { TextPrompt } from './ui/prompt';
import { paneMenu, profileMenu, terminalTabMenu } from './ui/menus';

export const VIEW_TYPE = 'sidebar-terminal-workspace';

export class TerminalView extends ItemView {
  readonly workspace: TerminalWorkspace;
  private body: HTMLElement;
  private renderCleanups: (() => void)[] = [];
  private visible = false;
  private scopePushed = false;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SidebarTerminalPlugin,
  ) {
    super(leaf);
    const doc = this.contentEl.ownerDocument;
    this.registerDomEvent(this.contentEl, 'focusin', () => {
      if (!this.scopePushed && this.scope) {
        this.app.keymap.pushScope(this.scope);
        this.scopePushed = true;
      }
    });
    this.registerDomEvent(this.contentEl, 'focusout', () => {
      queueMicrotask(() => {
        if (!this.hasTerminalFocus()) this.releaseScope();
      });
    });
    this.register(() => this.releaseScope());
    this.contentEl.classList.add('ot-workspace');
    this.body = element(doc, 'div', 'ot-body');
    this.workspace = new TerminalWorkspace({
      doc,
      cwd: plugin.vaultPath,
      settings: () => plugin.settings,
      registry: plugin.sessions,
      history: plugin.history,
      dragged: () => (this.app as unknown as { dragManager?: { draggable: unknown } }).dragManager?.draggable,
      render: () => this.render(),
      save: () => this.app.workspace.requestSaveLayout(),
      rename: () => this.rename(),
      menu: (event) => paneMenu(this.app, event, this.workspace),
      newTab: (profile, cwd) => {
        void plugin.open(profile ?? 'shell', cwd, false, this.leaf);
      },
      nextTab: (delta) => this.nextTab(delta),
      closeTab: () => this.leaf.detach(),
    });
    this.scope = new Scope(this.app.scope);
    this.scope.register(null, null, (event) => {
      if (!this.hasTerminalFocus()) return;
      if (this.workspace.activePane?.clipboard.handle(event)) return false;
      if (this.workspace.activePane?.keyboard.handle(event) === false) return false;
    });
  }

  getViewType(): string {
    return VIEW_TYPE;
  }
  getDisplayText(): string {
    return this.workspace?.state.title || 'Terminal';
  }
  getIcon(): string {
    return 'terminal';
  }
  getState(): Record<string, unknown> {
    return { ...this.workspace.state };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.workspace.restore(state);
    await super.setState(state, result);
    if (this.workspace.state.root) this.plugin.pruneHistory();
  }

  async onOpen(): Promise<void> {
    this.visible = true;
    this.contentEl.replaceChildren(this.body);
    this.addAction('plus', 'New terminal tab', () => this.workspace.newTab());
    this.addAction('chevron-down', 'Choose terminal profile', (event) => {
      profileMenu(event, this.plugin.settings, (id) => this.workspace.newTab(id));
    });
    this.addAction('columns-2', 'Split right', () => this.workspace.split('right'));
    this.addAction('rows-2', 'Split down', () => this.workspace.split('down'));
    this.registerEvent(this.app.workspace.on('css-change', () => this.refreshAppearance()));
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (leaf === this.leaf) this.workspace.activePane?.focus();
      }),
    );
    this.render();
  }

  hasTerminalFocus(): boolean {
    const focused = this.contentEl.ownerDocument.activeElement;
    return !!focused && this.body.contains(focused);
  }

  private releaseScope(): void {
    if (this.scopePushed && this.scope) this.app.keymap.popScope(this.scope);
    this.scopePushed = false;
  }

  nextTab(delta: number): void {
    const siblings = this.app.workspace
      .getLeavesOfType(VIEW_TYPE)
      .filter((leaf) => leaf.parent === this.leaf.parent);
    const index = siblings.indexOf(this.leaf);
    const target = siblings[(index + delta + siblings.length) % siblings.length];
    if (target) {
      this.app.workspace.setActiveLeaf(target, { focus: true });
      if (target.view instanceof TerminalView) target.view.workspace.activePane?.focus();
    }
  }

  rename(): void {
    const pane = this.workspace.activePane;
    if (pane)
      new TextPrompt(this.app, 'Pane name', pane.spec.title, (title) => this.workspace.rename(title)).open();
  }

  onPaneMenu(menu: Menu, source: string): void {
    super.onPaneMenu(menu, source);
    terminalTabMenu(menu, this.plugin.settings, this.workspace, () => {
      new TextPrompt(this.app, 'Tab name', this.getDisplayText(), (title) => {
        this.workspace.state.title = title;
        void super.setState(this.getState(), { history: false });
        this.app.workspace.requestSaveLayout();
      }).open();
    });
  }

  render(): void {
    if (!this.visible) return;
    for (const cleanup of this.renderCleanups.splice(0)) cleanup();
    this.body.replaceChildren();
    const { root, active } = this.workspace.state;
    if (!root) {
      const start = element(this.contentEl.ownerDocument, 'button', 'ot-start', 'Open terminal');
      start.addEventListener('click', () => this.workspace.initialize());
      this.body.append(start);
      return;
    }
    for (const spec of panes(root)) this.workspace.ensurePane(spec);
    const getPane = (id: string) => this.workspace.terminals.get(id)!.element;
    this.body.append(
      this.workspace.zoomed
        ? getPane(active)
        : renderLayout(
            this.contentEl.ownerDocument,
            root,
            getPane,
            () => this.app.workspace.requestSaveLayout(),
            this.renderCleanups,
          ),
    );
    for (const spec of panes(root)) {
      const pane = this.workspace.terminals.get(spec.id)!;
      if (pane.element.isConnected) pane.mount();
      pane.setActive(spec.id === active);
    }
    this.body.classList.toggle('has-splits', panes(root).length > 1 && !this.workspace.zoomed);
  }

  refreshAppearance(): void {
    for (const pane of this.workspace.terminals.values()) pane.updateTheme();
  }

  async onClose(): Promise<void> {
    this.visible = false;
    for (const cleanup of this.renderCleanups.splice(0)) cleanup();
    this.workspace.detach();
    this.contentEl.empty();
  }
}
