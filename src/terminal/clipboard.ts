interface ClipboardPort {
  readText(): string;
  writeText(text: string): void;
}

interface TerminalSelection {
  getSelection(): string;
  paste(text: string): void;
}

/** Copy selected text; otherwise preserve Ctrl+C as a terminal interrupt. */
export class TerminalClipboard {
  private handled = new WeakSet<KeyboardEvent>();
  constructor(
    private terminal: TerminalSelection,
    private clipboard: ClipboardPort,
  ) {}

  copy(): void {
    const text = this.terminal.getSelection();
    if (text) this.clipboard.writeText(text);
  }

  paste(): void {
    this.terminal.paste(this.clipboard.readText());
  }

  handle(event: KeyboardEvent): boolean {
    if (this.handled.has(event)) return true;
    if (event.type !== 'keydown' || event.isComposing || event.altKey) return false;
    const key = event.key.toLowerCase();
    const copy =
      key === 'c' && (event.metaKey || (event.ctrlKey && (event.shiftKey || !!this.terminal.getSelection())));
    const paste =
      (key === 'v' && (event.metaKey || (event.ctrlKey && event.shiftKey))) ||
      (key === 'insert' && event.shiftKey && !event.ctrlKey && !event.metaKey);
    if (!copy && !paste) return false;
    this.handled.add(event);
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      if (copy) this.copy();
      else this.paste();
    }
    return true;
  }
}
