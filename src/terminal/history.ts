import { FileSystemAdapter, normalizePath, type App } from 'obsidian';
import { mkdirSync, writeFileSync } from 'node:fs';

const NAME = /^[\w-]{1,64}$/;

/** Terminal output kept per pane in this vault's plugin folder, only while the setting is on. */
export class ScrollbackStore {
  private dir: string;

  constructor(
    private app: App,
    private enabled: () => boolean,
  ) {
    this.dir = normalizePath(`${app.vault.configDir}/plugins/sidebar-terminal/scrollback`);
  }

  private file(id: string): string | null {
    return NAME.test(id) ? `${this.dir}/${id}.txt` : null;
  }

  async load(id: string): Promise<string> {
    const file = this.file(id);
    if (!file || !this.enabled()) return '';
    try {
      return (await this.app.vault.adapter.exists(file)) ? await this.app.vault.adapter.read(file) : '';
    } catch {
      return '';
    }
  }

  /** Synchronous so it completes during plugin unload and window close. */
  save(id: string, text: string | null): void {
    const file = this.file(id);
    const adapter = this.app.vault.adapter;
    if (!file || text === null || !this.enabled() || !(adapter instanceof FileSystemAdapter)) return;
    try {
      mkdirSync(adapter.getFullPath(this.dir), { recursive: true });
      writeFileSync(adapter.getFullPath(file), text);
    } catch {
      // Saved output is a convenience; a failed write must not affect the running shell.
    }
  }

  async remove(id: string): Promise<void> {
    const file = this.file(id);
    try {
      if (file && (await this.app.vault.adapter.exists(file))) await this.app.vault.adapter.remove(file);
    } catch {
      // Ignore missing files.
    }
  }

  /** Delete output of panes that no longer exist in any layout, or everything when disabled. */
  async prune(keep: Set<string>): Promise<void> {
    const adapter = this.app.vault.adapter;
    try {
      if (!(await adapter.exists(this.dir))) return;
      for (const file of (await adapter.list(this.dir)).files) {
        const id = file.slice(file.lastIndexOf('/') + 1).replace(/\.txt$/, '');
        if (!this.enabled() || !keep.has(id)) await adapter.remove(file);
      }
    } catch {
      // Ignore concurrent changes to the plugin folder.
    }
  }
}
