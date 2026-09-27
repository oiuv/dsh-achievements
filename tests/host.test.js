import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';

test('real Loader activates the configured Host and unloads its route and database',async t=>{
  const root=mkdtempSync(join(tmpdir(),'dsha-loader-')),ctx=new Context(),routes=new Map();
  t.after(async()=>{await ctx.fiber.dispose();rmSync(root,{recursive:true,force:true});});
  ctx.provide('sessions',{list:()=>[]});
  ctx.provide('sessionPersistence',{list:async()=>[]});
  ctx.provide('connection',{fetch:{register(route){routes.set(route.path,route);return async()=>{routes.delete(route.path);};}}});
  await ctx.plugin(Loader);
  const entry=await ctx.loader.create({name:new URL('../index.js',import.meta.url).href,config:{database:join(root,'stats.sqlite'),timeZone:'UTC',pollMs:1000}});
  await ctx.loader.await();
  assert.ok(ctx.loader.resolve(entry).fiber);
  assert.equal(routes.size,1);
  const route=routes.get('/api/dsh-achievements');
  assert.deepEqual(route.methods,['GET','POST']);
  const response=await route.fetch(new Request('http://localhost/api/dsh-achievements'));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.stats.messages,0);
  await ctx.fiber.dispose();assert.equal(routes.size,0);
});
