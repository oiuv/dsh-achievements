/** Read-only history import and live catch-up, with one cancellable reader at a time.
 * @param ctx - DSH sessions, persistence and lifecycle services.
 * @param store - Statistics and checkpoint owner.
 * @param config - Poll interval and read page size.
 * @returns Snapshot, retry and awaited disposal operations.
 */
export function createCollector(ctx, store, config) {
  const lifetime = new AbortController();
  const pending = new Set();
  const failures = new Set();
  let timer, running, stopped = false, initialized = false, retryRequested = false, generation = 0;
  let latest = store.snapshot();
  let status = { phase: 'importing', imported: 0, pending: 0, failed: 0, error: false };
  const disposers = [
    ctx.on('session/created', session => pending.add(session.id)),
    ctx.on('session/event', session => pending.add(session.id)),
  ];

  async function readSession(id) {
    const handle = await ctx.sessionPersistence.open(id, 'read', { signal: lifetime.signal });
    try {
      let offset = store.cursor(id, handle.inheritedEventCount);
      while (!lifetime.signal.aborted) {
        const { events } = await handle.read(offset, config.pageSize, { signal: lifetime.signal });
        lifetime.signal.throwIfAborted();
        if (events.length === 0) break;
        store.ingest(handle.header, handle.inheritedEventCount, events);
        offset = events.at(-1).seq + 1;
        if (events.length < config.pageSize) break;
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally {
      await handle.close();
    }
  }

  async function run() {
    try {
      if (!initialized || retryRequested) {
        retryRequested = false;
        const rows = await ctx.sessionPersistence.list({ signal: lifetime.signal });
        lifetime.signal.throwIfAborted();
        for (const row of rows) pending.add(row.header.id);
        initialized = true;
      }
      // Active write buffers may not have reached storage at the previous read.
      for (const session of ctx.sessions.list()) pending.add(session.id);
      const batch = [...pending];
      status = { ...status, phase: 'importing', pending: batch.length, error: false };
      for (const id of batch) {
        lifetime.signal.throwIfAborted();
        pending.delete(id);
        try {
          await readSession(id);
          failures.delete(id);
          status.imported++;
        } catch (error) {
          if (lifetime.signal.aborted) throw error;
          failures.add(id);
          ctx.logger.warn('dsh-achievements: cannot read session', id, error);
        }
        status.pending--;
        status.failed = failures.size;
        // Give the Host a scheduling checkpoint between independent sessions.
        await new Promise(resolve => setImmediate(resolve));
      }
      latest = store.snapshot();
      status.phase = failures.size > 0 ? 'partial' : 'ready';
      generation++;
    } catch (error) {
      if (!lifetime.signal.aborted) {
        status = { ...status, phase: 'error', error: true };
        ctx.logger.warn('dsh-achievements: statistics refresh failed', error);
      }
    }
  }

  function start() {
    if (stopped || running) return;
    clearTimeout(timer);
    status = { ...status, phase: 'importing' };
    running = run().finally(() => {
      running = undefined;
      if (!stopped) timer = setTimeout(start, config.pollMs);
    });
  }
  start();
  return {
    snapshot: () => ({ ...latest, generation, status: { ...status }, pollMs: config.pollMs }),
    /** Retry historical reads as well as currently active sessions. */
    retry() { retryRequested = true; start(); },
    /** Detach observers, cancel reads and wait for handle closure before database disposal. */
    async dispose() {
      stopped = true;
      clearTimeout(timer);
      lifetime.abort();
      for (const dispose of disposers) dispose();
      await running;
    },
  };
}
