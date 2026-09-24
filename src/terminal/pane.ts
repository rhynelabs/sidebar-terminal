import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Notice } from 'obsidian';
import { clipboard } from 'electron';
import { TerminalClipboard } from './clipboard';
import type { PaneSpec } from '../layout/tree';
import type { Settings } from '../settings/model';
import { TerminalSession } from './session';
import { TerminalKeyboard, type TerminalActions } from './keyboard';
import { terminalOptions, terminalTheme } from './theme';
import { installDropTarget } from './dropzone';
import { loadFonts, remeasure, watchFonts } from './fonts';
import { element } from '../ui/elements';

export interface PaneHost {
  settings: () => Settings;
  actions: TerminalActions;
  activate: () => void;
  menu: (event: MouseEvent) => void;
  dragged: () => unknown;
  vaultPath: string;
}

export interface StartOptions {
  runProfile?: boolean;
  focus?: boolean;
  /** Serialized output of a previous session, shown above the new shell. */
  history?: string;
}

const divider = (label: string) => `\r\n\x1b[2m── ${label} ──\x1b[0m\r\n`;

export class TerminalPane {
  readonly element: HTMLElement;
  readonly terminal: Terminal;
  readonly keyboard: TerminalKeyboard;
  readonly clipboard: TerminalClipboard;
  spec: PaneSpec;
  attached = false;
  private host: PaneHost;
  private body: HTMLElement;
  private surface: HTMLElement;
  private status: HTMLElement;
  private fitAddon = new FitAddon();
  private serializer = new SerializeAddon();
  private observer: ResizeObserver;
  private session: TerminalSession | null = null;
  private opened = false;
  private disposed = false;
  private frame = 0;
  running = false;
  private startedAt = 0;
  private quickExits = 0;
  private mounting: Promise<void> | null = null;
  private unwatchFonts: (() => void) | null = null;

  constructor(doc: Document, spec: PaneSpec, host: PaneHost) {
    this.spec = spec;
    this.host = host;
    this.element = element(doc, 'section', 'ot-pane');
    this.element.dataset.pane = spec.id;
    this.element.setAttribute('aria-label', spec.title);
    this.status = element(doc, 'span', 'ot-pane-status');
    this.element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.host.activate();
      this.host.menu(event);
    });
    // The renderer lives in an unpadded surface so the fit addon sees the exact free height.
    this.body = element(doc, 'div', 'ot-terminal');
    this.surface = element(doc, 'div', 'ot-terminal-surface');
    this.body.append(this.surface);
    this.element.append(this.body, this.status);
    this.element.addEventListener('pointerdown', () => this.host.activate());
    this.element.addEventListener('focusin', () => this.host.activate());
    installDropTarget(this.element, {
      dragged: () => this.host.dragged(),
      vaultPath: () => this.host.vaultPath,
      insert: (text) => {
        this.host.activate();
        this.insert(text);
      },
    });
    const settings = host.settings();
    this.terminal = new Terminal(terminalOptions(doc, settings, this.element));
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.serializer);
    this.clipboard = new TerminalClipboard(this.terminal, clipboard);
    // Also handle clipboard keys at xterm's input boundary when a native menu owns focus.
    this.terminal.attachCustomKeyEventHandler((event) => !this.clipboard.handle(event));
    this.terminal.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (!(event.ctrlKey || event.metaKey) || !/^https?:\/\//i.test(uri)) return;
        void import('electron').then(({ shell }) => shell.openExternal(uri));
      }),
    );
    // Actions resolve through the current host so an adopted pane follows its new tab.
    this.keyboard = new TerminalKeyboard(
      {
        split: (direction) => this.host.actions.split(direction),
        newTab: () => this.host.actions.newTab(),
        close: () => this.host.actions.close(),
        nextPane: () => this.host.actions.nextPane(),
        nextTab: (delta) => this.host.actions.nextTab(delta),
        zoom: () => this.host.actions.zoom(),
        rename: () => this.host.actions.rename(),
        clear: () => this.terminal.clear(),
        send: (text) => this.session?.write(text),
        prefix: (active) => {
          this.status.textContent = active ? 'Ctrl+B …' : '';
        },
      },
      process.platform === 'darwin',
      () => this.host.settings().shortcuts,
      () => this.host.settings().tmuxKeys,
    );
    // Typing into an ended shell starts a new one, like pressing a key in Ghostty.
    this.terminal.onData((data) => {
      if (!this.running && !this.disposed) {
        this.quickExits = 0;
        this.start({ runProfile: false });
        return;
      }
      this.session?.write(data);
    });
    this.terminal.onResize(({ cols, rows }) => this.session?.resize(cols, rows));
    this.element.addEventListener('focusout', () => this.keyboard.reset());
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.body);
  }

  /** Bind to the tab that currently shows this pane; its layout owns the spec. */
  attach(spec: PaneSpec, host: PaneHost): void {
    this.spec = spec;
    this.host = host;
    this.attached = true;
    this.element.setAttribute('aria-label', spec.title);
  }

  /** Leave the tab but keep the shell, its jobs and its output. */
  detach(): void {
    this.attached = false;
    this.element.remove();
  }

  /** Output with colors, without alternate-screen programs; null before the renderer exists. */
  snapshot(): string | null {
    if (!this.opened || this.disposed) return null;
    return this.serializer.serialize({ excludeModes: true, excludeAltBuffer: true });
  }

  insert(text: string): void {
    this.terminal.paste(text);
    this.focus();
  }

  mount(): void {
    void this.ensureMounted();
  }

  private ensureMounted(): Promise<void> {
    if (!this.mounting)
      this.mounting = (async () => {
        const doc = this.body.ownerDocument;
        await loadFonts(doc, this.host.settings());
        if (this.disposed) return;
        this.terminal.open(this.surface);
        this.unwatchFonts = watchFonts(doc, () => {
          remeasure(this.terminal, this.host.settings().fontFamily);
          this.fit();
        });
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

  start(options: StartOptions = {}): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.status.textContent = 'Starting';
    void this.ensureMounted()
      .then(() => this.startSession(options))
      .catch((error) => {
        this.running = false;
        this.status.textContent = 'Press any key to retry';
        new Notice(String(error));
      });
  }

  private startSession(options: StartOptions): void {
    if (this.disposed) return;
    this.fitNow();
    this.session?.dispose();
    if (options.history) {
      this.terminal.write(options.history);
      this.terminal.write(divider('previous session'));
    }
    this.startedAt = Date.now();
    const session = new TerminalSession({
      data: (data) => this.terminal.write(data, () => session.acknowledge(data.length)),
      ready: () => {
        this.status.textContent = '';
      },
      exit: (code) => this.exited(code),
      error: (message) => {
        this.running = false;
        this.status.textContent = 'Press any key to retry';
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

  /** Keep the output and continue in a fresh shell, unless the shell keeps dying immediately. */
  private exited(code: number | null): void {
    this.running = false;
    if (this.disposed) return;
    this.quickExits = Date.now() - this.startedAt < 5000 ? this.quickExits + 1 : 0;
    const label = `exit ${code ?? '?'}`;
    if (this.quickExits >= 3) {
      this.status.textContent = 'Press any key to retry';
      this.terminal.write(divider(`shell keeps ending (${label}) · press any key to retry`));
      return;
    }
    this.terminal.write(divider(`${label} · new shell`));
    this.start({ runProfile: false, focus: false });
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
    this.attached = false;
    this.session?.dispose();
    this.observer.disconnect();
    this.unwatchFonts?.();
    if (this.frame) this.body.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);
    this.terminal.dispose();
    this.element.remove();
  }
}
