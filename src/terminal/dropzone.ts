import { webUtils } from 'electron';
import { acceptsDrag, draggedItems, dropText, type DropSource } from './drop';

export interface DropHost {
  dragged: () => unknown;
  vaultPath: () => string;
  insert: (text: string) => void;
}

function readDropSource(event: DragEvent, dragged: unknown): DropSource {
  const transfer = event.dataTransfer;
  const files = Array.from(transfer?.files ?? [])
    .map((file) => {
      try {
        return webUtils.getPathForFile(file);
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  return { items: draggedItems(dragged), files, text: transfer?.getData('text/plain') ?? '' };
}

/** Claim drops before Obsidian's leaf handler, which would replace the terminal with the note. */
export function installDropTarget(target: HTMLElement, host: DropHost): void {
  let depth = 0;
  const accepts = (event: DragEvent) => acceptsDrag(host.dragged(), event.dataTransfer?.types ?? []);
  const over = (event: DragEvent) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    target.classList.add('is-drop-target');
  };
  const reset = () => {
    depth = 0;
    target.classList.remove('is-drop-target');
  };
  target.addEventListener('dragenter', (event) => {
    depth++;
    over(event);
  });
  target.addEventListener('dragover', over);
  target.addEventListener('dragleave', () => {
    if (--depth <= 0) reset();
  });
  target.addEventListener('drop', (event) => {
    const accepted = accepts(event);
    reset();
    if (!accepted) return;
    event.preventDefault();
    event.stopPropagation();
    const text = dropText(readDropSource(event, host.dragged()), host.vaultPath());
    if (text) host.insert(text);
  });
}
