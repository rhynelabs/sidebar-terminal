import type { TerminalPane } from './pane';
import { panes, type WorkspaceState } from '../layout/tree';

/** Shells outlive their tab: a closed layout can be reopened with its processes and output. */
export class SessionRegistry {
  readonly panes = new Map<string, TerminalPane>();
  private closed: WorkspaceState[] = [];

  stash(state: WorkspaceState): void {
    if (state.root && panes(state.root).some((spec) => this.panes.has(spec.id))) this.closed.push(state);
  }

  /** The most recently closed layout whose shells are all still alive and unattached. */
  adopt(): WorkspaceState | null {
    for (let state = this.closed.pop(); state; state = this.closed.pop()) {
      const alive = panes(state.root!).every((spec) => {
        const pane = this.panes.get(spec.id);
        return pane && !pane.attached;
      });
      if (alive) return state;
    }
    return null;
  }

  get hasClosed(): boolean {
    return this.closed.length > 0;
  }

  dispose(id: string): void {
    this.panes.get(id)?.dispose();
    this.panes.delete(id);
  }

  disposeAll(before?: (pane: TerminalPane) => void): void {
    for (const pane of this.panes.values()) {
      before?.(pane);
      pane.dispose();
    }
    this.panes.clear();
    this.closed = [];
  }
}
