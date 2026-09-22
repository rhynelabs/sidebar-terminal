import assert from 'node:assert/strict';
import { obsidianCli } from './obsidian-cli.mjs';

const { evaluate, waitFor } = obsidianCli(process.argv[2], process.argv[3]);
const ctx = 'window.__otProfileSmoke';

const buffer = (view) =>
  `Array.from({length:${view}.workspace.activePane.terminal.buffer.active.length},(_,i)=>${view}.workspace.activePane.terminal.buffer.active.getLine(i)?.translateToString()).join('\\n')`;
async function open(profile, key) {
  await evaluate(
    `app.plugins.plugins['sidebar-terminal'].open(${JSON.stringify(profile)}).then(v=>${ctx}.${key}=v); null`,
  );
  await waitFor(`JSON.stringify(!!${ctx}.${key}?.workspace.activePane?.running)`, Boolean);
  return `${ctx}.${key}`;
}
await evaluate(`${ctx}={}; null`);
try {
  const first = await open('shell', 'first');
  await evaluate(
    `${first}.workspace.activePane.terminal.input("printf 'BUFFER_%s\\n' 'ONE_9348'\\r",true); null`,
  );
  await waitFor(`JSON.stringify(${buffer(first)})`, (text) => text?.includes('BUFFER_ONE_9348'));
  const second = await open('shell', 'second');
  await evaluate(
    `${second}.workspace.activePane.terminal.input("printf 'BUFFER_%s\\n' 'TWO_2871'\\r",true); null`,
  );
  await waitFor(`JSON.stringify(${buffer(second)})`, (text) => text?.includes('BUFFER_TWO_2871'));
  assert.equal(await evaluate(`JSON.stringify(${buffer(second)}.includes('BUFFER_ONE_9348'))`), false);
  await evaluate(`app.workspace.setActiveLeaf(${first}.leaf,{focus:true}); null`);
  assert.equal(await evaluate(`JSON.stringify(${buffer(first)}.includes('BUFFER_TWO_2871'))`), false);
  await evaluate(`${second}.workspace.split('right'); ${second}.workspace.split('down'); null`);
  await waitFor(
    `JSON.stringify([...${second}.workspace.terminals.values()].every(p=>p.running && p.session?.process?.pid))`,
    Boolean,
  );
  await evaluate(
    `${ctx}.pids=[...${second}.workspace.terminals.values()].map(p=>p.session.process.pid); ${second}.leaf.detach(); null`,
  );
  await waitFor(
    `JSON.stringify(${ctx}.pids.every(pid=>{try{require('process').kill(pid,0);return false}catch{return true}}))`,
    Boolean,
  );
  console.log(
    'PASS: independent tab buffers survive switching; closing a split tab ends every owned bridge.',
  );
  for (const profile of ['codex', 'claude']) {
    const start = Date.now();
    const view = await open(profile, profile);
    await waitFor(`JSON.stringify(${buffer(view)})`, (text) =>
      profile === 'codex'
        ? text?.includes('OpenAI Codex')
        : /Claude Code|Welcome to Claude|trust this folder/i.test(text || ''),
    );
    console.log(`PASS: ${profile} profile rendered in ${Date.now() - start} ms after shell initialization.`);
    await evaluate(`${view}.workspace.activePane.terminal.input('\\x03',true); null`);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await evaluate(`${view}.workspace.activePane.terminal.input('\\x03',true); null`);
    if (profile === 'claude') {
      // Claude may consume Ctrl+C itself; its exit command must return to the same shell too.
      await evaluate(`${view}.workspace.activePane.terminal.input('/exit\\r',true); null`);
    }
    await waitFor(`JSON.stringify(${buffer(view)})`, (text) => /➜\s+\S/.test(text || ''));
    assert.equal(await evaluate(`JSON.stringify(${view}.workspace.activePane.running)`), true);
    console.log(`PASS: exiting ${profile} returns to the interactive shell in the same pane.`);
    await evaluate(`${view}.leaf.detach(); null`);
  }
} finally {
  await evaluate(
    `for(const key of ['first','second','codex','claude']) ${ctx}?.[key]?.leaf.detach(); delete ${ctx}; null`,
  );
}
