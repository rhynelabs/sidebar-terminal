import type { ITheme } from '@xterm/xterm';
import { element as createElement } from '../ui/elements';

/** Adapt the default surface to Obsidian; preserve the terminal ANSI palette. */
export function terminalTheme(element: HTMLElement): ITheme {
  const doc = element.ownerDocument;
  const probe = createElement(doc, 'span');
  probe.hidden = true;
  doc.body.append(probe);
  const canvas = createElement(doc, 'canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d')!;
  const color = (name: string, fallback: string) => {
    probe.style.color = `var(${name}, ${fallback})`;
    const resolved = doc.defaultView!.getComputedStyle(probe).color;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = resolved;
    context.fillRect(0, 0, 1, 1);
    const rgb = context.getImageData(0, 0, 1, 1).data;
    if (rgb[3]! < 255) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${rgb[3]! / 255})`;
    return `#${[...rgb]
      .slice(0, 3)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')}`;
  };
  const dark = element.ownerDocument.body.classList.contains('theme-dark');
  const theme: ITheme = {
    background: color('--background-primary', dark ? '#1e1e1e' : '#ffffff'),
    foreground: color('--text-normal', dark ? '#dadada' : '#222222'),
    cursor: color('--text-normal', dark ? '#dadada' : '#222222'),
    selectionBackground: color('--text-selection', dark ? '#48405e' : '#ded4f3'),
    scrollbarSliderBackground: color('--scrollbar-thumb-bg', '#88888840'),
    scrollbarSliderHoverBackground: color('--scrollbar-active-thumb-bg', '#88888870'),
    scrollbarSliderActiveBackground: color('--scrollbar-active-thumb-bg', '#88888890'),
    black: '#1d1f21',
    red: '#cc6666',
    green: '#b5bd68',
    yellow: '#f0c674',
    blue: color('--color-blue', '#027aff'),
    magenta: '#b294bb',
    cyan: '#8abeb7',
    white: '#c5c8c6',
    brightBlack: '#666666',
    brightRed: '#d54e53',
    brightGreen: '#b9ca4a',
    brightYellow: '#e7c547',
    brightBlue: color('--color-blue', '#027aff'),
    brightMagenta: '#c397d8',
    brightCyan: '#70c0b1',
    brightWhite: '#eaeaea',
  };
  probe.remove();
  return theme;
}
