/** Session-event reduction and durable, content-free achievement accounting. */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { achievements, progressOf } from './catalog.js';

/** Empty per-session state; only counters and lifecycle metadata are retained.
 * @returns A mutable reducer state for one session.
 */
export function emptySession() {
  return { messages: 0, toolCalls: 0, tokens: 0, steps: 0, tools: {},
    activities: {}, longMsg: 0, bestTtft: null, bestTps: 0, llmMs: 0,
    maxContext: 0, contextWindow: null, openStep: null, activeStep: null, completedGoals: [],
    subagent: false, successfulTools: {}, pendingTools: {}, skills: [], workflows: [],
    buildStage: 0, researchStage: 0, terminalStage: 0, skillPracticed: false, delegatedDelivery: false };
}

/** Calendar date and hour in the configured IANA timezone, including DST changes.
 * @param time - Event timestamp in milliseconds.
 * @param timeZone - IANA timezone name.
 * @returns Local date and hour.
 */
export function calendar(time, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(time);
  const get = type => parts.find(part => part.type === type).value;
  return { date: get('year') + '-' + get('month') + '-' + get('day'), hour: Number(get('hour')) };
}

/** Reduce an owned, ordered session event; unknown extension events only advance the cursor.
 * @param state - Mutable state for this session.
 * @param event - A persisted event outside the inherited prefix.
 * @param options - Calendar timezone and official compact-stream timestamp reader.
 * @returns The updated state.
 */
export function reduceEvent(state, event, { timeZone, firstTokenTime }) {
  const d = event.data;
  switch (event.type) {
    case 'user/message': {
      if (d.source.kind !== 'user' || event.surfaceOp !== 'append' || state.subagent) break;
      state.messages++;
      const text = d.content.filter(block => block.type === 'text').map(block => block.text).join('');
      state.longMsg = Math.max(state.longMsg, Array.from(text).length);
      const { date, hour } = calendar(event.time, timeZone);
      const hours = state.activities[date] ??= Array(24).fill(0);
      hours[hour]++;
      break;
    }
    case 'step/start':
      state.activeStep = { turn: d.turn, step: d.step };
      state.openStep = { turn: d.turn, step: d.step, time: event.time, first: null };
      break;
    case 'assistant/attempt':
      if (state.openStep?.turn === d.turn && state.openStep.step === d.step) {
        state.openStep.first ??= firstTokenTime(d.stream) ?? null;
      }
      break;
    case 'assistant/message': {
      const output = d.usage?.outputTokens;
      if (Number.isFinite(output) && output >= 0) state.tokens += output;
      const input = d.usage?.inputTokens;
      if (state.contextWindow > 0 && Number.isFinite(input) && input >= 0) {
        state.maxContext = Math.max(state.maxContext, input / state.contextWindow * 100);
      }
      const open = state.openStep;
      if (open?.turn !== d.turn || open.step !== d.step) break;
      state.llmMs += Math.max(0, event.time - open.time);
      const first = open.first ?? firstTokenTime(d.stream);
      if (first !== undefined && first !== null && first >= open.time && first <= event.time) {
        const ttft = (first - open.time) / 1000;
        state.bestTtft = state.bestTtft === null ? ttft : Math.min(state.bestTtft, ttft);
        if (output > 0 && event.time > first) {
          state.bestTps = Math.max(state.bestTps, output * 1000 / (event.time - first));
        }
      }
      state.openStep = null;
      break;
    }
    case 'step/end':
      if (state.activeStep?.turn === d.turn && state.activeStep.step === d.step) state.steps++;
      state.activeStep = null;
      state.openStep = null;
      break;
    case 'tool/call':
      state.toolCalls++;
      // Tool names arrive from providers; own properties also support names like "__proto__".
      Object.defineProperty(state.tools, d.name, {
        value: (Object.hasOwn(state.tools, d.name) ? state.tools[d.name] : 0) + 1,
        writable: true, configurable: true, enumerable: true,
      });
      Object.defineProperty(state.pendingTools, d.callId, {
        value: { name: d.name, skill: d.name === 'skill' ? skillName(d.arguments) : null },
        writable: true, configurable: true, enumerable: true,
      });
      break;
    case 'tool/result': {
      const callId = d.message.source.callId;
      const pending = Object.hasOwn(state.pendingTools, callId) ? state.pendingTools[callId] : undefined;
      if (!pending) break;
      delete state.pendingTools[callId];
      if (d.message.isError) break;
      const name = pending.name;
      Object.defineProperty(state.successfulTools, name, {
        value: (Object.hasOwn(state.successfulTools, name) ? state.successfulTools[name] : 0) + 1,
        writable: true, configurable: true, enumerable: true,
      });
      if (pending.skill && !state.skills.includes(pending.skill)) state.skills.push(pending.skill);
      const shell = name === 'bash' || name === 'pwsh';
      const modification = name === 'edit' || name === 'write';
      if (name === 'read' && state.buildStage === 0) state.buildStage = 1;
      if (modification && state.buildStage === 1) state.buildStage = 2;
      if (shell && state.buildStage === 2) state.buildStage = 3;
      if (name === 'web_search' && state.researchStage === 0) state.researchStage = 1;
      if (name === 'web_fetch' && state.researchStage === 1) state.researchStage = 2;
      if ((name === 'write' || name === 'present') && state.researchStage === 2) state.researchStage = 3;
      if (name === 'terminal_open' && state.terminalStage === 0) state.terminalStage = 1;
      if (name === 'terminal_send' && state.terminalStage === 1) state.terminalStage = 2;
      if (name === 'terminal_close' && state.terminalStage === 2) state.terminalStage = 3;
      if ((modification || shell) && state.skills.length > 0) state.skillPracticed = true;
      if (name === 'present' && state.successfulTools.subagent > 0) state.delegatedDelivery = true;
      break;
    }
    case 'turn/end':
      state.pendingTools = {};
      break;
    case 'tool-workflow/run-end':
      if (d.stopReason === 'completed' && !state.workflows.includes(d.runId)) state.workflows.push(d.runId);
      break;
    case 'request/context':
      state.contextWindow = d.contextWindow ?? null;
      break;
    case 'goal/change':
      if (d.operation !== 'clear' && d.goal.phase === 'complete' && !state.completedGoals.includes(d.goal.id)) {
        state.completedGoals.push(d.goal.id);
      }
      break;
    default:
      break;
  }
  return state;
}

/** Invalid tool arguments cannot provide a successful skill identity. */
function skillName(argumentsJson) {
  try {
    const value = JSON.parse(argumentsJson);
    return typeof value?.name === 'string' ? value.name : null;
  } catch (error) {
    // Tool validation reports malformed JSON; it contributes no skill identity here.
    return null;
  }
}

const featureGroups = {
  files: ['read','write','edit'], search: ['glob','grep'], terminal: ['bash','pwsh','terminal_open','terminal_send','terminal_read','terminal_close'],
  web: ['web_search','web_fetch'], skills: ['skill'], delegation: ['subagent'], workflow: ['workflow'],
  planning: ['todo_write'], goals: ['create_goal','update_goal'], delivery: ['present'],
  history: ['session_search','session_event_search'], semantic: ['lsp'], vision: ['read_image'],
  jobs: ['job_list','job_output','job_kill'],
};
/** Capability groups use the shipped canonical tool names.
 * @param tools - Counts keyed by tool name.
 * @returns Names of capability groups with positive usage.
 */
export function featuresOf(tools) {
  return Object.entries(featureGroups).filter(([,names]) => names.some(name => Object.hasOwn(tools,name) && tools[name] > 0)).map(([group]) => group);
}

/** Aggregate independent sessions without double-counting fork prefixes.
 * @param states - Reduced states whose inherited events have already been excluded.
 * @param options - Activity timezone and optional current timestamp.
 * @returns Totals and composite challenge metrics.
 */
export function aggregate(states, { timeZone, now = Date.now() }) {
  const stats = { sessions: 0, messages: 0, toolCalls: 0, tokens: 0, steps: 0,
    maxSteps: 0, tools: {}, hours: Array(24).fill(0), streak: 0, bestStreak: 0,
    lastDate: null, nightOwl: false, earlyBird: false, weekendUse: false,
    subagent: 0, goals: 0, sessionToolKinds: 0, sessionMaxTools: 0, sessionMaxKinds: 0,
    longMsg: 0, bestTtft: 99, bestTps: 0, longestSession: 0, maxContext: 0 };
  Object.assign(stats, { successfulTools: {}, successfulCalls: 0, toolKinds: 0, featureKinds: 0,
    distinctSkills: 0, workflows: 0, fileChanges: 0, historySearches: 0, activeDays: 0,
    buildLoops: 0, researchLoops: 0, terminalSessions: 0, skillSessions: 0, delegationSessions: 0,
    plannedSessions: 0, broadSessions: 0, archiveSessions: 0, methodSessions: 0, relaySessions: 0 });
  const dates = new Set(), skills = new Set();
  for (const state of states) {
    if (state.steps > 0) { stats.sessions++; if (state.subagent) stats.subagent++; }
    for (const key of ['messages', 'toolCalls', 'tokens', 'steps']) stats[key] += state[key];
    for (const [name, count] of Object.entries(state.tools)) {
      Object.defineProperty(stats.tools, name, {
        value: (Object.hasOwn(stats.tools, name) ? stats.tools[name] : 0) + count,
        writable: true, configurable: true, enumerable: true,
      });
    }
    const successful = state.successfulTools;
    const count = Object.values(successful).reduce((a,b) => a+b,0);
    stats.successfulCalls += count;
    for (const [name, value] of Object.entries(successful)) {
      Object.defineProperty(stats.successfulTools, name, {
        value: (Object.hasOwn(stats.successfulTools,name) ? stats.successfulTools[name] : 0) + value,
        writable: true, configurable: true, enumerable: true,
      });
    }
    state.skills.forEach(name => skills.add(name));
    stats.workflows += state.workflows.length;
    if (state.buildStage === 3) stats.buildLoops++;
    if (state.researchStage === 3) stats.researchLoops++;
    if (state.terminalStage === 3) stats.terminalSessions++;
    if (state.skillPracticed) stats.skillSessions++;
    if (state.delegatedDelivery) stats.delegationSessions++;
    if (successful.todo_write > 0 && count >= 5) stats.plannedSessions++;
    if (featuresOf(successful).length >= 6) stats.broadSessions++;
    if ((successful.session_search > 0 || successful.session_event_search > 0) && successful.web_fetch > 0 && successful.present > 0) stats.archiveSessions++;
    if (state.buildStage === 3 && successful.grep > 0 && successful.todo_write > 0) stats.methodSessions++;
    if (state.skills.length > 0 && successful.subagent > 0 && state.workflows.length > 0 && successful.present > 0) stats.relaySessions++;
    stats.goals += state.completedGoals.length;
    stats.maxSteps = Math.max(stats.maxSteps, state.steps);
    stats.sessionMaxTools = Math.max(stats.sessionMaxTools, state.toolCalls);
    stats.sessionMaxKinds = Math.max(stats.sessionMaxKinds, Object.keys(state.tools).length);
    stats.longMsg = Math.max(stats.longMsg, state.longMsg);
    stats.bestTtft = Math.min(stats.bestTtft, state.bestTtft ?? 99);
    stats.bestTps = Math.max(stats.bestTps, state.bestTps);
    stats.longestSession = Math.max(stats.longestSession, state.llmMs / 60000);
    stats.maxContext = Math.max(stats.maxContext, state.maxContext);
    for (const [date, hours] of Object.entries(state.activities)) {
      dates.add(date);
      hours.forEach((count, hour) => {
        stats.hours[hour] += count;
        if (count > 0 && hour < 5) stats.nightOwl = true;
        if (count > 0 && hour < 6) stats.earlyBird = true;
      });
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      if (day === 0 || day === 6) stats.weekendUse = true;
    }
  }
  stats.toolKinds = Object.keys(stats.successfulTools).length;
  stats.featureKinds = featuresOf(stats.successfulTools).length;
  stats.distinctSkills = skills.size;
  stats.activeDays = dates.size;
  stats.fileChanges = (stats.successfulTools.write ?? 0) + (stats.successfulTools.edit ?? 0);
  stats.historySearches = (stats.successfulTools.session_search ?? 0) + (stats.successfulTools.session_event_search ?? 0);
  stats.sessionToolKinds = stats.sessionMaxKinds;
  for (const name of ['read','write','edit','grep','glob','bash','pwsh','web_search','web_fetch']) {
    stats[name] = stats.tools[name] ?? 0;
  }
  let last = null, run = 0;
  for (const date of [...dates].sort()) {
    const day = Date.parse(date + 'T00:00:00Z') / 86400000;
    run = last !== null && day === last + 1 ? run + 1 : 1;
    last = day;
    stats.lastDate = date;
    stats.bestStreak = Math.max(stats.bestStreak, run);
  }
  const today = Date.parse(calendar(now, timeZone).date + 'T00:00:00Z') / 86400000;
  stats.streak = last === today || last === today - 1 ? run : 0;
  return stats;
}

/** SQLite checkpoints and unlocks; transactions also coordinate multiple Host processes. */
export class AchievementStore {
  constructor(path, options) {
    this.options = options;
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA busy_timeout = ' + options.busyTimeoutMs);
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version !== 0 && version !== 1) throw new Error('Unsupported achievements database version: ' + version);
      this.db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, next_seq INTEGER NOT NULL, state TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS unlocks (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
        PRAGMA user_version = 1;`);
      this.db.prepare('INSERT OR IGNORE INTO metadata VALUES (?, ?)').run('timeZone', options.timeZone);
      if (this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('timeZone').value !== options.timeZone) {
        throw new Error('Achievement timezone differs from the database; choose a new database path to change it.');
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  /** Next unread sequence, never before the inherited fork prefix.
   * @param id - Session identifier.
   * @param inherited - Number of inherited events.
   * @returns The next unread event offset.
   */
  cursor(id, inherited) {
    return Math.max(inherited, this.db.prepare('SELECT next_seq FROM sessions WHERE id = ?').get(id)?.next_seq ?? inherited);
  }
  /** Commit a contiguous page and its checkpoint together; replay is idempotent.
   * @param header - Persisted session header.
   * @param inherited - Number of inherited events.
   * @param events - An ordered event page.
   * @returns Whether any new event was committed.
   */
  ingest(header, inherited, events) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT next_seq, state FROM sessions WHERE id = ?').get(header.id);
      const state = row ? JSON.parse(row.state) : emptySession();
      state.subagent = header.origin === 'subagent';
      let next = Math.max(inherited, row?.next_seq ?? inherited);
      let changed = false;
      for (const event of events) {
        if (event.seq < next) continue;
        if (event.seq !== next) throw new Error('Non-contiguous achievement input for ' + header.id);
        reduceEvent(state, event, this.options);
        next++;
        changed = true;
      }
      if (changed) this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET next_seq=excluded.next_seq, state=excluded.state')
        .run(header.id, next, JSON.stringify(state));
      this.db.exec('COMMIT');
      return changed;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  /** Atomically evaluate achievements against all durable counters; stores no conversation content.
   * @param now - Detection timestamp for new unlocks, in milliseconds.
   * @returns Totals, unlock records and activity timezone.
   */
  snapshot(now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const states = this.db.prepare('SELECT state FROM sessions').all().map(row => JSON.parse(row.state));
      const stats = aggregate(states, { ...this.options, now });
      const unlocked = Object.fromEntries(this.db.prepare('SELECT id, at FROM unlocks').all().map(row => [row.id, { at: row.at }]));
      for (const achievement of achievements) {
        if (achievement.tier !== 'platinum' && !unlocked[achievement.id] && progressOf(achievement, stats).complete) {
          unlocked[achievement.id] = { at: now };
        }
      }
      if (achievements.filter(item => !['secret','platinum'].includes(item.tier)).every(item => unlocked[item.id])) {
        unlocked.platinum ??= { at: now };
      }
      const insert = this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)');
      for (const [id, value] of Object.entries(unlocked)) insert.run(id, value.at);
      this.db.exec('COMMIT');
      return { schemaVersion: 1, stats, unlocked, timeZone: this.options.timeZone, updatedAt: now };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  /** Release the owned database connection after all readers stop. */
  close() { this.db.close(); }
}
