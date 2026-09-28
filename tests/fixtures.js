/** Deterministic durable-event fixtures; no model, timer or external process is involved. */
export const at = Date.parse('2026-09-20T08:00:00Z');
export const options = { timeZone: 'Asia/Shanghai', busyTimeoutMs: 5000 };
export function recording(start = at) {
  const events = [];
  let turn = 1, clock = start;
  const emit = (type, data, time = clock++) => {
    const event = { type, data, seq: events.length, time, surfaceOp: 'append' };
    events.push(event); return event;
  };
  const begin = (id = 1) => { turn = id; emit('turn/start', { turn }); emit('step/start', { turn, step: 1 }); };
  const end = (reason = 'completed') => { emit('step/end', { turn, step: 1 }); emit('turn/end', { turn, reason: { kind: reason } }); };
  const startCall = (name, args = {}) => {
    const callId = 'c' + events.length;
    emit('tool/call', { turn, step: 1, callId, name, arguments: JSON.stringify(args) });
    return callId;
  };
  const finish = (callId, isError = false) => emit('tool/result', { turn, step: 1,
    message: { source: { kind: 'tool', callId }, content: [{ type: 'text', text: 'private result body' }], isError } });
  const call = (name, args = {}, isError = false) => { const id = startCall(name, args); finish(id, isError); return id; };
  const delivery = () => {
    const id = startCall('present');
    emit('deliverables/presented', { turn, callId: id, files: [{ path: 'private-file.txt' }] });
    finish(id); return id;
  };
  const ptc = (names, { failedAt = -1, rootError = false } = {}) => {
    const rootCallId = startCall('run_code');
    names.forEach((name, i) => {
      const data = { rootCallId, parentCallId: rootCallId, subCallId: rootCallId + ':ptc:' + i, name,
        arguments: name === 'skill' ? { name: 'ptc-skill' } : {} };
      emit('tool/ptc-dispatch-start', data);
      emit('tool/ptc-dispatch', { ...data, isError: i === failedAt, content: [] });
    });
    finish(rootCallId, rootError); return rootCallId;
  };
  const todo = (statuses = ['pending', 'pending', 'pending'], prefix = 'private todo') =>
    emit('todo/write', { todos: statuses.map((status, i) => ({ content: prefix + i, status })) });
  const user = (time) => emit('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: 'private prompt' }] }, time);
  return { events, emit, begin, end, startCall, finish, call, delivery, ptc, todo, user };
}
