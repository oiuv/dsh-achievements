/** SQLite checkpoints and aggregate statistics from content-free session records. */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { achievements, coreAchievements, progressOf, catalogVersion } from './catalog.js';
import { calendar, emptySession, reduceEvent, featuresOf, own, put } from './events.js';
export { calendar, emptySession, reduceEvent, featuresOf } from './events.js';

const sumMetrics = ['failedCalls', 'ptcCalls', 'ptcPrograms', 'ptcMultiPrograms', 'ptcBatchPrograms',
  'delegationCalls', 'terminalCycles', 'deliveries', 'buildLoops', 'researchLoops', 'plannedTurns',
  'checklistTurns', 'parallelChecklistTurns', 'skillTurns', 'skillComboTurns', 'broadTurns', 'archiveTurns',
  'visionDeliveryTurns', 'semanticDeliveryTurns', 'resourceDeliveryTurns', 'browserDeliveryTurns',
  'checklistBuildTurns', 'methodTurns', 'mappedBuildTurns', 'quietBuildTurns', 'skillResearchTurns', 'ptcDeliveryTurns'];
const maxMetrics = ['maxPtcFeatures', 'maxTurnFeatures', 'maxSkillsPerTurn'];
const increment = (object, name, value) => put(object, name, (own(object, name) ?? 0) + value);

/** Aggregate owned events. Cross-session awards require both the parent catalog and child completion.
 * @param states - Independent session states with inherited prefixes excluded.
 * @param options - Activity timezone and evaluation time.
 * @returns Exact counters and recorded-behavior challenge metrics.
 */
export function aggregate(states, { timeZone, now = Date.now() }) {
  const stats = { sessions: 0, subagent: 0, messages: 0, toolCalls: 0, tokens: 0, steps: 0,
    knownUsage: 0, missingUsage: 0, completedTurns: 0, tools: {}, successfulTools: {}, hours: Array(24).fill(0),
    streak: 0, bestStreak: 0, lastDate: null, activeDays: 0, activeWeeks: 0, activeMonths: 0,
    goals: 0, recoveredGoals: 0, workflows: 0, cleanWorkflows: 0, stagedWorkflows: 0, distinctWorkflows: 0,
    failedWorkflows: 0, cancelledWorkflows: 0, workflowRecoveries: 0, maxWorkflowMembers: 0,
    collaborationTurns: 0, maxTeamSize: 0, relayTurns: 0, searchSessions: 0, deliverySessions: 0,
    historySessions: 0, maxDeliveredSessionTurns: 0, practiceDays: 0, researchDays: 0, deliveryDays: 0 };
  for (const key of [...sumMetrics, ...maxMetrics]) stats[key] = 0;
  const dates = new Set(), skills = new Set(), workflowNames = new Set();
  const completedGoalIds = new Set(), recoveredGoalIds = new Set();
  const buildDates = new Set(), researchDates = new Set(), deliveryDates = new Set(), runs = [];
  const byId = new Map(states.filter(state => state.id !== null).map(state => [state.id, state]));
  for (const state of states) {
    const primary = !state.subagent;
    if (state.steps > 0) { if (primary) stats.sessions++; else stats.subagent++; }
    for (const key of ['messages', 'toolCalls', 'tokens', 'steps', 'knownUsage', 'missingUsage']) stats[key] += state[key];
    stats.completedTurns += state.completedTurns.length;
    for (const [key, count] of Object.entries(state.tools)) increment(stats.tools, key, count);
    for (const [key, count] of Object.entries(state.successfulTools)) increment(stats.successfulTools, key, count);
    for (const key of sumMetrics) stats[key] += state.metrics[key] ?? 0;
    for (const key of maxMetrics) stats[key] = Math.max(stats[key], state.metrics[key] ?? 0);
    state.skills.forEach(name => skills.add(name));
    for (const id of state.completedGoals) {
      completedGoalIds.add(id);
      if (state.blockedGoals.includes(id)) recoveredGoalIds.add(id);
    }
    const used = name => (own(state.successfulTools, name) ?? 0) > 0;
    if (primary && state.steps > 0) {
      if (used('grep') && used('glob')) stats.searchSessions++;
      if (used('session_search') || used('session_event_search')) stats.historySessions++;
      if (Object.keys(state.deliveries).length > 0) {
        stats.deliverySessions++;
        stats.maxDeliveredSessionTurns = Math.max(stats.maxDeliveredSessionTurns, state.completedTurns.length);
      }
    }
    for (const delivery of Object.values(state.deliveries)) deliveryDates.add(delivery.date);
    for (const turn of state.completedTurns) {
      if (turn.build) buildDates.add(turn.date);
      if (turn.research) researchDates.add(turn.date);
      if (!primary || turn.deliveryAt === null) continue;
      const team = Object.entries(state.children).filter(([id, entry]) => {
        const child = byId.get(id);
        return child?.subagent && child.completedTurns.some(response =>
          response.end >= Math.max(turn.start, entry.at) && response.end <= turn.deliveryAt);
      }).length;
      stats.maxTeamSize = Math.max(stats.maxTeamSize, team);
      if (team > 0) {
        stats.collaborationTurns++;
        if (turn.skill && turn.workflow) stats.relayTurns++;
      }
    }
    for (const run of Object.values(state.workflowRuns)) {
      if (run.status === null) continue;
      runs.push({ ...run, sessionId: state.id });
      if (run.status === 'error') stats.failedWorkflows++;
      if (run.status === 'cancelled') stats.cancelledWorkflows++;
      if (run.status !== 'completed') continue;
      stats.workflows++;
      workflowNames.add(run.name);
      const members = Object.values(run.members);
      const completed = members.length >= 3 && members.every(member => member.outcome === 'completed');
      if (completed) {
        stats.cleanWorkflows++;
        stats.maxWorkflowMembers = Math.max(stats.maxWorkflowMembers, members.length);
        if (new Set(members.map(member => member.phase).filter(phase => phase !== null)).size >= 2) stats.stagedWorkflows++;
      }
    }
    for (const [date, hours] of Object.entries(state.activities)) {
      dates.add(date);
      hours.forEach((count, hour) => { stats.hours[hour] += count; });
    }
  }
  // Sequence numbers establish same-millisecond order only within one session.
  const failuresByName = new Map();
  runs.sort((a, b) => a.end - b.end || String(a.sessionId).localeCompare(String(b.sessionId)) || a.endSeq - b.endSeq);
  for (const run of runs) {
    if (run.status === 'error') {
      const failures = failuresByName.get(run.name) ?? [];
      failures.push(run); failuresByName.set(run.name, failures);
    }
    if (run.status === 'completed' && (failuresByName.get(run.name) ?? []).some(failed =>
      run.start > failed.end || (run.sessionId === failed.sessionId && run.start === failed.end && run.startSeq > failed.endSeq))) {
      stats.workflowRecoveries++; failuresByName.delete(run.name);
    }
  }
  stats.successfulCalls = Object.values(stats.successfulTools).reduce((a, b) => a + b, 0);
  stats.toolKinds = Object.keys(stats.successfulTools).length;
  stats.featureKinds = featuresOf(stats.successfulTools).length;
  stats.distinctSkills = skills.size;
  stats.distinctWorkflows = workflowNames.size;
  stats.goals = completedGoalIds.size; stats.recoveredGoals = recoveredGoalIds.size;
  stats.fileChanges = (own(stats.successfulTools, 'write') ?? 0) + (own(stats.successfulTools, 'edit') ?? 0);
  stats.historySearches = (own(stats.successfulTools, 'session_search') ?? 0) + (own(stats.successfulTools, 'session_event_search') ?? 0);
  stats.activeDays = dates.size;
  stats.activeWeeks = new Set([...dates].map(date => Math.floor((Date.parse(date + 'T00:00:00Z') / 86400000 + 3) / 7))).size;
  stats.activeMonths = new Set([...dates].map(date => date.slice(0, 7))).size;
  for (const [key, candidates] of [['practiceDays', buildDates], ['researchDays', researchDates], ['deliveryDays', deliveryDates]]) {
    stats[key] = [...dates].filter(date => candidates.has(date)).length;
  }
  let last = null, run = 0;
  for (const date of [...dates].sort()) {
    const day = Date.parse(date + 'T00:00:00Z') / 86400000;
    run = last !== null && day === last + 1 ? run + 1 : 1;
    last = day; stats.lastDate = date; stats.bestStreak = Math.max(stats.bestStreak, run);
  }
  const today = Date.parse(calendar(now, timeZone).date + 'T00:00:00Z') / 86400000;
  stats.streak = last === today || last === today - 1 ? run : 0;
  return stats;
}

/** SQLite transactions coordinate checkpoint and unlock writes across Host processes. */
export class AchievementStore {
  constructor(path, options) {
    this.options = options;
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA busy_timeout = ' + options.busyTimeoutMs);
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const version = this.db.prepare('PRAGMA user_version').get().user_version;
        if (![0, 1, 2].includes(version)) throw new Error('Unsupported achievements database version: ' + version);
        // Development v1 counters cannot establish v2 conditions. Source session logs are untouched.
        if (version === 1) this.db.exec('DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS unlocks; DROP TABLE IF EXISTS metadata;');
        this.db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, next_seq INTEGER NOT NULL, state TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS unlocks (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
          PRAGMA user_version = 2;`);
        this.db.prepare('INSERT OR IGNORE INTO metadata VALUES (?, ?)').run('timeZone', options.timeZone);
        if (this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('timeZone').value !== options.timeZone) {
          throw new Error('Achievement timezone differs from the database; choose a new database path to change it.');
        }
        this.db.exec('COMMIT');
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    } catch (error) { this.db.close(); throw error; }
  }
  /** Next unread sequence, never before the inherited fork prefix.
   * @param id - Session identifier.
   * @param inherited - Number of inherited events.
   * @returns Next unread event offset.
   */
  cursor(id, inherited) {
    return Math.max(inherited, this.db.prepare('SELECT next_seq FROM sessions WHERE id = ?').get(id)?.next_seq ?? inherited);
  }
  /** Commit a contiguous page and checkpoint together; replay is idempotent.
   * @param header - Persisted session header.
   * @param inherited - Number of inherited events.
   * @param events - Ordered event page.
   * @returns Whether any new event was committed.
   */
  ingest(header, inherited, events) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT next_seq, state FROM sessions WHERE id = ?').get(header.id);
      const state = row ? JSON.parse(row.state) : emptySession();
      state.id = header.id; state.subagent = header.origin === 'subagent';
      let next = Math.max(inherited, row?.next_seq ?? inherited), changed = false;
      for (const event of events) {
        if (event.seq < next) continue;
        if (event.seq !== next) throw new Error('Non-contiguous achievement input for ' + header.id);
        reduceEvent(state, event, this.options);
        next++; changed = true;
      }
      if (changed) this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET next_seq=excluded.next_seq, state=excluded.state')
        .run(header.id, next, JSON.stringify(state));
      this.db.exec('COMMIT');
      return changed;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  /** Evaluate first-time awards; platinum requires only the fixed core collection.
   * @param now - Detection timestamp in milliseconds.
   * @returns Totals, unlocks and activity timezone.
   */
  snapshot(now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const states = this.db.prepare('SELECT state FROM sessions').all().map(row => JSON.parse(row.state));
      const stats = aggregate(states, { ...this.options, now });
      const unlocked = Object.fromEntries(this.db.prepare('SELECT id, at FROM unlocks').all().map(row => [row.id, { at: row.at }]));
      for (const item of achievements) {
        if (item.tier !== 'platinum' && !unlocked[item.id] && progressOf(item, stats).complete) unlocked[item.id] = { at: now };
      }
      if (coreAchievements.every(item => unlocked[item.id])) unlocked.platinum ??= { at: now };
      const insert = this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)');
      for (const [id, value] of Object.entries(unlocked)) insert.run(id, value.at);
      this.db.exec('COMMIT');
      return { schemaVersion: 2, catalogVersion, stats, unlocked, timeZone: this.options.timeZone, updatedAt: now };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  /** Close after every collector has stopped reading. */
  close() { this.db.close(); }
}
