export interface Profile {
  id: string;
  name: string;
  command: string;
}
export interface Settings {
  python: string;
  shell: string;
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'bar' | 'block' | 'underline';
  cursorBlink: boolean;
  scrollback: number;
  shortcuts: boolean;
  tmuxKeys: boolean;
  restoreScrollback: boolean;
  profiles: Profile[];
}

export const DEFAULTS: Settings = {
  python: '',
  shell: '',
  fontSize: 13,
  scrollback: 10000,
  fontFamily: '"Sidebar Terminal Mono", monospace',
  cursorStyle: 'bar',
  cursorBlink: false,
  shortcuts: true,
  tmuxKeys: true,
  restoreScrollback: true,
  profiles: [
    { id: 'shell', name: 'Shell', command: '' },
    { id: 'claude', name: 'Claude', command: 'claude' },
    { id: 'codex', name: 'Codex', command: 'codex' },
  ],
};

export function readSettings(value: unknown): Settings {
  const data = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  const profiles = Array.isArray(data.profiles)
    ? data.profiles.filter(
        (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.command === 'string',
      )
    : DEFAULTS.profiles;
  const unique = new Map(profiles.map((p) => [p.id, { ...p }]));
  unique.set('shell', { id: 'shell', name: 'Shell', command: '' });
  return {
    python: typeof data.python === 'string' ? data.python : '',
    shell: typeof data.shell === 'string' ? data.shell : '',
    fontSize: Number.isFinite(data.fontSize) ? Math.max(9, Math.min(32, data.fontSize!)) : 13,
    fontFamily:
      typeof data.fontFamily === 'string' && data.fontFamily.trim() ? data.fontFamily : DEFAULTS.fontFamily,
    cursorStyle: data.cursorStyle === 'block' || data.cursorStyle === 'underline' ? data.cursorStyle : 'bar',
    cursorBlink: data.cursorBlink === true,
    scrollback: Number.isFinite(data.scrollback)
      ? Math.max(1000, Math.min(100000, Math.round(data.scrollback!)))
      : 10000,
    shortcuts: data.shortcuts !== false,
    tmuxKeys: data.tmuxKeys !== false,
    restoreScrollback: data.restoreScrollback !== false,
    profiles: [...unique.values()],
  };
}
