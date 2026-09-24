import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptsDrag, draggedItems, dropText, quoteArgument } from '../src/terminal/drop';

test('paths are quoted only when the shell would otherwise split or expand them', () => {
  assert.equal(quoteArgument('/Users/me/vault/note.md', false), '/Users/me/vault/note.md');
  assert.equal(
    quoteArgument('/Users/me/My Vault/2. Semester/Note.md', false),
    "'/Users/me/My Vault/2. Semester/Note.md'",
  );
  assert.equal(quoteArgument("/tmp/it's.md", false), "'/tmp/it'\\''s.md'");
  assert.equal(quoteArgument('/tmp/Überblick.md', false), "'/tmp/Überblick.md'");
  assert.equal(quoteArgument("C:\\Users\\me\\it's.md", true), "'C:\\Users\\me\\it''s.md'");
});

test('vault items become absolute paths, several at once, followed by a space', () => {
  const dragged = { type: 'files', files: [{ path: 'a.md' }, { path: 'Folder Name/b.md' }] };
  assert.deepEqual(draggedItems(dragged), ['a.md', 'Folder Name/b.md']);
  assert.equal(
    dropText({ items: draggedItems(dragged), files: [], text: 'obsidian://open' }, '/vault'),
    "/vault/a.md '/vault/Folder Name/b.md' ",
  );
  assert.deepEqual(draggedItems({ type: 'folder', file: { path: 'Folder' } }), ['Folder']);
});

test('operating system files and plain text are inserted; other in-app drags stay with Obsidian', () => {
  assert.equal(dropText({ items: null, files: ['/tmp/x y'], text: '' }, '/vault'), "'/tmp/x y' ");
  assert.equal(dropText({ items: null, files: [], text: 'ls -la' }, '/vault'), 'ls -la');
  assert.equal(acceptsDrag({ type: 'file', file: { path: 'a.md' } }, ['text/plain']), true);
  assert.equal(acceptsDrag({ type: 'leaf' }, ['text/plain']), false);
  assert.equal(acceptsDrag(null, ['Files']), true);
  assert.equal(acceptsDrag(null, ['text/html']), false);
  assert.equal(acceptsDrag(undefined, ['text/plain']), true);
});
