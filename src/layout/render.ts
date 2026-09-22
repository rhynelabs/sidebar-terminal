import type { Layout } from './tree';
import { element } from '../ui/elements';

export function renderLayout(
  doc: Document,
  layout: Layout,
  pane: (id: string) => HTMLElement,
  changed: () => void,
  cleanups: (() => void)[],
): HTMLElement {
  if (layout.kind === 'pane') return pane(layout.id);
  const split = element(doc, 'div', `ot-split ot-split-${layout.direction}`);
  const first = element(doc, 'div', 'ot-branch');
  const second = element(doc, 'div', 'ot-branch');
  first.append(renderLayout(doc, layout.first, pane, changed, cleanups));
  second.append(renderLayout(doc, layout.second, pane, changed, cleanups));
  const separator = element(doc, 'div', 'ot-separator');
  separator.tabIndex = 0;
  separator.setAttribute('role', 'separator');
  separator.setAttribute('aria-label', 'Resize terminal panes');
  separator.setAttribute('aria-orientation', layout.direction === 'right' ? 'vertical' : 'horizontal');
  separator.setAttribute('aria-valuemin', '10');
  separator.setAttribute('aria-valuemax', '90');
  const apply = () => {
    first.style.flex = `${layout.ratio} 1 0%`;
    second.style.flex = `${1 - layout.ratio} 1 0%`;
    separator.setAttribute('aria-valuenow', String(Math.round(layout.ratio * 100)));
  };
  let dragging = false;
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    const rect = split.getBoundingClientRect();
    const ratio =
      layout.direction === 'right'
        ? (event.clientX - rect.left) / rect.width
        : (event.clientY - rect.top) / rect.height;
    layout.ratio = Math.max(0.1, Math.min(0.9, ratio));
    apply();
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    doc.body.classList.remove('ot-resizing');
    changed();
  };
  separator.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dragging = true;
    doc.body.classList.add('ot-resizing');
  });
  doc.addEventListener('pointermove', move);
  doc.addEventListener('pointerup', end);
  doc.addEventListener('pointercancel', end);
  cleanups.push(() => {
    end();
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', end);
    doc.removeEventListener('pointercancel', end);
  });
  separator.addEventListener('dblclick', () => {
    layout.ratio = 0.5;
    apply();
    changed();
  });
  separator.addEventListener('keydown', (event) => {
    const negative = layout.direction === 'right' ? 'ArrowLeft' : 'ArrowUp';
    const positive = layout.direction === 'right' ? 'ArrowRight' : 'ArrowDown';
    if (![negative, positive].includes(event.key)) return;
    event.preventDefault();
    layout.ratio = Math.max(0.1, Math.min(0.9, layout.ratio + (event.key === negative ? -0.05 : 0.05)));
    apply();
    changed();
  });
  apply();
  split.append(first, separator, second);
  return split;
}
