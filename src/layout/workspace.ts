import {
  emptyState,
  id,
  panes,
  removePane,
  restoreState,
  splitPane,
  type Direction,
  type PaneSpec,
  type WorkspaceState,
} from './tree';
import { TerminalPane } from '../terminal/pane';
import type { TerminalActions } from '../terminal/keyboard';
import type { Settings } from '../settings/model';

export interface WorkspaceHost {
  doc: Document;
  cwd: string;
  settings: () => Settings;
  render: () => void;
  save: () => void;
  menu: (event: MouseEvent) => void;
  rename: () => void;
  newTab: (profile?: string, cwd?: string) => void;
  nextTab: (delta: number) => void;
  closeTab: () => void;
}

/** One native Obsidian tab owns one split tree. No nested tab system. */
export class TerminalWorkspace {
  state: WorkspaceState = emptyState();
  readonly terminals = new Map<string, TerminalPane>();
  zoomed = false;
  readonly actions: TerminalActions;

  constructor(private host: WorkspaceHost) {
    this.actions = {
      split: (direction) => this.split(direction),
      newTab: () => host.newTab(),
      close: () => this.closePane(),
      nextPane: () => this.nextPane(),
      nextTab: host.nextTab,
      zoom: () => this.toggleZoom(),
      rename: host.rename,
      clear: () => this.activePane?.terminal.clear(),
      send: () => {},
      prefix: () => {},
    };
  }

  get activePane(): TerminalPane | undefined {
    return this.terminals.get(this.state.active);
  }

  private createSpec(profile: string, cwd: string): PaneSpec {
    const name = this.host.settings().profiles.find((p) => p.id === profile)?.name ?? 'Shell';
    return { kind: 'pane', id: id(), title: name, profile, cwd };
  }

  ensurePane(spec: PaneSpec): TerminalPane {
    let pane = this.terminals.get(spec.id);
    if (!pane) {
      pane = new TerminalPane(this.host.doc, spec, {
        settings: this.host.settings,
        actions: this.actions,
        activate: () => this.activate(spec.id),
        menu: this.host.menu,
      });
      this.terminals.set(spec.id, pane);
    }
    return pane;
  }

  restore(value: unknown): void {
    this.dispose();
    this.state = restoreState(value);
    this.zoomed = false;
    this.host.render();
  }

  newTab(profile = 'shell', cwd = this.host.cwd): void {
    this.host.newTab(profile, cwd);
  }

  initialize(profile = 'shell', cwd = this.host.cwd): void {
    const spec = this.createSpec(profile, cwd);
    this.state = {
      version: 1,
      root: spec,
      title: profile === 'shell' ? 'Terminal' : spec.title,
      active: spec.id,
    };
    this.zoomed = false;
    this.changed();
    this.ensurePane(spec).start();
  }

  split(direction: Direction, profile = 'shell'): void {
    const root = this.state.root;
    if (!root) {
      this.initialize(profile);
      return;
    }
    const spec = this.createSpec(profile, this.activePane?.spec.cwd || this.host.cwd);
    this.state.root = splitPane(root, this.state.active, spec, direction);
    this.state.active = spec.id;
    this.zoomed = false;
    this.changed();
    this.ensurePane(spec).start();
  }

  activate(paneId: string): void {
    if (this.state.active === paneId) return;
    this.state.active = paneId;
    for (const [id, pane] of this.terminals) pane.setActive(id === paneId);
    this.host.save();
  }

  nextPane(): void {
    if (!this.state.root) return;
    const list = panes(this.state.root);
    const index = list.findIndex((p) => p.id === this.state.active);
    this.activate(list[(index + 1) % list.length]!.id);
    if (this.zoomed) this.host.render();
    this.activePane?.focus();
  }

  closePane(): void {
    if (!this.state.root) return;
    const next = removePane(this.state.root, this.state.active);
    this.terminals.get(this.state.active)?.dispose();
    this.terminals.delete(this.state.active);
    if (!next) {
      this.host.closeTab();
      return;
    }
    this.state.root = next;
    this.state.active = panes(next)[0]!.id;
    this.zoomed = false;
    this.changed();
    this.activePane?.focus();
  }

  rename(title: string): void {
    this.activePane?.rename(title);
    this.host.save();
  }

  toggleZoom(): void {
    if (!this.state.root) return;
    this.zoomed = !this.zoomed;
    this.host.render();
    this.activePane?.focus();
  }

  private changed(): void {
    this.host.render();
    this.host.save();
  }
  dispose(): void {
    for (const pane of this.terminals.values()) pane.dispose();
    this.terminals.clear();
  }
}
