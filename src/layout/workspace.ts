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
import { TerminalPane, type PaneHost } from '../terminal/pane';
import type { TerminalActions } from '../terminal/keyboard';
import type { SessionRegistry } from '../terminal/registry';
import type { ScrollbackStore } from '../terminal/history';
import type { Settings } from '../settings/model';

export interface WorkspaceHost {
  doc: Document;
  cwd: string;
  settings: () => Settings;
  registry: SessionRegistry;
  history: ScrollbackStore;
  dragged: () => unknown;
  render: () => void;
  save: () => void;
  menu: (event: MouseEvent) => void;
  rename: () => void;
  newTab: (profile?: string, cwd?: string) => void;
  nextTab: (delta: number) => void;
  closeTab: () => void;
}

/** One native Obsidian tab owns one split tree. Panes are borrowed from the shared registry. */
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

  private paneHost(spec: PaneSpec): PaneHost {
    return {
      settings: this.host.settings,
      actions: this.actions,
      activate: () => this.activate(spec.id),
      menu: this.host.menu,
      dragged: this.host.dragged,
      vaultPath: this.host.cwd,
    };
  }

  ensurePane(spec: PaneSpec): TerminalPane {
    const { registry } = this.host;
    let pane = registry.panes.get(spec.id);
    if (pane && pane.element.ownerDocument !== this.host.doc) {
      registry.dispose(spec.id);
      pane = undefined;
    }
    if (!pane) {
      pane = new TerminalPane(this.host.doc, spec, this.paneHost(spec));
      registry.panes.set(spec.id, pane);
    }
    pane.attach(spec, this.paneHost(spec));
    this.terminals.set(spec.id, pane);
    return pane;
  }

  /** Reuse live shells for known pane IDs; start the rest with their saved output. */
  restore(value: unknown): void {
    const next = restoreState(value);
    const keep = new Set(next.root ? panes(next.root).map((spec) => spec.id) : []);
    for (const paneId of this.terminals.keys()) if (!keep.has(paneId)) this.forget(paneId);
    this.terminals.clear();
    if (next.root)
      for (const spec of panes(next.root)) {
        // A duplicated tab must not steal the pane that another tab is showing.
        if (this.host.registry.panes.get(spec.id)?.attached) {
          const previous = spec.id;
          spec.id = id();
          if (next.active === previous) next.active = spec.id;
        }
      }
    this.state = next;
    this.zoomed = false;
    this.host.render();
    if (next.root)
      for (const spec of panes(next.root)) {
        const pane = this.ensurePane(spec);
        if (pane.running) continue;
        void this.host.history
          .load(spec.id)
          .then((history) => pane.start({ runProfile: false, focus: false, history }));
      }
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

  private forget(paneId: string): void {
    this.host.registry.dispose(paneId);
    this.terminals.delete(paneId);
    void this.host.history.remove(paneId);
  }

  closePane(): void {
    if (!this.state.root) return;
    const next = removePane(this.state.root, this.state.active);
    this.forget(this.state.active);
    if (!next) {
      this.state = emptyState();
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

  /** The tab is closing: keep every shell alive so the layout can be reopened. */
  detach(): void {
    for (const pane of this.terminals.values()) {
      this.host.history.save(pane.spec.id, pane.snapshot());
      pane.detach();
    }
    this.host.registry.stash(this.state);
    this.terminals.clear();
  }

  /** End every shell in this tab. */
  dispose(): void {
    for (const paneId of [...this.terminals.keys()]) this.forget(paneId);
    this.state = emptyState();
  }
}
