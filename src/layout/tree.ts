import { randomUUID } from 'node:crypto';

export type Direction = 'right' | 'down';
export interface PaneSpec {
  kind: 'pane';
  id: string;
  title: string;
  profile: string;
  cwd: string;
}
export interface Split {
  kind: 'split';
  id: string;
  direction: Direction;
  ratio: number;
  first: Layout;
  second: Layout;
}
export type Layout = PaneSpec | Split;
export interface WorkspaceState {
  version: 1;
  root: Layout | null;
  active: string;
  title: string;
}

export function id(): string {
  return randomUUID();
}

export function panes(root: Layout): PaneSpec[] {
  return root.kind === 'pane' ? [root] : [...panes(root.first), ...panes(root.second)];
}

export function splitPane(root: Layout, target: string, pane: PaneSpec, direction: Direction): Layout {
  if (root.kind === 'pane') {
    return root.id === target
      ? { kind: 'split', id: id(), direction, ratio: 0.5, first: root, second: pane }
      : root;
  }
  return {
    ...root,
    first: splitPane(root.first, target, pane, direction),
    second: splitPane(root.second, target, pane, direction),
  };
}

export function removePane(root: Layout, target: string): Layout | null {
  if (root.kind === 'pane') return root.id === target ? null : root;
  const first = removePane(root.first, target);
  const second = removePane(root.second, target);
  return first && second ? { ...root, first, second } : (first ?? second);
}

export function emptyState(): WorkspaceState {
  return { version: 1, root: null, active: '', title: 'Terminal' };
}

/** Treat workspace.json as untrusted data; never deserialize commands. */
export function restoreState(value: unknown): WorkspaceState {
  try {
    const legacy = value as { version?: number; tabs?: { root: Layout; active: string; title: string }[] };
    const input = (legacy?.tabs?.[0] ? { version: 1, ...legacy.tabs[0] } : value) as WorkspaceState;
    if (input?.version !== 1 || !input.root) return emptyState();
    const ids = new Set<string>();
    const unique = (value: unknown): string => {
      if (typeof value !== 'string' || !value || ids.has(value)) throw new Error('Invalid ID');
      ids.add(value);
      return value;
    };
    const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
    const read = (node: Layout, depth = 0): Layout => {
      if (!node || depth > 64) throw new Error('Invalid layout');
      const nodeId = unique(node.id);
      if (node.kind === 'pane')
        return {
          kind: 'pane',
          id: nodeId,
          title: text(node.title, 'Terminal'),
          profile: text(node.profile, 'shell'),
          cwd: text(node.cwd, ''),
        };
      if (node.kind !== 'split' || !['right', 'down'].includes(node.direction)) {
        throw new Error('Invalid split');
      }
      return {
        kind: 'split',
        id: nodeId,
        direction: node.direction,
        ratio: Number.isFinite(node.ratio) ? Math.max(0.1, Math.min(0.9, node.ratio)) : 0.5,
        first: read(node.first, depth + 1),
        second: read(node.second, depth + 1),
      };
    };
    const root = read(input.root);
    const list = panes(root);
    return {
      version: 1,
      root,
      title: text(input.title, 'Terminal'),
      active: list.some((p) => p.id === input.active) ? input.active : list[0]!.id,
    };
  } catch {
    return emptyState();
  }
}
