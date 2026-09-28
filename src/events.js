/** Content-free reduction of DSH's durable native, PTC and domain events. */
import { createHash } from 'node:crypto';

/** Read an own property, including provider-supplied names such as __proto__.
 * @param object - Record containing opaque keys.
 * @param key - Property name.
 * @returns Stored value or undefined.
 */
export const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
/** Write an opaque identity without invoking inherited setters.
 * @param object - Destination record.
 * @param key - Property name.
 * @param value - Value to retain.
 * @returns The destination record.
 */
export const put = (object, key, value) => Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
const add = (object, key, value = 1) => put(object, key, (own(object, key) ?? 0) + value);
const digest = value => createHash('sha256').update(value).digest('hex');
const delegationNames = ['subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code'];
const groups = {
  files: ['read', 'write', 'edit'], search: ['glob', 'grep'],
  terminal: ['bash', 'pwsh', 'terminal_open', 'terminal_send', 'terminal_read', 'terminal_close', 'terminal_list', 'terminal_signal'],
  web: ['web_search', 'web_fetch'], skills: ['skill'], delegation: [...delegationNames, 'send_message', 'interrupt_agent', 'list_agents'],
  workflow: ['workflow'], planning: ['todo_write'], goals: ['create_goal', 'update_goal', 'get_goal'],
  delivery: ['present'], history: ['session_search', 'session_event_search'], semantic: ['lsp'], vision: ['read_image'],
  jobs: ['job_list', 'job_output', 'job_kill'], programming: ['run_code'],
  resources: ['list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource'],
  browser: ['stagehand_act', 'stagehand_extract', 'stagehand_navigate', 'stagehand_observe', 'stagehand_screenshot', 'stagehand_tabs'],
  interaction: ['ask_user_question'],
};

/** Recognized shipped capability groups; configurable tool renames are not inferred.
 * @param tools - Counts keyed by the recorded tool name.
 * @returns Used capability group names.
 */
export function featuresOf(tools) {
  return Object.entries(groups).filter(([, names]) => names.some(name => own(tools, name) > 0)).map(([group]) => group);
}

/** Empty state retains counters and identities, never conversation or result bodies.
 * @returns Mutable state for one session's owned events.
 */
export function emptySession() {
  return { id: null, subagent: false, messages: 0, toolCalls: 0, tokens: 0, steps: 0,
    knownUsage: 0, missingUsage: 0, tools: {}, successfulTools: {}, activities: {},
    metrics: {}, pendingTools: {}, programs: {}, terminals: {}, skills: [], completedGoals: [], blockedGoals: [],
    workflowRuns: {}, children: {}, completedTurns: [], deliveries: {}, turn: null, activeStep: null };
}

/** Calendar fields use the configured timezone, including daylight-saving transitions.
 * @param time - Epoch milliseconds.
 * @param timeZone - IANA timezone.
 * @returns Local date and hour.
 */
export function calendar(time, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(time);
  const get = type => parts.find(part => part.type === type).value;
  return { date: get('year') + '-' + get('month') + '-' + get('day'), hour: Number(get('hour')) };
}

function argumentsOf(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); }
  catch (error) { return null; } // Invalid JSON contributes no parameter-derived identity.
}

function beginCall(state, event, nested) {
  const d = event.data, id = nested ? d.subCallId : d.callId;
  if (own(state.pendingTools, id)) return;
  const args = argumentsOf(d.arguments);
  const pending = { name: d.name, seq: event.seq, turn: state.turn?.id ?? null, root: nested ? d.rootCallId : null,
    skill: d.name === 'skill' && typeof args?.name === 'string' ? args.name : null,
    terminal: d.name.startsWith('terminal_') && typeof args?.sessionId === 'string' ? digest(args.sessionId) : null };
  put(state.pendingTools, id, pending);
  state.toolCalls++;
  add(state.tools, d.name);
  if (!nested && d.name === 'run_code') put(state.programs, id, { started: 0, settled: 0, failed: false, tools: {} });
  if (nested) {
    add(state.metrics, 'ptcCalls');
    const program = own(state.programs, d.rootCallId);
    if (program) program.started++;
  }
}

function finishCall(state, event, nested) {
  const d = event.data, id = nested ? d.subCallId : d.message.source.callId;
  const pending = own(state.pendingTools, id);
  if (!pending) return;
  delete state.pendingTools[id];
  const failed = nested ? d.isError : d.message.isError;
  const turn = state.turn?.id === pending.turn ? state.turn : null;
  if (pending.root) {
    const program = own(state.programs, pending.root);
    if (program) { program.settled++; program.failed ||= !!failed; if (!failed) add(program.tools, pending.name); }
  }
  const program = own(state.programs, id);
  if (program) {
    if (!failed && !program.failed && program.started > 0 && program.started === program.settled) {
      const breadth = featuresOf(program.tools).filter(name => name !== 'programming').length;
      add(state.metrics, 'ptcPrograms');
      if (breadth >= 3) add(state.metrics, 'ptcMultiPrograms');
      if (program.settled >= 10) add(state.metrics, 'ptcBatchPrograms');
      state.metrics.maxPtcFeatures = Math.max(state.metrics.maxPtcFeatures ?? 0, breadth);
      if (turn) turn.ptcAt ??= event.seq;
    }
    delete state.programs[id];
  }
  if (failed) { add(state.metrics, 'failedCalls'); if (turn) turn.errors++; return; }
  const name = pending.name;
  add(state.successfulTools, name);
  if (delegationNames.includes(name)) add(state.metrics, 'delegationCalls');
  if (pending.skill && !state.skills.includes(pending.skill)) state.skills.push(pending.skill);
  if (pending.terminal) {
    const previous = own(state.terminals, pending.terminal);
    const stage = previous?.stage ?? 0;
    if (name === 'terminal_send' && stage === 0) put(state.terminals, pending.terminal, { stage: 1, at: event.seq });
    if (name === 'terminal_read' && stage === 1 && pending.seq > previous.at) put(state.terminals, pending.terminal, { stage: 2, at: event.seq });
    if (name === 'terminal_close') {
      if (stage === 2 && pending.seq > previous.at) add(state.metrics, 'terminalCycles');
      delete state.terminals[pending.terminal];
    }
  }
  if (!turn) return;
  add(turn.tools, name);
  if (turn.planAt !== null && pending.seq > turn.planAt && name !== 'todo_write') turn.afterPlan++;
  if (pending.skill && !turn.skills.includes(pending.skill)) turn.skills.push(pending.skill);
  const modification = name === 'edit' || name === 'write';
  const shell = name === 'bash' || name === 'pwsh';
  // Starts must follow the preceding result; parallel calls do not fabricate a sequence.
  if (name === 'read' && turn.build === 0) { turn.build = 1; turn.buildAt = event.seq; }
  if (modification && turn.build === 1 && pending.seq > turn.buildAt) { turn.build = 2; turn.buildAt = event.seq; }
  if (shell && turn.build === 2 && pending.seq > turn.buildAt) turn.build = 3;
  if (name === 'web_search' && turn.research === 0) { turn.research = 1; turn.researchAt = event.seq; }
  if (name === 'web_fetch' && turn.research === 1 && pending.seq > turn.researchAt) { turn.research = 2; turn.researchAt = event.seq; }
  if (modification && turn.research === 2 && pending.seq > turn.researchAt) turn.research = 3;
  if (name === 'skill') turn.skillAt = event.seq;
  if ((modification || shell) && turn.skillAt !== null && pending.seq > turn.skillAt) {
    for (const skill of turn.skills) if (!turn.appliedSkills.includes(skill)) turn.appliedSkills.push(skill);
  }
  if (['session_search', 'session_event_search'].includes(name)) turn.historyAt ??= event.seq;
}

function finishTurn(state, event, timeZone) {
  const turn = state.turn;
  if (turn?.id === event.data.turn && event.data.reason.kind === 'completed') {
    const date = calendar(event.time, timeZone).date;
    const delivered = turn.deliveryAt !== null;
    const planned = turn.planAt !== null && turn.afterPlan >= 5;
    const breadth = featuresOf(turn.tools).length;
    const used = name => (own(turn.tools, name) ?? 0) > 0;
    const flags = {
      buildLoops: turn.build === 3, researchLoops: turn.research === 3,
      plannedTurns: planned, checklistTurns: turn.checklist, parallelChecklistTurns: turn.parallelChecklist,
      skillTurns: turn.appliedSkills.length > 0, skillComboTurns: turn.appliedSkills.length >= 2,
      broadTurns: breadth >= 6,
      archiveTurns: turn.historyAt !== null && delivered && turn.historyAt < turn.deliverySeq,
      visionDeliveryTurns: delivered && used('read_image'),
      semanticDeliveryTurns: delivered && used('lsp'),
      resourceDeliveryTurns: delivered && used('read_mcp_resource'),
      browserDeliveryTurns: delivered && featuresOf(turn.tools).includes('browser'),
      checklistBuildTurns: delivered && turn.checklist && turn.build === 3,
      methodTurns: delivered && planned && turn.build === 3 && used('grep'),
      mappedBuildTurns: delivered && turn.build === 3 && used('grep') && used('glob'),
      quietBuildTurns: delivered && turn.build === 3 && turn.errors === 0,
      skillResearchTurns: delivered && turn.skills.length > 0 && turn.research === 3,
      ptcDeliveryTurns: delivered && turn.ptcAt !== null && turn.ptcAt < turn.deliverySeq,
    };
    for (const [key, yes] of Object.entries(flags)) if (yes) add(state.metrics, key);
    state.metrics.maxTurnFeatures = Math.max(state.metrics.maxTurnFeatures ?? 0, breadth);
    state.metrics.maxSkillsPerTurn = Math.max(state.metrics.maxSkillsPerTurn ?? 0, turn.appliedSkills.length);
    state.completedTurns.push({ id: turn.id, start: turn.start, end: event.time, date,
      build: flags.buildLoops, research: flags.researchLoops, deliveryAt: turn.deliveryAt,
      skill: flags.skillTurns, workflow: turn.workflow });
  }
  state.turn = null;
  state.pendingTools = {};
  state.programs = {};
}

/** Fold an owned event. Source persistence validates event payloads; tool JSON is parsed separately.
 * @param state - Mutable state without inherited fork history.
 * @param event - Contiguous persisted event.
 * @param options - Activity timezone.
 * @returns The same updated state.
 */
export function reduceEvent(state, event, { timeZone }) {
  const d = event.data;
  switch (event.type) {
    case 'user/message':
      if (d.source.kind === 'user' && event.surfaceOp === 'append' && !state.subagent) {
        state.messages++;
        const { date, hour } = calendar(event.time, timeZone);
        const hours = own(state.activities, date) ?? Array(24).fill(0);
        hours[hour]++; put(state.activities, date, hours);
      }
      break;
    case 'turn/start':
      state.turn = { id: d.turn, start: event.time, tools: {}, skills: [], appliedSkills: [], errors: 0,
        build: 0, buildAt: null, research: 0, researchAt: null, planAt: null, afterPlan: 0,
        checklistId: null, checklist: false, parallelPlan: false, parallelChecklist: false, skillAt: null,
        deliveryAt: null, deliverySeq: null, historyAt: null, ptcAt: null, workflow: false };
      break;
    case 'turn/end': finishTurn(state, event, timeZone); break;
    case 'step/start': state.activeStep = { turn: d.turn, step: d.step }; break;
    case 'step/end':
      if (state.activeStep?.turn === d.turn && state.activeStep.step === d.step) state.steps++;
      state.activeStep = null;
      break;
    case 'assistant/message': {
      const output = d.usage?.outputTokens;
      if (Number.isFinite(output) && output >= 0) { state.tokens += output; state.knownUsage++; }
      else state.missingUsage++;
      break;
    }
    case 'tool/call': beginCall(state, event, false); break;
    case 'tool/ptc-dispatch-start': beginCall(state, event, true); break;
    case 'tool/result': finishCall(state, event, false); break;
    case 'tool/ptc-dispatch': finishCall(state, event, true); break;
    case 'todo/write': {
      const turn = state.turn;
      if (!turn) break;
      const unfinished = d.todos.some(item => item.status !== 'completed');
      if (unfinished && turn.planAt === null) turn.planAt = event.seq;
      const identity = digest(JSON.stringify(d.todos.map(item => item.content)));
      if (d.todos.length >= 3 && unfinished) {
        if (turn.checklistId !== identity) turn.parallelPlan = false;
        turn.checklistId = identity;
        turn.parallelPlan ||= d.todos.filter(item => item.status === 'in_progress').length >= 2;
      } else if (d.todos.length >= 3 && identity === turn.checklistId) {
        turn.checklist = true; turn.parallelChecklist ||= turn.parallelPlan;
      } else { turn.checklistId = null; turn.parallelPlan = false; }
      break;
    }
    case 'deliverables/presented':
      if (d.files.length > 0 && !own(state.deliveries, d.callId)) {
        const date = calendar(event.time, timeZone).date;
        put(state.deliveries, d.callId, { turn: d.turn, at: event.time, date, files: d.files.length });
        add(state.metrics, 'deliveries');
        if (state.turn?.id === d.turn) {
          state.turn.deliveryAt = event.time; state.turn.deliverySeq = event.seq;
          if (state.turn.research === 2 && event.seq > state.turn.researchAt) state.turn.research = 3;
        }
      }
      break;
    case 'subagent/catalog':
      if (!own(state.children, d.childId)) put(state.children, d.childId, { at: event.time });
      break;
    case 'tool-workflow/run-start':
      if (!own(state.workflowRuns, d.runId)) put(state.workflowRuns, d.runId, { name: d.name, start: event.time, startSeq: event.seq, end: null, endSeq: null, status: null, members: {} });
      break;
    case 'tool-workflow/agent-start': {
      const run = own(state.workflowRuns, d.runId);
      if (run && run.status === null && !own(run.members, d.seq)) put(run.members, d.seq, { childId: d.childId, phase: d.phase ?? null, outcome: null });
      break;
    }
    case 'tool-workflow/agent-end': {
      const member = own(own(state.workflowRuns, d.runId)?.members ?? {}, d.seq);
      if (member && member.outcome === null) member.outcome = d.outcome;
      break;
    }
    case 'tool-workflow/run-end': {
      const run = own(state.workflowRuns, d.runId);
      if (run && run.status === null) {
        run.status = d.stopReason; run.end = event.time; run.endSeq = event.seq;
        if (d.stopReason === 'completed' && state.turn) state.turn.workflow = true;
      }
      break;
    }
    case 'goal/change':
      if (d.operation !== 'clear') {
        if (d.goal.phase === 'blocked' && !state.blockedGoals.includes(d.goal.id)) state.blockedGoals.push(d.goal.id);
        if (d.goal.phase === 'complete' && !state.completedGoals.includes(d.goal.id)) {
          state.completedGoals.push(d.goal.id);
        }
      }
      break;
    default: break;
  }
  return state;
}
