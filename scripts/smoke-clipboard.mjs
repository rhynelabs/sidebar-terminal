import assert from 'node:assert/strict';
import { obsidianCli } from './obsidian-cli.mjs';

const { evaluate, waitFor } = obsidianCli(process.argv[2], process.argv[3]);
const ctx = 'window.__otClipboardSmoke';
const marker = 'OT_COPY_ä_731';
try {
  await evaluate(`app.plugins.plugins['sidebar-terminal'].open('shell').then(view=>{${ctx}={view};}); null`);
  await waitFor(`JSON.stringify(!!${ctx}?.view.workspace.activePane?.running)`, Boolean);
  await evaluate(`(()=>{
    const t=${ctx}.view.workspace.activePane.terminal;
    const cb=require('electron').clipboard;
    ${ctx}.previous={text:cb.readText(),html:cb.readHTML(),rtf:cb.readRTF(),image:cb.readImage()};
    t.write('\\r\\n${marker}\\r\\n',()=>{
      for(let y=0;y<t.buffer.active.length;y++){
        if(t.buffer.active.getLine(y).translateToString().startsWith('${marker}')){t.select(0,y,${marker.length});break;}
      }
      t.focus();
      t.textarea.dispatchEvent(new KeyboardEvent('keydown',{key:'c',code:'KeyC',ctrlKey:true,bubbles:true,cancelable:true}));
      ${ctx}.copied=cb.readText()==='${marker}';
    });
  })(); null`);
  await waitFor(`JSON.stringify(${ctx}.copied)`, Boolean);
  await evaluate(`(()=>{
    const t=${ctx}.view.workspace.activePane.terminal;
    t.clearSelection();
    t.textarea.dispatchEvent(new KeyboardEvent('keydown',{key:'v',code:'KeyV',metaKey:true,bubbles:true,cancelable:true}));
  })(); null`);
  // Pasted text appears at the live shell's input cursor, with no newline/command execution.
  const pasted = await waitFor(
    `JSON.stringify((()=>{
    const t=${ctx}.view.workspace.activePane.terminal;
    return t.buffer.active.getLine(t.buffer.active.baseY+t.buffer.active.cursorY)?.translateToString(true);
  })())`,
    (line) => line?.includes(marker),
  );
  assert.ok(pasted.includes(marker));
  console.log(
    'PASS: selected Ctrl+C and Cmd+V pass through the focused Obsidian scope to the system clipboard and live shell.',
  );
} finally {
  await evaluate(`(()=>{
    const cb=require('electron').clipboard;
    if(${ctx}?.previous && cb.readText()==='${marker}') cb.write(${ctx}.previous);
    ${ctx}?.view.leaf.detach(); delete ${ctx};
  })(); null`);
}
