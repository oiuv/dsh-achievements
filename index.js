/** DSH Achievement Hall Host: read-only session accounting and authenticated dashboard API. */
import z from '@deepseek-ai/schemastery';
import { assistantStreamFirstTokenTime } from '@deepseek-ai/dsh-llm';
import { isAbsolute } from 'node:path';
import { AchievementStore, calendar } from './src/engine.js';
import { createCollector } from './src/collector.js';

export const name = 'dsh-achievements';
export const inject = ['sessions', 'sessionPersistence', 'connection'];
export const Config = z.object({
  database: z.string().required(),
  timeZone: z.string().required(),
  pollMs: z.natural().min(1000).default(3000),
  pageSize: z.natural().min(1).max(4096).default(512),
  busyTimeoutMs: z.natural().min(1).max(30000).default(5000),
});

/** Mount a statistics database and dispose its readers before closing it.
 * @param ctx - DSH Host plugin context.
 * @param config - Validated database, timezone and collector settings.
 */
export async function apply(ctx, config) {
  if (!isAbsolute(config.database)) throw new Error('dsh-achievements: database must be an absolute path');
  calendar(Date.now(), config.timeZone);
  await ctx.effect(async () => {
    const store = new AchievementStore(config.database, {
      timeZone: config.timeZone, busyTimeoutMs: config.busyTimeoutMs,
      firstTokenTime: assistantStreamFirstTokenTime,
    });
    let collector, unregister;
    try {
      collector = createCollector(ctx, store, config);
      unregister = ctx.connection.fetch.register({
        path: '/api/dsh-achievements',
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        async fetch(request) {
          if (request.method === 'POST') collector.retry();
          return Response.json(collector.snapshot(), {
            headers: { 'Cache-Control': 'no-store' },
          });
        },
      });
    } catch (error) {
      if (collector) {
        // Setup failed after a read began: keep the database until that reader settles.
        await collector.dispose();
        store.close();
      } else store.close();
      throw error;
    }
    return async () => {
      try { await unregister(); }
      finally {
        try { await collector.dispose(); }
        finally { store.close(); }
      }
    };
  }, 'dsh-achievements: database, history reader and API');
}
