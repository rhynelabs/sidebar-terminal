import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerminalKeyboard, type TerminalActions } from '../src/terminal/keyboard';

function fixture(mac = true) {
  const log: string[] = [];
  const actions: TerminalActions = {
    split: (direction) => log.push(direction),
    newTab: () => log.push('tab'),
    close: () => log.push('close'),
    nextPane: () => log.push('next'),
    nextTab: (delta) => log.push(`tab${delta}`),
    zoom: () => log.push('zoom'),
    clear: () => log.push('clear'),
    rename: () => log.push('rename'),
    send: (text) => log.push(text),
    prefix: (active) => log.push(`prefix:${active}`),
  };
  return {
    log,
    keyboard: new TerminalKeyboard(
      actions,
      mac,
      () => true,
      () => true,
    ),
  };
}

function key(key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { type: 'keydown', key, preventDefault() {}, stopPropagation() {}, ...modifiers } as KeyboardEvent;
}

test('Mac split shortcuts leave Ctrl+D and Ctrl+C alone', () => {
  const { keyboard, log } = fixture();
  keyboard.handle(key('d', { metaKey: true }));
  keyboard.handle(key('D', { metaKey: true, shiftKey: true }));
  assert.equal(keyboard.handle(key('d', { ctrlKey: true })), true);
  assert.equal(keyboard.handle(key('c', { ctrlKey: true })), true);
  assert.deepEqual(log, ['right', 'down']);
});

test('Windows and Linux splits do not consume Ctrl+D', () => {
  const { keyboard, log } = fixture(false);
  keyboard.handle(key('D', { ctrlKey: true, shiftKey: true }));
  keyboard.handle(key('E', { ctrlKey: true, shiftKey: true }));
  assert.equal(keyboard.handle(key('d', { ctrlKey: true })), true);
  assert.deepEqual(log, ['right', 'down']);
});

test('prefix survives Shift, and Ctrl+B twice passes through to real tmux', () => {
  const { keyboard, log } = fixture();
  keyboard.handle(key('b', { ctrlKey: true }));
  keyboard.handle(key('Shift', { shiftKey: true }));
  keyboard.handle(key('%', { shiftKey: true }));
  assert.ok(log.includes('right'));
  keyboard.handle(key('b', { ctrlKey: true }));
  keyboard.handle(key('b', { ctrlKey: true }));
  assert.equal(log.at(-1), '\x02');
});

test('unknown prefix sequences preserve shell input, blur clears prefix', () => {
  const { keyboard, log } = fixture();
  keyboard.handle(key('b', { ctrlKey: true }));
  assert.equal(keyboard.handle(key('q')), true);
  assert.equal(log.at(-1), '\x02');
  keyboard.handle(key('b', { ctrlKey: true }));
  keyboard.reset();
  assert.equal(keyboard.handle(key('c')), true);
  assert.ok(!log.includes('tab'));
});

test('Enter combinations reach the running program instead of toggling zoom', () => {
  const calls: string[] = [];
  const actions = {
    split: () => calls.push('split'),
    newTab: () => calls.push('newTab'),
    close: () => calls.push('close'),
    nextPane: () => calls.push('nextPane'),
    nextTab: () => calls.push('nextTab'),
    zoom: () => calls.push('zoom'),
    clear: () => calls.push('clear'),
    rename: () => calls.push('rename'),
    send: () => calls.push('send'),
    prefix: () => {},
  };
  for (const mac of [true, false]) {
    const keyboard = new TerminalKeyboard(
      actions,
      mac,
      () => true,
      () => true,
    );
    const event = {
      type: 'keydown',
      key: 'Enter',
      metaKey: mac,
      ctrlKey: !mac,
      shiftKey: !mac,
      altKey: false,
      isComposing: false,
      repeat: false,
      preventDefault() {},
      stopPropagation() {},
    } as unknown as KeyboardEvent;
    assert.equal(keyboard.handle(event), true);
  }
  assert.deepEqual(calls, []);
});
