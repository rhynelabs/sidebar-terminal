import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Terminal } from '@xterm/headless';

const write = (terminal: Terminal, text: string) =>
  new Promise<void>((resolve) => terminal.write(text, resolve));

test('terminal answers capability queries and preserves explicit TUI colors', async () => {
  const terminal = new Terminal({
    cols: 80,
    rows: 24,
    allowProposedApi: true,
    theme: { background: '#1c1c1c', foreground: '#dadada' },
  });
  let response = '';
  terminal.onData((data) => {
    response += data;
  });
  try {
    await write(terminal, '\x1b[c');
    assert.match(response, /\x1b\[\?.*c/);
    await write(terminal, '\x1b[48;2;40;50;60mA\x1b[48;5;235mB\x1b[0m');
    assert.equal(terminal.buffer.active.getLine(0)!.getCell(0)!.getBgColor(), 0x28323c);
    assert.equal(terminal.buffer.active.getLine(0)!.getCell(1)!.getBgColor(), 235);
  } finally {
    terminal.dispose();
  }
});

test('clear retains prompt and unfinished input instead of erasing the current line', async () => {
  const terminal = new Terminal({ cols: 80, rows: 24, allowProposedApi: true });
  try {
    await write(terminal, 'previous output\r\n➜ folder git sta');
    terminal.clear();
    assert.equal(terminal.buffer.active.getLine(0)!.translateToString(true), '➜ folder git sta');
    assert.equal(terminal.buffer.active.cursorX, 16);
  } finally {
    terminal.dispose();
  }
});
