import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerminalClipboard } from '../src/terminal/clipboard';

function fixture() {
  const state = { selection: '', clipboard: 'original', pasted: '' };
  const handler = new TerminalClipboard(
    {
      getSelection: () => state.selection,
      paste: (text) => {
        state.pasted = text;
      },
    },
    {
      readText: () => state.clipboard,
      writeText: (text) => {
        state.clipboard = text;
      },
    },
  );
  const key = (key: string, modifiers: Partial<KeyboardEvent> = {}) => {
    let prevented = false;
    const handled = handler.handle({
      type: 'keydown',
      key,
      ...modifiers,
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation() {},
    } as KeyboardEvent);
    return { handled, prevented };
  };
  return { state, key };
}

test('Ctrl+C copies selection but remains an interrupt without selection', () => {
  const { state, key } = fixture();
  assert.equal(key('c', { ctrlKey: true }).handled, false);
  state.selection = 'text ä\nsecond line';
  assert.deepEqual(key('c', { ctrlKey: true }), { handled: true, prevented: true });
  assert.equal(state.clipboard, state.selection);
});

test('Cmd+C and Ctrl+Shift+C do not erase clipboard when nothing is selected', () => {
  const { state, key } = fixture();
  assert.equal(key('c', { metaKey: true }).handled, true);
  assert.equal(key('C', { ctrlKey: true, shiftKey: true }).handled, true);
  assert.equal(state.clipboard, 'original');
});

test('paste uses terminal paste so bracketed paste semantics remain intact', () => {
  for (const modifiers of [{ metaKey: true }, { ctrlKey: true, shiftKey: true }]) {
    const { state, key } = fixture();
    state.clipboard = 'line 1\nline 2';
    assert.equal(key('v', modifiers).handled, true);
    assert.equal(state.pasted, state.clipboard);
  }
});
