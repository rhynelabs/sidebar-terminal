import assert from 'node:assert/strict';
import { obsidianCli } from './obsidian-cli.mjs';

const { evaluate, waitFor } = obsidianCli(process.argv[2], process.argv[3]);

const context = 'window.__obsidianTerminalSmoke';
const workspace = `${context}.view.workspace`;
const pane = `${workspace}.activePane`;
try {
  await evaluate(
    `app.plugins.plugins["sidebar-terminal"].open("shell").then(view=>{${context}={view,leaf:view.leaf};}); null`,
  );
  await waitFor(`JSON.stringify(!!${context}?.view?.workspace?.activePane?.running)`, Boolean);
  await evaluate(`(()=>{
    const el=document.createElement('div'); el.style.cssText='position:fixed;left:-10000px;width:500px;height:400px'; document.body.append(el);
    const terminal=new ${pane}.terminal.constructor({cols:60,rows:20,theme:{background:'#1c1c1c'}});
    terminal.open(el); ${context}.probe={terminal,el,response:''}; terminal.onData(data=>${context}.probe.response+=data);
    terminal.write('\\x1b]11;'); terminal.write('?\\x07');
  })(); null`);
  await waitFor(`JSON.stringify(${context}.probe.response)`, (response) =>
    response?.includes('rgb:1c1c/1c1c/1c1c'),
  );
  await evaluate(
    `${context}.probe.terminal.options.theme={background:'#eeeeee'}; ${context}.probe.response=''; ${context}.probe.terminal.write('\\x1b]11;?\\x07'); null`,
  );
  await waitFor(`JSON.stringify(${context}.probe.response)`, (response) =>
    response?.includes('rgb:eeee/eeee/eeee'),
  );
  await evaluate(
    `${context}.probe.terminal.dispose(); ${context}.probe.el.remove(); delete ${context}.probe; null`,
  );
  await evaluate(
    `${pane}.terminal.input("printf 'OT_SMOKE_%s\\n' 'ä_unicode'; stty size\\r".replaceAll('\\\\r','\\r'),true); null`,
  );
  const buffer = `JSON.stringify(Array.from({length:${pane}.terminal.buffer.active.length},(_,i)=>${pane}.terminal.buffer.active.getLine(i)?.translateToString()).join("\\n"))`;
  await waitFor(buffer, (output) => typeof output === 'string' && output.includes('OT_SMOKE_ä_unicode'));
  await evaluate(`${workspace}.split("right"); ${workspace}.split("down"); null`);
  await waitFor(`JSON.stringify(${workspace}.terminals.size)`, (count) => count === 3);
  const sizes = await waitFor(
    `JSON.stringify([...${workspace}.terminals.values()].map(p=>({cols:p.terminal.cols,rows:p.terminal.rows,running:p.running,font:p.terminal.options.fontFamily})))`,
    (values) => values?.every((p) => p.running && p.cols > 2 && p.rows > 1),
  );
  assert.ok(sizes.every((p) => p.font.includes('Sidebar Terminal Mono')));
  await evaluate(`${workspace}.toggleZoom(); null`);
  assert.equal(await evaluate(`JSON.stringify(${workspace}.zoomed)`), true);
  await evaluate(`(()=>{
    const plugin=app.plugins.plugins['sidebar-terminal'];
    ${context}.profileId='restore-test-'+crypto.randomUUID();
    plugin.settings.profiles.push({id:${context}.profileId,name:'Restore test',command:"printf 'UNEXPECTED_%s\\n' REPLAY"});
    ${pane}.spec.profile=${context}.profileId;
    ${context}.focusProbe=document.createElement('input');
    document.body.append(${context}.focusProbe); ${context}.focusProbe.focus();
  })(); null`);
  await evaluate(
    `${workspace}.toggleZoom(); ${context}.focusProbe.focus(); ${context}.saved=JSON.parse(JSON.stringify(${context}.view.getState())); ${context}.pids=[...${workspace}.terminals.values()].map(p=>p.session?.process?.pid).filter(Boolean); ${context}.view.setState(${context}.saved,{history:false}); null`,
  );
  await waitFor(
    `JSON.stringify([...${workspace}.terminals.values()].every(p=>p.running && p.session?.process?.pid))`,
    Boolean,
  );
  assert.equal(await evaluate(`JSON.stringify(${workspace}.terminals.size)`), 3);
  await waitFor(
    `JSON.stringify(${context}.pids.every(pid=>{try{require("process").kill(pid,0);return false}catch{return true}}))`,
    Boolean,
  );
  await evaluate(
    `${workspace}.terminals.forEach((p,id)=>p.terminal.input("printf 'RESTORED_%s\\n' '"+id+"'\\r",true)); null`,
  );
  await waitFor(
    `JSON.stringify([...${workspace}.terminals].every(([id,p])=>Array.from({length:p.terminal.buffer.active.length},(_,i)=>p.terminal.buffer.active.getLine(i)?.translateToString()).join("\\n").includes('RESTORED_'+id)))`,
    Boolean,
  );
  assert.equal(await evaluate(`JSON.stringify(document.activeElement===${context}.focusProbe)`), true);
  assert.equal(
    await evaluate(
      `JSON.stringify([...${workspace}.terminals.values()].some(p=>Array.from({length:p.terminal.buffer.active.length},(_,i)=>p.terminal.buffer.active.getLine(i)?.translateToString()).join('').includes('UNEXPECTED_REPLAY')))`,
    ),
    false,
  );
  console.log(
    'PASS: Live color queries and theme updates, real shell, Unicode, splits, sizing, font, zoom, restored shells, no preset replay, focus and cleanup.',
  );
} finally {
  await evaluate(
    `app.plugins.plugins['sidebar-terminal'].settings.profiles=app.plugins.plugins['sidebar-terminal'].settings.profiles.filter(p=>p.id!==${context}?.profileId); ${context}?.focusProbe?.remove(); ${context}?.probe?.terminal.dispose(); ${context}?.probe?.el.remove(); ${context}?.leaf.detach(); delete ${context}; null`,
  );
}
