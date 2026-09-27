import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollector } from '../src/collector.js';

const config={pollMs:60000,pageSize:2};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function ready(collector) {
  for(let i=0;i<500;i++){if(collector.snapshot().status.phase!=='importing')return;await tick();}
  throw Error('Collector did not settle');
}
function context(persistence) {
  const callbacks=new Map();
  return {callbacks,logger:{warn(){}},sessions:{list:()=>[]},sessionPersistence:persistence,
    on(name,callback){callbacks.set(name,callback);return()=>callbacks.delete(name);}};
}
test('collector paginates from the stored checkpoint, closes reads and exposes failures for retry',async t=>{
  let fail=true,closed=0,checkpoint=2,ingested=0,listed=0;
  const ctx=context({
    async list(){listed++;return [{header:{id:'a'}},{header:{id:'b'}}];},
    async open(id,mode){assert.equal(mode,'read');if(id==='b'&&fail)throw Error('unavailable');
      return {header:{id},inheritedEventCount:2,
        async read(offset,length){assert.equal(length,2);return {events:offset<5?[{seq:offset},{seq:offset+1}].filter(e=>e.seq<5):[]};},
        async close(){closed++;}};},
  });
  const checkpoints=new Map();
  const store={cursor:id=>checkpoints.get(id)??checkpoint,ingest:(header,inherited,events)=>{assert.equal(inherited,2);checkpoints.set(header.id,events.at(-1).seq+1);ingested+=events.length;},snapshot:()=>({stats:{ingested}})};
  const collector=createCollector(ctx,store,config);t.after(()=>collector.dispose());await ready(collector);
  assert.equal(collector.snapshot().status.phase,'partial');assert.equal(ingested,3);assert.equal(closed,1);
  fail=false;collector.retry();await ready(collector);
  assert.equal(collector.snapshot().status.phase,'ready');assert.equal(ingested,6);assert.equal(closed,3);assert.equal(listed,2);
  await collector.dispose();assert.equal(ctx.callbacks.size,0);
});
test('dispose aborts a blocked read and waits for its handle to close',async()=>{
  let entered,releaseClose,closed=false,ingested=false;
  const started=new Promise(resolve=>entered=resolve),closeGate=new Promise(resolve=>releaseClose=resolve);
  const ctx=context({async list(){return [{header:{id:'a'}}];},async open(){return {header:{id:'a'},inheritedEventCount:0,
    read(offset,length,{signal}){return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});entered();});},
    async close(){await closeGate;closed=true;}};}});
  const collector=createCollector(ctx,{snapshot:()=>({}),cursor:()=>0,ingest:()=>{ingested=true;}},config);
  await started;let disposed=false;const disposal=collector.dispose().then(()=>disposed=true);await tick();
  assert.equal(disposed,false);releaseClose();await disposal;
  assert.equal(closed,true);assert.equal(ingested,false);assert.equal(ctx.callbacks.size,0);
});
