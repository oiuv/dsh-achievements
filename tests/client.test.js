import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { aggregate } from '../src/engine.js';

for(const language of ['en','zh']) test('built client renders localized Hall and disposes effects: '+language,async t=>{
  let registration,table,launcherButton;
  const components=new Map(),styles=new Set(),removed=[],disposers=[];
  const localeSnapshot={active:language,locales:['en','zh'],revision:0};
  const locale={
    register(ns,dictionaries){table=dictionaries;return()=>{table=null;};},
    bind(){return(key,args={})=>{assert.ok(table[language][key],'Missing locale key '+key);return table[language][key].replace(/\{(\w+)\}/g,(_,name)=>String(args[name]));};},
    getLocale:()=>localeSnapshot,subscribe:()=>()=>{},
  };
  const data={schemaVersion:1,stats:aggregate([],{timeZone:'UTC',now:0}),unlocked:{},timeZone:'UTC',updatedAt:0,status:{phase:'ready',failed:0},pollMs:60000};
  const primitives={
    Modal:({open,title,children})=>open?React.createElement('section',{'aria-label':title},children):null,
    Toast:({text})=>React.createElement('div',null,text),
    Tooltip:({children})=>{launcherButton=children;return children;},
    IconCheckCircleOutlineRegular:()=>React.createElement('i'),
  };
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
  assert.ok(html.includes('0 / 36'));
  assert.equal(html.includes('{count}'),false);assert.equal(html.includes('NaN'),false);
  const expected = new URL('./expected/hall.'+language+'.html', import.meta.url);
  if (process.env.DSH_ACHIEVEMENTS_UPDATE_EXPECTED === '1') writeFileSync(expected, html+'\n');
  assert.equal(html+'\n', readFileSync(expected,'utf8'));
  assert.equal((html.match(/data-achievement-id=/g)||[]).length,4);
  assert.deepEqual(removed,['dsh-ach-s-v4','dsh-ach-u-v2']);
  for(const dispose of disposers.splice(0).reverse())await dispose();
  assert.equal(styles.size,0);assert.equal(components.size,0);assert.equal(table,null);
});
