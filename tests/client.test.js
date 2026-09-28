import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { aggregate } from '../src/engine.js';
import { achievements } from '../src/catalog.js';

for(const scenario of ['empty','populated','near-complete','leveled']) for(const language of ['en','zh']) test('built client renders localized Hall and disposes effects: '+scenario+' '+language,async t=>{
  let registration,table,launcherButton;
  const components=new Map(),styles=new Set(),removed=[],disposers=[];
  const localeSnapshot={active:language,locales:['en','zh'],revision:0};
  const locale={
    register(ns,dictionaries){table=dictionaries;return()=>{table=null;};},
    bind(){return(key,args={})=>{assert.ok(table[language][key],'Missing locale key '+key);return table[language][key].replace(/\{(\w+)\}/g,(_,name)=>String(args[name]));};},
    getLocale:()=>localeSnapshot,subscribe:()=>()=>{},
  };
  const data={schemaVersion:2,stats:aggregate([],{timeZone:'UTC',now:0}),unlocked:{},timeZone:'UTC',updatedAt:0,status:{phase:'ready',failed:0},pollMs:60000};
  if (scenario === 'populated') {
    Object.assign(data.stats, {
      sessions: 42, messages: 186, successfulCalls: 732, tokens: 128400, steps: 280, activeDays: 12,
      goals: 3, workflows: 2, buildLoops: 3, researchLoops: 2, plannedTurns: 4,
      deliveries: 8, subagent: 12, completedTurns: 72, ptcPrograms: 5, collaborationTurns: 2,
      successfulTools: { read: 284, edit: 192, pwsh: 126, grep: 86, web_search: 44 },
      hours: [0,0,0,0,0,0,1,3,8,18,24,16,7,10,22,28,16,9,6,4,3,1,0,0],
    });
    for (const item of achievements.slice(0, 4)) data.unlocked[item.id] = { at: Date.parse('2026-09-20T12:00:00Z') };
  }
  if (scenario === 'near-complete') {
    for (const item of achievements) for (const [metric, target] of item.requirements) {
      if (!metric.startsWith('tool.')) data.stats[metric] = Math.max(data.stats[metric], target);
    }
    data.stats.successfulCalls = 2999;
    for (const item of achievements.filter(item => item.id !== 'reliable')) {
      data.unlocked[item.id] = { at: Date.parse('2026-09-20T12:00:00Z') };
    }
  }
  if (scenario === 'leveled') {
    data.stats.tokens = 4000000;
    data.unlocked['token-scribe'] = { at: Date.parse('2026-09-20T12:00:00Z') };
  }
  const primitives={
    Modal:({open,title,children})=>open?React.createElement('section',{'aria-label':title},children):null,
    Toast:({text})=>React.createElement('div',null,text),
    Tooltip:({children})=>{if(children.props.className === 'dsha-launcher')launcherButton=children;return children;},
    Button:({children,size,variant,...props})=>React.createElement('button',props,children),
    SegmentedControl:({id,value,options,label})=>React.createElement('div',{role:'tablist','aria-label':label},
      options.map(option=>React.createElement('button',{key:option.value,id:id+'-'+option.value,role:'tab',
        'aria-selected':option.value===value,'aria-controls':id+'-'+option.value+'-panel'},option.label))),

  };
  for (const icon of [
    'IconCheckCircleOutlineRegular','IconCheckCircleFillRegular','IconCheckOutlineRegular',
    'IconBrowseOutlineRegular','IconCodeOutlineRegular','IconSearchOutlineRegular','IconBranchOutlineRegular',
    'IconSkillOutlineRegular','IconSparkleRegular','IconNewChatOutlineRegular','IconSendOutlineRegular',
    'IconDataOutlineRegular','IconChecklistOutlineRegular','IconClockOutlineRegular',
    'IconGoalOutlineRegular','IconQuestionOutlineRegular','IconChevronRightOutlineRegular',
  ]) primitives[icon] = ({size}) => React.createElement('i', {'data-icon':icon,'data-size':size,'aria-hidden':true});
  runInNewContext(readFileSync(new URL('../client.js',import.meta.url),'utf8'),{
    window:{__ModuleLoader__:{load:r=>registration=r}},
    document:{baseURI:'http://localhost/',head:{appendChild:style=>styles.add(style)},createElement:()=>{const style={remove:()=>styles.delete(style)};return style;}},
    localStorage:{removeItem:key=>removed.push(key)},fetch:async()=>({ok:true,json:async()=>data}),
    AbortController,URL,setTimeout,clearTimeout,
  });
  assert.equal(registration.id,'@local/dsh-achievements');
  const plugin=registration.factory(name=>{if(name==='react')return React;if(name==='@deepseek-ai/dsh-client-ui-primitives')return primitives;throw Error(name);});
  const ctx={locale,logger:{warn:()=>{}},
    effect(callback){const dispose=callback();disposers.push(dispose);return dispose;},
    on(){const dispose=()=>{};disposers.push(dispose);return dispose;},
    slots:{inject(name,callback){disposers.push(callback());},register({id},component){components.set(id,component);return()=>components.delete(id);}},
  };
  t.after(async()=>{for(const dispose of disposers.reverse())await dispose();});
  plugin.apply(ctx);await new Promise(resolve=>setImmediate(resolve));
  const launcher=components.get('dsh-achievements:launcher'),overlay=components.get('dsh-achievements:overlay');
  const label=language==='zh'?'成就':'Achievements';
  assert.ok(renderToStaticMarkup(React.createElement(launcher)).includes(label));
  assert.equal(renderToStaticMarkup(React.createElement(overlay)),'');
  launcherButton.props.onClick();
  const html=renderToStaticMarkup(React.createElement(overlay));
  assert.ok(html.includes(language==='zh'?'DSH 成就殿堂':'DSH Achievement Hall'));
  assert.ok(html.includes(Object.keys(data.unlocked).length + ' / 81'));
  if (scenario === 'empty') assert.ok(html.includes(language === 'zh' ? '工具返回后' : 'Your non-error tool returns'));
  else if (scenario === 'populated') {
    assert.equal((html.match(/class="dsha-hour-slot"/g)||[]).length,24);
    assert.ok(html.includes('128,400'));
    assert.ok(html.includes('284'));
  }
  if (scenario === 'near-complete') {
    const card = html.match(/<article[^>]*data-achievement-id="reliable"[\s\S]*?<\/article>/)?.[0];
    assert.ok(card, 'The remaining challenge is shown');
    assert.ok(card.includes('<span>99%</span>'), 'Incomplete requirements must not display 100%');
    assert.ok(card.includes('2,999 / 3,000'));
  }
  if (scenario === 'leveled') {
    const card = html.match(/<article[^>]*data-achievement-id="token-scribe"[\s\S]*?<\/article>/)?.[0];
    assert.ok(card.includes('data-achievement-level="3"'));
    assert.ok(card.includes('Lv. 3')); assert.ok(card.includes('Lv. 4'));
    assert.ok(card.includes('4,000,000 / 8,000,000'));
  }
  assert.equal(html.includes('{count}'),false);assert.equal(html.includes('NaN'),false);
  const expected = new URL('./expected/hall.'+(scenario === 'empty' ? '' : scenario+'.')+language+'.html', import.meta.url);
  if (process.env.DSH_ACHIEVEMENTS_UPDATE_EXPECTED === '1') writeFileSync(expected, html+'\n');
  assert.equal(html+'\n', readFileSync(expected,'utf8'));
  assert.equal((html.match(/data-achievement-id=/g)||[]).length,4);
  assert.deepEqual(removed,['dsh-ach-s-v4','dsh-ach-u-v2']);
  for(const dispose of disposers.splice(0).reverse())await dispose();
  assert.equal(styles.size,0);assert.equal(components.size,0);assert.equal(table,null);
});
