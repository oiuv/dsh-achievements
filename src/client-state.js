/** Cancellable dashboard polling; one request at a time and no local statistics writes.
 * @param options - Snapshot fetcher, error reporter and optional timer operations.
 * @returns An observable dashboard state and awaited disposal operation.
 */
export function createDashboard({ fetchSnapshot, schedule = setTimeout, cancel = clearTimeout, onError }) {
  const lifetime = new AbortController();
  const subscribers = new Set();
  let state = { data: null, error: false, notice: 0, noticeId: 0, open: false };
  let timer, running, stopped = false, seen = new Set(), baselineReady = false;
  const notify = () => { for (const listener of subscribers) listener(); };
  const change = values => { state = { ...state, ...values }; notify(); };
  const request = async (retry = false) => {
    if (stopped || running) return;
    cancel(timer);
    running = Promise.resolve().then(async () => {
      try {
        const data = await fetchSnapshot(lifetime.signal, retry);
        if (stopped) return;
        if (data?.schemaVersion !== 2 || !data.stats || !data.unlocked || !data.status
          || !Array.isArray(data.stats.hours) || data.stats.hours.length !== 24
          || !Number.isFinite(data.pollMs) || data.pollMs < 1000) throw new Error('Invalid achievements response');
        const ids = Object.keys(data.unlocked);
        const fresh = baselineReady ? ids.filter(id => !seen.has(id)).length : 0;
        baselineReady ||= ['ready', 'partial'].includes(data.status.phase);
        seen = new Set(ids);
        change({ data, error: false, notice: fresh || state.notice,
          noticeId: fresh ? state.noticeId + 1 : state.noticeId });
      } catch (error) {
        if (!stopped) { onError(error); change({ error: true }); }
      } finally {
        running = undefined;
        if (!stopped) timer = schedule(() => { void request(); }, state.data?.pollMs ?? 3000);
      }
    });
    await running;
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
    setOpen: open => change({ open }),
    dismissNotice: () => change({ notice: 0 }),
    refresh: request,
    async dispose() {
      stopped = true; cancel(timer); lifetime.abort();
      await running; subscribers.clear();
    },
  };
}
