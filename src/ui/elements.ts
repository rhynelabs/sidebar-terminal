import { setIcon, setTooltip } from 'obsidian';

export function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  // The window factory creates detached elements; Document.createEl appends them.
  const owner = doc.win as Window & { createEl: typeof createEl };
  const result = owner.createEl(tag);
  result.className = className;
  if (text) result.textContent = text;
  return result;
}

export function iconButton(
  doc: Document,
  icon: string,
  label: string,
  action: () => void,
): HTMLButtonElement {
  const button = element(doc, 'button', 'ot-icon clickable-icon');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  setTooltip(button, label);
  setIcon(button, icon);
  button.addEventListener('click', action);
  return button;
}
