import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboard } from '../src/client-state.js';
const snapshot=(unlocked={},phase='ready')=>({schemaVersion:2,stats:{hours:Array(24).fill(0)},unlocked,status:{phase},pollMs:3000});
test('history import is silent, new unlocks notify once and polling preserves toast identity',async t=>{
  let response=snapshot({},'importing'),scheduled=0,errors=0;
  const dashboard=createDashboard({fetchSnapshot:async()=>response,schedule:()=>++scheduled,cancel:()=>{},onError:()=>errors++});
  t.after(()=>dashboard.dispose());
  await dashboard.refresh();response=snapshot({old:{at:1}});await dashboard.refresh();
  assert.equal(dashboard.getSnapshot().notice,0);
  response=snapshot({old:{at:1},fresh:{at:2}});await dashboard.refresh();
  assert.equal(dashboard.getSnapshot().notice,1);
  const id=dashboard.getSnapshot().noticeId;await dashboard.refresh();
  assert.equal(dashboard.getSnapshot().noticeId,id);
  dashboard.dismissNotice();await dashboard.refresh();assert.equal(dashboard.getSnapshot().notice,0);
  assert.equal(errors,0);assert.equal(scheduled,5);
});
test('synchronous request errors can recover and malformed responses retain last good data',async t=>{
  let response=snapshot(),fail=true;
  const dashboard=createDashboard({fetchSnapshot:()=>{if(fail)throw Error('offline');return Promise.resolve(response);},schedule:()=>0,cancel:()=>{},onError:()=>{}});
  t.after(()=>dashboard.dispose());
  await dashboard.refresh();assert.equal(dashboard.getSnapshot().error,true);
  fail=false;await dashboard.refresh();assert.equal(dashboard.getSnapshot().error,false);
  response={};await dashboard.refresh();assert.equal(dashboard.getSnapshot().error,true);
  assert.equal(dashboard.getSnapshot().data.schemaVersion,2);
});
test('dispose cancels the active request and awaits it without notifying or rescheduling',async()=>{
  let ready,notify=0,schedules=0;
  const started=new Promise(resolve=>ready=resolve);
  const dashboard=createDashboard({fetchSnapshot:signal=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});ready();}),schedule:()=>schedules++,cancel:()=>{},onError:()=>{throw Error('unexpected');}});
  dashboard.subscribe(()=>notify++);const request=dashboard.refresh();await started;
  await dashboard.refresh();await dashboard.dispose();await request;
  assert.equal(notify,0);assert.equal(schedules,0);
});
