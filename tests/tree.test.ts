import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panes, removePane, restoreState, splitPane, type PaneSpec } from '../src/layout/tree';

const pane = (id: string): PaneSpec => ({ kind: 'pane', id, profile: 'shell', title: id, cwd: '/tmp' });

test('nested splits preserve terminals; closing collapses only the affected branch', () => {
  let root = splitPane(pane('a'), 'a', pane('b'), 'right');
  root = splitPane(root, 'b', pane('c'), 'down');
  assert.deepEqual(
    panes(root).map((p) => p.id),
    ['a', 'b', 'c'],
  );
  const next = removePane(root, 'b')!;
  assert.deepEqual(
    panes(next).map((p) => p.id),
    ['a', 'c'],
  );
  assert.equal(next.kind, 'split');
  assert.deepEqual(removePane(removePane(next, 'a')!, 'c'), null);
});

test('unknown target does not delete another terminal', () => {
  const root = splitPane(pane('a'), 'a', pane('b'), 'right');
  assert.deepEqual(removePane(root, 'unknown'), root);
});

test('restoration validates IDs and clamps divider ratios', () => {
  const root = { ...splitPane(pane('a'), 'a', pane('b'), 'right'), ratio: 42 };
  const restored = restoreState({ version: 1, title: 'Tab', root, active: 'missing' });
  assert.equal(restored.active, 'a');
  assert.equal(restored.root?.kind === 'split' && restored.root.ratio, 0.9);
  const duplicate = splitPane(pane('a'), 'a', pane('a'), 'right');
  assert.equal(restoreState({ version: 1, root: duplicate }).root, null);
});

test('layout round trip keeps profile and cwd, never commands', () => {
  const root = { ...pane('a'), command: 'untrusted command' };
  const input = { version: 1, title: 'Named', root, active: 'a' };
  const restored = restoreState(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(restored.root, pane('a'));
});
