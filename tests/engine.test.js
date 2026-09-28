import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AchievementStore, emptySession, reduceEvent, aggregate } from '../src/engine.js';
import { achievements, coreAchievements, progressOf, playerLevel, achievementLevel } from '../src/catalog.js';
import { dictionaries } from '../src/locales.js';
import { at, options, recording } from './fixtures.js';

const item = id => achievements.find(a => a.id === id);
function memory(t) { const store = new AchievementStore(':memory:', options); t.after(() => store.close()); return store; }
function ingest(store, log, id = 'main', subagent = false, inherited = 0) {
  store.ingest({ id, ...(subagent ? { origin: 'subagent' } : {}) }, inherited, log.events);
}
function build(log) { for (const name of ['read', 'edit', 'pwsh']) log.call(name); }
function state(log, id = 'main', subagent = false) {
  const value = emptySession(); value.id = id; value.subagent = subagent;
  for (const event of log.events) reduceEvent(value, event, options);
  return value;
}
const totals = log => aggregate([state(log)], { ...options, now: at });
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsha-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return join(root, 'stats.sqlite');
}

test('replay, restart and fork prefixes keep checkpoints and content-free totals', t => {
  const path = temporary(t), log = recording();
  log.user(); log.begin(); build(log); log.emit('assistant/message', { turn: 1, step: 1, usage: { outputTokens: 12 } }); log.end();
  let store = new AchievementStore(path, options);
  try { ingest(store, log); ingest(store, log); assert.equal(store.cursor('main', 0), log.events.length); }
  finally { store.close(); }
  store = new AchievementStore(path, options);
  try {
    ingest(store, log, 'fork', false, log.events.length);
    const result = store.snapshot(at);
    assert.equal(result.stats.messages, 1); assert.equal(result.stats.tokens, 12);
    assert.equal(result.stats.buildLoops, 1); assert.equal(result.stats.sessions, 1);
    assert.equal(store.snapshot(at + 100).unlocked['first-loop'].at, at);
  } finally { store.close(); }
  const bytes = readFileSync(path);
  for (const content of ['private prompt', 'private result body']) assert.equal(bytes.includes(Buffer.from(content)), false);
});

test('gaps roll back the entire page and do not advance its cursor', t => {
  const store = memory(t), log = recording(); log.user(); log.user();
  log.events[1].seq = 2;
  assert.throws(() => ingest(store, log), /Non-contiguous/);
  assert.equal(store.cursor('main', 0), 0); assert.equal(store.snapshot(at).stats.messages, 0);
});

test('native and PTC operations both count; the run_code wrapper is separately visible', () => {
  const native = recording(), ptc = recording();
  native.begin(); build(native); native.end();
  ptc.begin(); ptc.ptc(['read', 'edit', 'pwsh']); ptc.end();
  const a = totals(native), b = totals(ptc);
  assert.equal(a.buildLoops, 1); assert.equal(b.buildLoops, 1);
  for (const name of ['read', 'edit', 'pwsh']) assert.equal(b.successfulTools[name], a.successfulTools[name]);
  assert.equal(a.toolCalls, 3); assert.equal(b.toolCalls, 4); assert.equal(b.ptcCalls, 3); assert.equal(b.ptcPrograms, 1);
});

test('PTC errors, unfinished subcalls and duplicate results cannot grant program awards', () => {
  for (const settings of [{ failedAt: 1 }, { rootError: true }]) {
    const log = recording(); log.begin(); log.ptc(['read', 'grep', 'pwsh'], settings); log.end();
    assert.equal(totals(log).ptcPrograms, 0);
  }
  const log = recording(); log.begin();
  const root = log.startCall('run_code');
  const sub = { rootCallId: root, parentCallId: root, subCallId: 'sub', name: 'read', arguments: {} };
  log.emit('tool/ptc-dispatch-start', sub); log.finish(root);
  log.emit('tool/ptc-dispatch', { ...sub, isError: false, content: [] });
  log.emit('tool/ptc-dispatch', { ...sub, isError: false, content: [] }); log.end();
  assert.equal(totals(log).ptcPrograms, 0); assert.equal(totals(log).successfulTools.read, 1);
});

test('PTC categories and batch sizes use successful subcalls from the same program', () => {
  const log = recording(); log.begin();
  log.ptc(['read', 'grep', 'pwsh', ...Array(7).fill('read')]); log.end();
  const stats = totals(log);
  assert.equal(stats.ptcMultiPrograms, 1); assert.equal(stats.ptcBatchPrograms, 1); assert.equal(stats.maxPtcFeatures, 3);
  const empty = recording(); empty.begin(); empty.ptc([]); empty.end(); assert.equal(totals(empty).ptcPrograms, 0);
});

test('build challenges count completed turns, neither repeated calls nor split sessions', () => {
  const log = recording(); log.begin(); build(log); build(log);
  assert.equal(totals(log).buildLoops, 0);
  log.end(); log.begin(2); build(log); log.end();
  assert.equal(totals(log).buildLoops, 2);
  for (const reason of ['error', 'aborted', 'blocked']) {
    const failed = recording(); failed.begin(); build(failed); failed.end(reason);
    assert.equal(totals(failed).buildLoops, 0);
  }
});

test('sequences cannot span turns or infer order from parallel results', () => {
  const log = recording(); log.begin(); log.call('read'); log.end(); log.begin(2); log.call('edit'); log.call('bash'); log.end();
  assert.equal(totals(log).buildLoops, 0);
  const parallel = recording(); parallel.begin();
  const ids = ['read', 'edit', 'bash'].map(name => parallel.startCall(name));
  ids.forEach(id => parallel.finish(id)); parallel.end();
  assert.equal(totals(parallel).buildLoops, 0);
});

test('failed tool returns are excluded; shell text is not interpreted as passing tests', () => {
  const failed = recording(); failed.begin(); failed.call('read'); failed.call('edit', {}, true); failed.call('bash'); failed.end();
  assert.equal(totals(failed).buildLoops, 0); assert.equal(totals(failed).failedCalls, 1);
  const shell = recording(); shell.begin(); build(shell);
  shell.events.at(-1).data.message.content = [{ type: 'text', text: '[exit code: 1]' }]; shell.end();
  assert.equal(totals(shell).buildLoops, 1);
});

test('planning must precede five other calls; completed-only or late lists do not qualify', () => {
  for (const late of [false, true]) {
    const log = recording(); log.begin();
    if (!late) log.todo(['completed', 'completed', 'completed']);
    for (let i = 0; i < 5; i++) log.call('read');
    if (late) log.todo();
    log.end(); assert.equal(totals(log).plannedTurns, 0);
  }
  const log = recording(); log.begin(); log.todo();
  for (let i = 0; i < 5; i++) log.call('read');
  log.end(); assert.equal(totals(log).plannedTurns, 1);
});

test('checklists must keep contents and order; repeated whole-list snapshots count one turn', () => {
  const log = recording(); log.begin(); log.todo(['in_progress', 'in_progress', 'pending']);
  log.todo(['completed', 'completed', 'completed']); log.todo(['completed', 'completed', 'completed']);
  build(log); log.delivery(); log.end();
  const stats = totals(log);
  assert.equal(stats.checklistTurns, 1); assert.equal(stats.parallelChecklistTurns, 1); assert.equal(stats.checklistBuildTurns, 1);
  const changed = recording(); changed.begin(); changed.todo(); changed.todo(['completed', 'completed', 'completed'], 'different'); changed.end();
  assert.equal(totals(changed).checklistTurns, 0);
  assert.equal(JSON.stringify(state(log)).includes('private todo'), false);
});

test('Skill identity works inside PTC; loading more after practice does not inflate combinations', () => {
  const log = recording(); log.begin(); log.ptc(['skill', 'edit']); log.call('skill', { name: 'late-skill' }); log.end();
  const stats = totals(log);
  assert.equal(stats.distinctSkills, 2); assert.equal(stats.skillTurns, 1); assert.equal(stats.skillComboTurns, 0); assert.equal(stats.maxSkillsPerTurn, 1);
  const combo = recording(); combo.begin(); combo.call('skill', { name: 'one' }); combo.call('skill', { name: 'two' }); combo.call('write'); combo.end();
  assert.equal(totals(combo).skillComboTurns, 1);
});

test('terminal cycles correlate sessionId and cannot combine different terminals', () => {
  const log = recording(); log.begin();
  log.call('terminal_send', { sessionId: 'private-a', text: 'private command' });
  log.call('terminal_read', { sessionId: 'private-b' }); log.call('terminal_close', { sessionId: 'private-b' });
  assert.equal(totals(log).terminalCycles, 0);
  log.call('terminal_read', { sessionId: 'private-a' }); log.call('terminal_close', { sessionId: 'private-a' }); log.call('terminal_close', { sessionId: 'private-a' }); log.end();
  assert.equal(totals(log).terminalCycles, 1); assert.equal(JSON.stringify(state(log)).includes('private command'), false);
});

test('delivery counts require domain records and deduplicate call identity', () => {
  const log = recording(); log.begin(); log.call('present'); assert.equal(totals(log).deliveries, 0);
  log.delivery(); const event = log.events.find(e => e.type === 'deliverables/presented');
  log.emit(event.type, event.data); log.end(); assert.equal(totals(log).deliveries, 1);
  assert.equal(JSON.stringify(state(log)).includes('private-file'), false);
});

test('relevant main sessions gate coverage; unrelated or child sessions cannot fill the gap', t => {
  const store = memory(t), main = recording(); main.begin();
  for (let i = 0; i < 15; i++) main.delivery();
  for (let i = 0; i < 50; i++) main.call('grep');
  for (let i = 0; i < 30; i++) main.call('glob');
  main.end(); ingest(store, main);
  for (let i = 0; i < 9; i++) { const log = recording(); log.begin(); log.call('read'); log.end(); ingest(store, log, 'other' + i); ingest(store, log, 'child' + i, true); }
  const stats = store.snapshot(at).stats;
  assert.equal(stats.sessions, 10); assert.equal(stats.subagent, 9);
  assert.equal(stats.deliverySessions, 1); assert.equal(stats.searchSessions, 1);
  assert.equal(progressOf(item('deliver'), stats).complete, false); assert.equal(progressOf(item('search-map'), stats).complete, false);
});

test('every shipped subagent provider contributes delegation usage', () => {
  const log = recording(); log.begin();
  for (const name of ['subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code']) log.call(name);
  log.end();
  assert.equal(totals(log).delegationCalls, 4); assert.equal(totals(log).featureKinds, 1); assert.equal(totals(log).collaborationTurns, 0);
});

test('collaborative delivery waits for linked child completion and is independent of import order', t => {
  const parent = recording(at + 100); parent.begin();
  parent.emit('subagent/catalog', { version: 0, childId: 'child', childCreatedAt: at, mode: 'one-shot' });
  parent.call('subagent_fork'); parent.delivery(); parent.end();
  const child = recording(at + 102); child.begin(); child.end();
  const store = memory(t); ingest(store, parent);
  assert.equal(store.snapshot(at).stats.collaborationTurns, 0);
  ingest(store, child, 'child', true);
  assert.equal(store.snapshot(at).stats.collaborationTurns, 1);
  const unlinked = state(parent); unlinked.children = {};
  assert.equal(aggregate([unlinked, state(child, 'child', true)], { ...options, now: at }).collaborationTurns, 0);
  const failed = recording(at + 102); failed.begin(); failed.end('error');
  assert.equal(aggregate([state(parent), state(failed, 'child', true)], options).collaborationTurns, 0);
  const late = recording(at + 1000); late.begin(); late.end();
  assert.equal(aggregate([state(parent), state(late, 'child', true)], options).collaborationTurns, 0);
});

test('workflow challenges inspect each member outcome and named phases', () => {
  for (const failure of [false, true]) {
    const log = recording(); log.begin();
    log.emit('tool-workflow/run-start', { runId: 'run', name: 'pipeline' });
    for (let i = 0; i < 3; i++) {
      log.emit('tool-workflow/agent-start', { runId: 'run', seq: i, childId: 'child' + i, phase: i < 2 ? 'research' : 'review' });
      log.emit('tool-workflow/agent-end', { runId: 'run', seq: i, outcome: failure && i === 1 ? 'failed' : 'completed' });
    }
    log.emit('tool-workflow/run-end', { runId: 'run', stopReason: 'completed' });
    log.emit('tool-workflow/run-end', { runId: 'run', stopReason: 'completed' }); log.end();
    const stats = totals(log);
    assert.equal(stats.workflows, 1); assert.equal(stats.cleanWorkflows, failure ? 0 : 1);
    assert.equal(stats.stagedWorkflows, failure ? 0 : 1); assert.equal(stats.maxWorkflowMembers, failure ? 0 : 3);
  }
});

test('workflow recovery requires a later start with the same name, not overlapping runs', () => {
  const log = recording(); log.begin();
  log.emit('tool-workflow/run-start', { runId: 'a', name: 'same' });
  log.emit('tool-workflow/run-start', { runId: 'b', name: 'same' });
  log.emit('tool-workflow/run-end', { runId: 'a', stopReason: 'error' });
  log.emit('tool-workflow/run-end', { runId: 'b', stopReason: 'completed' });
  assert.equal(totals(log).workflowRecoveries, 0);
  log.emit('tool-workflow/run-start', { runId: 'c', name: 'other' });
  log.emit('tool-workflow/run-end', { runId: 'c', stopReason: 'completed' });
  assert.equal(totals(log).workflowRecoveries, 0);
  log.emit('tool-workflow/run-start', { runId: 'd', name: 'same' });
  log.emit('tool-workflow/run-end', { runId: 'd', stopReason: 'completed' }); log.end();
  assert.equal(totals(log).workflowRecoveries, 1);
});

test('completed goals deduplicate IDs; recovery needs the same blocked goal', () => {
  const log = recording();
  log.emit('goal/change', { operation: 'create', goal: { id: 'a', phase: 'active' } });
  log.emit('goal/change', { operation: 'block', goal: { id: 'a', phase: 'blocked' } });
  log.emit('goal/change', { operation: 'complete', goal: { id: 'b', phase: 'complete' } });
  assert.equal(totals(log).recoveredGoals, 0);
  log.emit('goal/change', { operation: 'complete', goal: { id: 'a', phase: 'complete' } });
  log.emit('goal/change', { operation: 'complete', goal: { id: 'a', phase: 'complete' } });
  assert.equal(totals(log).goals, 2); assert.equal(totals(log).recoveredGoals, 1);
});

test('activity uses manual root messages and timezone dates, including DST', () => {
  const log = recording(); log.user(); log.user(); log.events[1].surfaceOp = 'replace';
  log.emit('user/message', { source: { kind: 'agent-message', senderSessionId: 'child' }, content: [] });
  assert.equal(totals(log).messages, 1);
  assert.equal(aggregate([state(log, 'child', true)], options).messages, 0);
  const dst = recording(), opts = { timeZone: 'America/New_York' };
  for (const time of ['2026-03-07T17:00:00Z','2026-03-08T16:00:00Z','2026-03-09T16:00:00Z']) dst.user(Date.parse(time));
  const reduced = emptySession(); for (const event of dst.events) reduceEvent(reduced, event, opts);
  assert.equal(aggregate([reduced], { ...opts, now: Date.parse('2026-03-10T16:00:00Z') }).streak, 3);
  assert.equal(aggregate([reduced], { ...opts, now: Date.parse('2026-03-11T16:00:00Z') }).streak, 0);
});

test('practice dates need both human activity and the relevant recorded work', () => {
  const log = recording(); log.begin(); build(log); log.end();
  assert.equal(totals(log).practiceDays, 0);
  log.user(); assert.equal(totals(log).practiceDays, 1);
});

test('missing usage is disclosed rather than fabricated, and opaque names remain data', () => {
  const log = recording(); log.begin();
  log.emit('assistant/message', { usage: { outputTokens: 20 } }); log.emit('assistant/message', { usage: { outputTokens: 30 } });
  log.emit('assistant/message', {}); log.call('__proto__'); log.call('constructor'); log.end();
  const stats = totals(log);
  assert.equal(stats.tokens, 50); assert.equal(stats.knownUsage, 2); assert.equal(stats.missingUsage, 1);
  assert.equal(stats.successfulTools.__proto__, 1); assert.equal(stats.successfulTools.constructor, 1); assert.equal(stats.featureKinds, 0);
});

test('two database owners deduplicate input and retain the original unlock timestamp', t => {
  const path = temporary(t), a = new AchievementStore(path, options), b = new AchievementStore(path, options), log = recording();
  log.begin(); build(log); log.end();
  try {
    ingest(a, log); ingest(b, log); assert.equal(a.snapshot(at).stats.buildLoops, 1);
    assert.equal(b.snapshot(at + 100).unlocked['first-loop'].at, at);
    assert.throws(() => new AchievementStore(path, { ...options, timeZone: 'UTC' }), /timezone differs/);
  } finally { a.close(); b.close(); }
});

test('development v1 counters reset and can replay; newer database versions fail without resetting', t => {
  const path = temporary(t), old = new DatabaseSync(path);
  old.exec("CREATE TABLE sessions (id TEXT, next_seq INTEGER, state TEXT); INSERT INTO sessions VALUES ('old', 999, '{}'); CREATE TABLE unlocks (id TEXT, at INTEGER); INSERT INTO unlocks VALUES ('platinum', 1); PRAGMA user_version=1;");
  old.close();
  const store = new AchievementStore(path, options);
  try {
    assert.equal(store.cursor('old', 0), 0); assert.deepEqual(store.snapshot(at).unlocked, {});
    const log = recording(); log.begin(); build(log); log.end(); ingest(store, log); assert.equal(store.snapshot(at).stats.buildLoops, 1);
    store.db.exec('PRAGMA user_version=99');
  } finally { store.close(); }
  assert.throws(() => new AchievementStore(path, options), /Unsupported/);
  const check = new DatabaseSync(path); try { assert.equal(check.prepare('SELECT count(*) AS n FROM sessions').get().n, 1); } finally { check.close(); }
});

test('fork repair closers without owned starts fabricate neither sessions nor turns', t => {
  const log = recording(); log.emit('step/end', { turn: 1, step: 2 }); log.emit('turn/end', { turn: 1, reason: { kind: 'forked' } });
  const stats = totals(log); assert.equal(stats.steps, 0); assert.equal(stats.sessions, 0); assert.equal(stats.completedTurns, 0);
});

test('81 unique awards comprise 72 public and 9 hidden; every requirement has an existing metric and locale', () => {
  assert.equal(achievements.length, 81); assert.equal(new Set(achievements.map(a => a.id)).size, 81);
  assert.equal(achievements.filter(a => a.tier === 'secret').length, 9); assert.equal(coreAchievements.length, 24);
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.zh).sort());
  const empty = aggregate([], options);
  for (const a of achievements) {
    if (a.tier !== 'platinum') assert.equal(progressOf(a, empty).complete, false);
    for (const [metric, target] of a.requirements) {
      assert.ok(Number.isSafeInteger(target) && target > 0);
      if (!metric.startsWith('tool.')) { assert.ok(Object.hasOwn(empty, metric), metric); assert.ok(dictionaries.zh['metric.' + metric], metric); }
    }
  }
});

test('only marked cumulative awards level up, exactly at each doubling', () => {
  const eligible = new Set(['buildLoops','plannedTurns','checklistTurns','goals','archiveTurns','visionDeliveryTurns',
    'workflows','cleanWorkflows','ptcMultiPrograms','ptcBatchPrograms','terminalCycles','semanticDeliveryTurns',
    'resourceDeliveryTurns','browserDeliveryTurns','mappedBuildTurns','parallelChecklistTurns','ptcDeliveryTurns','tokens','collaborationTurns']);
  for (const a of achievements) {
    if (!a.upgrade) { assert.equal(achievementLevel(a, {}), null); continue; }
    assert.equal(a.requirements.length, 1); assert.equal(['bronze','secret','platinum'].includes(a.tier), false);
    const [metric, base] = a.requirements[0]; assert.ok(eligible.has(metric));
    for (const [value, level] of [[0,0],[base-1,0],[base,1],[base*2-1,1],[base*2,2],[base*4,3]]) {
      const result = achievementLevel(a, { [metric]: value });
      assert.equal(result.level, level); assert.equal(result.target, base * 2 ** level);
      assert.ok(result.fraction >= 0 && result.fraction < 1);
    }
  }
  assert.equal(achievements.filter(a => a.upgrade).length, 19);
});

test('achievement levels survive restart and replay without re-awarding first-unlock XP', t => {
  const path = temporary(t), log = recording(); log.emit('assistant/message', { usage: { outputTokens: 1000000 } });
  let store = new AchievementStore(path, options);
  try { ingest(store, log); assert.equal(store.snapshot(at).unlocked['token-scribe'].at, at); } finally { store.close(); }
  store = new AchievementStore(path, options);
  try {
    log.emit('assistant/message', { usage: { outputTokens: 3000000 } });
    ingest(store, log); ingest(store, log); const data = store.snapshot(at + 10);
    assert.equal(achievementLevel(item('token-scribe'), data.stats).level, 3);
    assert.equal(data.unlocked['token-scribe'].at, at); assert.equal(playerLevel(data.unlocked).xp, 75);
  } finally { store.close(); }
});

test('platinum needs core first unlocks only; starter rewards and maximum player rank are attainable', t => {
  const store = memory(t);
  for (const a of coreAchievements) store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(a.id, at);
  assert.ok(store.snapshot(at).unlocked.platinum); assert.equal(Object.keys(store.snapshot(at).unlocked).length, 25);
  const starters = Object.fromEntries(coreAchievements.slice(0,4).map(a => [a.id, { at }]));
  assert.equal(playerLevel(starters).xp, 100); assert.ok(playerLevel(starters).level > 1);
  const publicAwards = Object.fromEntries(achievements.filter(a => a.tier !== 'secret').map(a => [a.id, { at }]));
  assert.equal(playerLevel(publicAwards).level, 10); assert.equal(playerLevel(publicAwards).next, null);
});

test('the shipped PTC recording replays identically across persistence pages', t => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/ptc-workspace.json', import.meta.url), 'utf8'));
  const events = rows.map((event, seq) => ({ ...event, seq, time: at + seq, surfaceOp: 'append' }));
  const store = memory(t);
  for (let i = 0; i < events.length; i += 2) store.ingest({ id: 'recorded' }, 0, events.slice(i, i + 2));
  const once = store.snapshot(at);
  store.ingest({ id: 'recorded' }, 0, events);
  assert.deepEqual(store.snapshot(at), once);
  assert.equal(once.stats.ptcCalls, 1); assert.equal(once.stats.ptcPrograms, 1);
  assert.equal(once.stats.successfulTools.bash, 1); assert.equal(once.stats.successfulTools.run_code, 1);
  assert.equal(once.stats.completedTurns, 1); assert.ok(once.unlocked['first-program']);
});

test('the same goal identity completed in two branches earns one completion', () => {
  const a = recording(), b = recording();
  for (const log of [a, b]) {
    log.emit('goal/change', { operation: 'block', goal: { id: 'shared-goal', phase: 'blocked' } });
    log.emit('goal/change', { operation: 'complete', goal: { id: 'shared-goal', phase: 'complete' } });
  }
  const stats = aggregate([state(a, 'a'), state(b, 'b')], options);
  assert.equal(stats.goals, 1); assert.equal(stats.recoveredGoals, 1);
});

test('terminal ordering requires each call to start after the preceding return', () => {
  const log = recording(); log.begin();
  const ids = ['terminal_send', 'terminal_read', 'terminal_close'].map(name => log.startCall(name, { sessionId: 'same' }));
  ids.forEach(id => log.finish(id)); log.end();
  assert.equal(totals(log).terminalCycles, 0);
});

test('a later PTC program does not erase an earlier program followed by a delivery', () => {
  const log = recording(); log.begin(); log.ptc(['read']); log.delivery(); log.ptc(['grep']); log.end();
  assert.equal(totals(log).ptcDeliveryTurns, 1);
});

test('workflow sequence numbers resolve same-millisecond recovery without crediting overlap', () => {
  for (const overlap of [false, true]) {
    const log = recording();
    log.emit('tool-workflow/run-start', { runId: 'a', name: 'same' }, at);
    if (overlap) log.emit('tool-workflow/run-start', { runId: 'b', name: 'same' }, at);
    log.emit('tool-workflow/run-end', { runId: 'a', stopReason: 'error' }, at);
    if (!overlap) log.emit('tool-workflow/run-start', { runId: 'b', name: 'same' }, at);
    log.emit('tool-workflow/run-end', { runId: 'b', stopReason: 'completed' }, at);
    assert.equal(totals(log).workflowRecoveries, overlap ? 0 : 1);
  }
});
