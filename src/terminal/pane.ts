import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Notice } from 'obsidian';
import { clipboard } from 'electron';
import { TerminalClipboard } from './clipboard';
import type { PaneSpec } from '../layout/tree';
import type { Settings } from '../settings/model';
import { TerminalSession } from './session';
import { TerminalKeyboard, type TerminalActions } from './keyboard';
import { terminalTheme } from './theme';
import { element, iconButton } from '../ui/elements';

export interface PaneHost {
  settings: () => Settings;
  actions: TerminalActions;
  activate: () => void;
  menu: (event: MouseEvent) => void;
}

export class TerminalPane {
  readonly element: HTMLElement;
  readonly terminal: Terminal;
  readonly keyboard: TerminalKeyboard;
  readonly clipboard: TerminalClipboard;
  private body: HTMLElement;
  private status: HTMLElement;
  private fitAddon = new FitAddon();
  private observer: ResizeObserver;
  private session: TerminalSession | null = null;
  private opened = false;
  private disposed = false;
  private frame = 0;
  private running = false;
  private startButton: HTMLButtonElement;
  private mounting: Promise<void> | null = null;

  constructor(
    doc: Document,
    readonly spec: PaneSpec,
    private host: PaneHost,
  ) {
    this.element = element(doc, 'section', 'ot-pane');
    this.element.dataset.pane = spec.id;
    this.element.setAttribute('aria-label', spec.title);
    this.status = element(doc, 'span', 'ot-pane-status');
    this.startButton = iconButton(doc, 'play', 'Start terminal', () => this.start());
    this.element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      host.activate();
      host.menu(event);
    });
    this.body = element(doc, 'div', 'ot-terminal');
    this.element.append(this.body, this.status, this.startButton);
    this.element.addEventListener('pointerdown', () => host.activate());
    this.element.addEventListener('focusin', () => host.activate());
    const settings = host.settings();
    this.terminal = new Terminal({
      fontSize: settings.fontSize,
      lineHeight: 1,
      letterSpacing: 1 / (doc.defaultView?.devicePixelRatio || 1),
      fontWeight: 400,
      fontWeightBold: 700,
      minimumContrastRatio: 1,
      drawBoldTextInBrightColors: false,
      customGlyphs: true,
      cursorWidth: 1,
      fontFamily: settings.fontFamily,
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      scrollback: settings.scrollback,
      theme: terminalTheme(this.element),
    });
    this.terminal.loadAddon(this.fitAddon);
    this.clipboard = new TerminalClipboard(this.terminal, clipboard);
    // Also handle clipboard keys at xterm's input boundary when a native menu owns focus.
    this.terminal.attachCustomKeyEventHandler((event) => !this.clipboard.handle(event));
    this.terminal.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (!(event.ctrlKey || event.metaKey) || !/^https?:\/\//i.test(uri)) return;
        void import('electron').then(({ shell }) => shell.openExternal(uri));
      }),
    );
    this.keyboard = new TerminalKeyboard(
      {
        ...host.actions,
        clear: () => this.terminal.clear(),
        send: (text) => this.session?.write(text),
        prefix: (active) => {
          this.status.textContent = active ? 'Ctrl+B …' : '';
        },
      },
      process.platform === 'darwin',
      () => host.settings().shortcuts,
      () => host.settings().tmuxKeys,
    );
    this.terminal.onData((data) => this.session?.write(data));
    this.terminal.onResize(({ cols, rows }) => this.session?.resize(cols, rows));
    this.element.addEventListener('focusout', () => this.keyboard.reset());
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.body);
  }

  mount(): void {
    void this.ensureMounted();
  }

  private ensureMounted(): Promise<void> {
    if (!this.mounting)
      this.mounting = (async () => {
        await Promise.all(
          ['400', '700', 'italic 400', 'italic 700'].map((style) =>
            this.body.ownerDocument.fonts.load(
              `${style} ${this.host.settings().fontSize}px ${this.host.settings().fontFamily}`,
            ),
          ),
        );
        if (this.disposed) return;
        this.terminal.open(this.body);
        try {
          const webgl = new WebglAddon();
          webgl.onContextLoss(() => webgl.dispose());
          this.terminal.loadAddon(webgl);
        } catch {
          // The built-in renderer remains available when GPU acceleration is unavailable.
        }
        this.opened = true;
        this.fit();
      })();
    return this.mounting;
  }

  start(options: { runProfile?: boolean; focus?: boolean } = {}): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.startButton.hidden = true;
    this.status.textContent = 'Starting';
    void this.ensureMounted()
      .then(() => this.startSession(options))
      .catch((error) => {
        this.running = false;
        this.startButton.hidden = false;
        new Notice(String(error));
      });
  }

  private startSession(options: { runProfile?: boolean; focus?: boolean }): void {
    if (this.disposed) return;
    this.fitNow();
    this.session?.dispose();
    const session = new TerminalSession({
      data: (data) => this.terminal.write(data, () => session.acknowledge(data.length)),
      ready: () => {
        this.status.textContent = '';
      },
      exit: (code) => {
        this.running = false;
        this.status.textContent = `Exited ${code ?? ''}`.trim();
        this.startButton.hidden = false;
        this.terminal.writeln('\r\n[Process ended. Press ▶ to start again.]');
      },
      error: (message) => {
        this.running = false;
        this.status.textContent = 'Error';
        this.startButton.hidden = false;
        const safe = [...message]
          .map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
          .join('');
        this.terminal.writeln(`\r\n${safe}\r\n`);
        new Notice(message, 10000);
      },
    });
    this.session = session;
    const settings = this.host.settings();
    const command =
      options.runProfile === false
        ? ''
        : (settings.profiles.find((profile) => profile.id === this.spec.profile)?.command ?? '');
    session.start(settings, this.spec.cwd, this.terminal.cols, this.terminal.rows, command);
    if (options.focus !== false) this.focus();
  }

  rename(title: string): void {
    this.spec.title = title;
    this.element.setAttribute('aria-label', title);
  }

  focus(): void {
    if (this.opened) this.terminal.focus();
  }
  setActive(active: boolean): void {
    this.element.classList.toggle('is-active', active);
  }

  fit(): void {
    const win = this.body.ownerDocument.defaultView!;
    if (this.frame) win.cancelAnimationFrame(this.frame);
    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0;
      this.fitNow();
    });
  }

  private fitNow(): void {
    if (!this.opened || this.disposed || this.body.clientWidth < 30 || this.body.clientHeight < 30) return;
    this.fitAddon.fit();
  }

  updateTheme(): void {
    this.terminal.options.theme = terminalTheme(this.element);
    this.terminal.options.fontSize = this.host.settings().fontSize;
    this.terminal.options.fontFamily = this.host.settings().fontFamily;
    this.terminal.options.cursorBlink = this.host.settings().cursorBlink;
    this.terminal.options.cursorStyle = this.host.settings().cursorStyle;
    this.terminal.options.scrollback = this.host.settings().scrollback;
    this.fit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.session?.dispose();
    this.observer.disconnect();
    if (this.frame) this.body.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);
    this.terminal.dispose();
    this.element.remove();
  }
}
