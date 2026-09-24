import { join } from 'node:path';

interface VaultItem {
  path: string;
}
/** The in-app payload Obsidian keeps while a note, folder or selection is dragged. */
interface Draggable {
  type: string;
  file?: VaultItem | null;
  files?: VaultItem[];
}

export interface DropSource {
  /** Vault-relative paths of dragged notes, files and folders; null for other drags. */
  items: string[] | null;
  /** Absolute paths of files dragged from the operating system. */
  files: string[];
  text: string;
}

function asDraggable(value: unknown): Draggable | null {
  return value && typeof value === 'object' && typeof (value as Draggable).type === 'string'
    ? (value as Draggable)
    : null;
}

export function draggedItems(value: unknown): string[] | null {
  const draggable = asDraggable(value);
  if (!draggable) return null;
  if (draggable.type === 'files') return (draggable.files ?? []).map((file) => file.path);
  if (draggable.type === 'file' || draggable.type === 'folder' || draggable.type === 'link')
    return draggable.file ? [draggable.file.path] : [];
  return null;
}

/** Tabs, bookmarks and other in-app drags stay with Obsidian; vault items, files and text are ours. */
export function acceptsDrag(dragged: unknown, types: readonly string[]): boolean {
  if (draggedItems(dragged)) return true;
  if (asDraggable(dragged)) return false;
  return types.includes('Files') || types.includes('text/plain');
}

/** Quote for the login shell (POSIX single quotes) or PowerShell, where '' escapes a quote. */
export function quoteArgument(value: string, windows = process.platform === 'win32'): string {
  if (/^[\w./:@%+=,-]+$/.test(value) && !value.startsWith('-')) return value;
  return windows ? `'${value.replaceAll("'", "''")}'` : `'${value.replaceAll("'", "'\\''")}'`;
}

export function dropText(source: DropSource, vaultPath: string): string {
  const paths = source.items ? source.items.map((item) => join(vaultPath, item)) : source.files;
  if (paths.length) return paths.map((path) => quoteArgument(path)).join(' ') + ' ';
  return source.text;
}
