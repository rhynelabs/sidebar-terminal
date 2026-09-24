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

test('serialized output replays into a new terminal with colors and the cursor after the prompt', async () => {
  const { SerializeAddon } = await import('@xterm/addon-serialize');
  const source = new Terminal({ cols: 40, rows: 10, allowProposedApi: true });
  const target = new Terminal({ cols: 40, rows: 10, allowProposedApi: true });
  try {
    const serializer = new SerializeAddon();
    source.loadAddon(serializer);
    await write(source, 'one\r\n\x1b[31mtwo\x1b[0m\r\n\x1b[?1049h(alternate screen)\x1b[?1049l➜ ');
    await write(target, serializer.serialize({ excludeModes: true, excludeAltBuffer: true }));
    const line = (index: number) => target.buffer.active.getLine(index)!.translateToString(true);
    assert.equal(line(0), 'one');
    assert.equal(line(1), 'two');
    assert.equal(line(2), '➜ ');
    assert.equal(target.buffer.active.getLine(1)!.getCell(0)!.getFgColor(), 1);
    assert.equal(target.buffer.active.cursorY, 2);
    assert.equal(target.buffer.active.cursorX, 2);
  } finally {
    source.dispose();
    target.dispose();
  }
});
