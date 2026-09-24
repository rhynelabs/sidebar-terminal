import type { Terminal } from '@xterm/xterm';
import type { Settings } from '../settings/model';

const STYLES = ['400', '700', 'italic 400', 'italic 700'];

/** Wait for the configured faces. The bundled font can register after the plugin's own load. */
export async function loadFonts(doc: Document, settings: Settings): Promise<void> {
  const load = () =>
    Promise.all(
      STYLES.map((style) => doc.fonts.load(`${style} ${settings.fontSize}px ${settings.fontFamily}`)),
    );
  if ((await load()).flat().length === 0) {
    await doc.fonts.ready;
    await load();
  }
}

/** xterm measures glyphs only when an option changes, so re-apply the family after late loads. */
export function remeasure(terminal: Terminal, family: string): void {
  terminal.options.fontFamily = family === 'monospace' ? 'serif' : 'monospace';
  terminal.options.fontFamily = family;
}

export function watchFonts(doc: Document, onLoaded: () => void): () => void {
  doc.fonts.addEventListener('loadingdone', onLoaded);
  return () => doc.fonts.removeEventListener('loadingdone', onLoaded);
}
