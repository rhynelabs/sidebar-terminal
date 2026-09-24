export interface TerminalActions {
  split: (direction: 'right' | 'down') => void;
  newTab: () => void;
  close: () => void;
  nextPane: () => void;
  nextTab: (delta: number) => void;
  zoom: () => void;
  clear: () => void;
  rename: () => void;
  send: (text: string) => void;
  prefix: (active: boolean) => void;
}

/** Intercept only terminal-local shortcuts. Ctrl+D and Ctrl+C remain shell input. */
export class TerminalKeyboard {
  private prefixed = false;
  private handled = new WeakSet<KeyboardEvent>();
  constructor(
    private actions: TerminalActions,
    private mac: boolean,
    private enabled: () => boolean,
    private tmux: () => boolean,
  ) {}

  reset(): void {
    this.prefixed = false;
    this.actions.prefix(false);
  }

  handle(event: KeyboardEvent): boolean {
    if (this.handled.has(event)) return false;
    if (event.type !== 'keydown' || event.isComposing) return true;
    const key = event.key.toLowerCase();
    if (['shift', 'control', 'alt', 'meta'].includes(key)) return true;
    const mod = this.mac ? event.metaKey : event.ctrlKey && event.shiftKey;
    let action: (() => void) | undefined;
    if (this.enabled() && mod && !event.altKey) {
      if (key === 'd') action = () => this.actions.split(event.shiftKey && this.mac ? 'down' : 'right');
      if (!this.mac && key === 'e') action = () => this.actions.split('down');
      if (key === 't') action = this.actions.newTab;
      if (key === 'w') action = this.actions.close;
      if (key === 'k') action = this.actions.clear;
      if (key === '[') action = () => this.actions.nextTab(-1);
      if (key === ']') action = () => this.actions.nextTab(1);
    }
    if (!action && this.tmux() && this.prefixed) {
      this.reset();
      const mapping: Record<string, () => void> = {
        '%': () => this.actions.split('right'),
        '"': () => this.actions.split('down'),
        c: this.actions.newTab,
        x: this.actions.close,
        o: this.actions.nextPane,
        n: () => this.actions.nextTab(1),
        p: () => this.actions.nextTab(-1),
        z: this.actions.zoom,
        ',': this.actions.rename,
        escape: () => {},
      };
      action = event.ctrlKey && key === 'b' ? () => this.actions.send('\x02') : mapping[key];
      if (!action) this.actions.send('\x02');
    } else if (!action && this.tmux() && event.ctrlKey && !event.metaKey && !event.altKey && key === 'b') {
      action = () => {
        this.prefixed = true;
        this.actions.prefix(true);
      };
    }
    if (!action) return true;
    this.handled.add(event);
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) action();
    return false;
  }
}
