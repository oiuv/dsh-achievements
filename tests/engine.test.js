import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AchievementStore, emptySession, reduceEvent, aggregate } from '../src/engine.js';
import { achievements, progressOf, playerLevel } from '../src/catalog.js';
import { dictionaries } from '../src/locales.js';

const at = Date.parse('2026-09-20T08:00:00Z');
const options = { timeZone: 'Asia/Shanghai', busyTimeoutMs: 5000, firstTokenTime: stream => stream?.[0]?.time };
const header = { id: 'session-a', origin: 'user' };
const event = (type, data, seq = 0, time = at) => ({ type, data, seq, time, surfaceOp: 'append' });
const user = (seq = 0, time = at) => event('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: 'private prompt' }] }, seq, time);
function tools(names, start = 0) {
  return names.flatMap((name, i) => [
    event('tool/call', { callId: 'c' + (start+i), name, arguments: name === 'skill' ? '{"name":"example"}' : '{"private":"payload"}' }, start+i*2),
    event('tool/result', { message: { source: { kind: 'tool', callId: 'c' + (start+i) }, content: [{ type: 'text', text: 'private result' }] } }, start+i*2+1),
  ]);
}
function memory(t) { const store = new AchievementStore(':memory:', options); t.after(() => store.close()); return store; }

test('replaying pages, restarting and skipping inherited events preserve exact totals', t => {
  const root = mkdtempSync(join(tmpdir(), 'dsha-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'stats.sqlite');
  let store = new AchievementStore(path, options);
  const events = [user(), event('step/start',{turn:1,step:1},1), event('assistant/message',{turn:1,step:1,usage:{inputTokens:500,outputTokens:12},stream:[]},2),event('step/end',{turn:1,step:1},3), ...tools(['read','edit','pwsh'],4)];
  try { store.ingest(header,0,events); store.ingest(header,0,events); assert.equal(store.cursor(header.id,0),10); }
  finally { store.close(); }
  store = new AchievementStore(path, options);
  try {
    store.ingest({ id:'fork',origin:'user' },events.length,[...events,user(10)]);
    const data = store.snapshot(at);
    assert.equal(data.stats.messages,2); assert.equal(data.stats.tokens,12);
    assert.equal(data.stats.steps,1); assert.equal(data.stats.toolCalls,3);
    assert.equal(data.stats.buildLoops,1); assert.ok(data.unlocked['first-loop']);
    assert.equal(Object.keys(data.unlocked).length,1);
    assert.equal(store.snapshot(at+100).unlocked['first-loop'].at,at);
  } finally { store.close(); }
  assert.equal(readFileSync(path).includes(Buffer.from('private prompt')),false);
  assert.equal(readFileSync(path).includes(Buffer.from('private result')),false);
  assert.equal(readFileSync(path).includes(Buffer.from('payload')),false);
});

test('a gap rolls back counters and cursor for the entire page', t => {
  const store = memory(t);
  assert.throws(() => store.ingest(header,0,[user(0),user(2)]), /Non-contiguous/);
  assert.equal(store.cursor(header.id,0),0); assert.equal(store.snapshot(at).stats.messages,0);
  store.ingest(header,0,[user(0),user(1)]);
  assert.equal(store.snapshot(at).stats.messages,2);
});

test('failed and duplicate tool results do not count as successful practice', t => {
  const store = memory(t), events = tools(['read','edit','pwsh']);
  events[3].data.message.isError=true;
  events.push({...events[1],seq:6});
  store.ingest(header,0,events);
  const stats=store.snapshot(at).stats;
  assert.equal(stats.toolCalls,3); assert.equal(stats.successfulCalls,2);
  assert.equal(stats.buildLoops,0); assert.equal(stats.successfulTools.read,1);
});

test('tool order and distinct sessions gate composite achievements', t => {
  const store=memory(t);
  store.ingest(header,0,tools(['pwsh','edit','read']));
  assert.equal(store.snapshot(at).stats.buildLoops,0);
  store.ingest(header,0,tools(['edit','pwsh','read','edit','pwsh'],6));
  assert.equal(store.snapshot(at).stats.buildLoops,1);
  assert.equal(Object.keys(store.snapshot(at).unlocked).length,1);
});

test('goal creation and failed workflow runs earn no completion credit', t => {
  const store=memory(t);
  const events=[
    event('goal/change',{operation:'create',goal:{id:'g',phase:'active'}},0),
    event('tool-workflow/run-end',{runId:'bad',stopReason:'error'},1),
    event('goal/change',{operation:'complete',goal:{id:'g',phase:'complete'}},2),
    event('goal/change',{operation:'complete',goal:{id:'g',phase:'complete'}},3),
    event('tool-workflow/run-end',{runId:'good',stopReason:'completed'},4),
    event('tool-workflow/run-end',{runId:'good',stopReason:'completed'},5),
  ];
  store.ingest(header,0,events.slice(0,2));
  assert.equal(store.snapshot(at).stats.goals,0); assert.equal(store.snapshot(at).stats.workflows,0);
  store.ingest(header,0,events);
  assert.equal(store.snapshot(at).stats.goals,1); assert.equal(store.snapshot(at).stats.workflows,1);
});

test('manual user messages alone set activity; subagents and tool messages do not', t => {
  const store=memory(t);
  store.ingest({id:'child',origin:'subagent'},0,[user()]);
  const replacement={...user(1),surfaceOp:'replace'};
  store.ingest(header,0,[user(),replacement,event('user/message',{source:{kind:'tool'},content:[]},2)]);
  assert.equal(store.snapshot(at).stats.messages,1);
  assert.equal(store.snapshot(at).stats.hours.reduce((a,b)=>a+b,0),1);
});

test('activity streaks follow calendar dates across DST and expire after inactivity', () => {
  const state=emptySession(),opts={...options,timeZone:'America/New_York'};
  for(const time of ['2026-03-07T17:00:00Z','2026-03-08T16:00:00Z','2026-03-09T16:00:00Z']) reduceEvent(state,user(0,Date.parse(time)),opts);
  assert.equal(aggregate([state],{...opts,now:Date.parse('2026-03-10T16:00:00Z')}).streak,3);
  const stats=aggregate([state],{...opts,now:Date.parse('2026-03-11T16:00:00Z')});
  assert.equal(stats.streak,0); assert.equal(stats.bestStreak,3); assert.equal(stats.activeDays,3);
});

test('output tokens remain cumulative and missing usage never gets fabricated', t => {
  const store=memory(t);
  store.ingest(header,0,[
    event('assistant/message',{turn:1,step:1,usage:{inputTokens:900,outputTokens:20},stream:[]},0),
    event('assistant/message',{turn:1,step:2,usage:{inputTokens:950,outputTokens:30},stream:[]},1),
    event('assistant/message',{turn:1,step:3,stream:[]},2),
  ]);
  assert.equal(store.snapshot(at).stats.tokens,50);
});

test('provider-controlled tool names remain data properties', t => {
  const store=memory(t);
  store.ingest(header,0,tools(['__proto__','constructor']));
  const stats=store.snapshot(at).stats;
  assert.equal(stats.successfulTools.__proto__,1);assert.equal(stats.successfulTools.constructor,1);
  assert.equal(stats.featureKinds,0);
});

test('two database owners deduplicate the same history and preserve one unlock time', t => {
  const root=mkdtempSync(join(tmpdir(),'dsha-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const path=join(root,'stats.sqlite'),a=new AchievementStore(path,options),b=new AchievementStore(path,options);
  try {
    a.ingest(header,0,tools(['read','edit','bash']));b.ingest(header,0,tools(['read','edit','bash']));
    assert.equal(a.snapshot(at).stats.buildLoops,1);
    assert.equal(b.snapshot(at+100).unlocked['first-loop'].at,at);
    assert.throws(()=>new AchievementStore(path,{...options,timeZone:'UTC'}),/timezone differs/);
  } finally {a.close();b.close();}
});

test('catalog has four onboarding rewards, graduated requirements and bilingual copy', () => {
  assert.equal(achievements.length,36);assert.equal(new Set(achievements.map(a=>a.id)).size,36);
  assert.equal(achievements.filter(a=>a.tier==='bronze').length,4);
  assert.equal(achievements.filter(a=>!['secret','platinum'].includes(a.tier)).length,32);
  assert.deepEqual(Object.keys(dictionaries.en).sort(),Object.keys(dictionaries.zh).sort());
  for(const item of achievements.filter(a=>a.tier!=='platinum')) {
    assert.equal(progressOf(item,{}).complete,false);
    assert.ok(item.requirements.every(([,target])=>target>0));
    assert.ok(dictionaries.en['achievement.'+item.id+'.name']);
  }
  assert.equal(playerLevel({}).xp,0);
  assert.equal(playerLevel({'first-loop':{at}}).xp,25);
});

test('fork repair closers without an owned step start do not fabricate activity', t => {
  const store=memory(t);
  store.ingest({id:'repaired-fork',origin:'user'},5,[
    event('step/end',{turn:1,step:2},5),
    event('turn/end',{turn:1,reason:{kind:'forked'}},6),
  ]);
  const stats=store.snapshot(at).stats;
  assert.equal(stats.steps,0);assert.equal(stats.sessions,0);
});

test('maximum player rank is attainable and platinum does not require secrets', t => {
  const all=Object.fromEntries(achievements.filter(a=>a.tier!=='secret').map(a=>[a.id,{at}]));
  assert.equal(playerLevel(all).level,6);assert.equal(playerLevel(all).next,null);
  const store=memory(t);
  for(const item of achievements.filter(a=>!['platinum','secret'].includes(a.tier))) store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(item.id,at);
  const data=store.snapshot(at);assert.ok(data.unlocked.platinum);assert.equal(Object.keys(data.unlocked).length,33);
});
