// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {beatResponse} from '../src/engine/beat';
import type {Project} from '../src/engine/model';

const demo=JSON.parse(await readFile('public/demo.json','utf8')) as Project;
test('beat accents distinguish strong and weak beats and stay still in an audio silence',()=>{
 const a={...demo.analysis,hopSeconds:.05,beats:[1,2,3],impacts:[],tempoConfidence:.8,energy:Array(100).fill(0),low:Array(100).fill(0),high:Array(100).fill(0)};
 for(const [at,level] of [[1,.95],[2,.2]])for(let i=Math.round((at-.05)/a.hopSeconds);i<=Math.round((at+.05)/a.hopSeconds);i++)a.energy[i]=a.low[i]=a.high[i]=level;
 assert.ok(beatResponse(a,1.04)>beatResponse(a,2.04)*2);
 assert.equal(beatResponse(a,3.04),0,'an estimated beat grid must not animate a silent section');
 const before=beatResponse(a,1-1e-6),after=beatResponse(a,1+1e-6);
 assert.ok(Math.abs(after-before)<.001,'camera beat attacks must begin continuously');
});

test('the service worker activates a waiting version only for the explicit update message',async()=>{
 const handlers=new Map<string,Function>();let activations=0;
 const self={addEventListener:(name:string,handler:Function)=>handlers.set(name,handler),skipWaiting:()=>{activations++;return Promise.resolve();}};
 const source=(await readFile('public/sw.js','utf8')).replace('__BUILD_VERSION__','test').replace('__PRECACHE__','[]');
 runInNewContext(source,{self,URL});
 assert.equal(activations,0);assert.ok(handlers.has('message'));
 let pending:Promise<unknown>|undefined;
 handlers.get('message')!({data:{type:'unrelated'},waitUntil:(p:Promise<unknown>)=>pending=p});assert.equal(activations,0);
 handlers.get('message')!({data:{type:'NOCTURNE_ACTIVATE_UPDATE'},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;assert.equal(activations,1);
});

test('activating a PWA update keeps the previous cache for other open tabs',async()=>{
 const handlers=new Map<string,Function>(),deleted:string[]=[];let pending:Promise<unknown>|undefined,claimed=false;
 const self={addEventListener:(name:string,handler:Function)=>handlers.set(name,handler),clients:{claim:async()=>{claimed=true;}}};
 const caches={keys:async()=>['other-app','nocturne-ancient','nocturne-previous','nocturne-test'],delete:async(key:string)=>{deleted.push(key);return true;}};
 const source=(await readFile('public/sw.js','utf8')).replace('__BUILD_VERSION__','test').replace('__PRECACHE__','[]');
 runInNewContext(source,{self,caches,URL});handlers.get('activate')!({waitUntil:(p:Promise<unknown>)=>pending=p});await pending;
 assert.deepEqual(deleted,['nocturne-ancient']);assert.equal(claimed,true);
});

test('the active worker prefers current assets while retaining old hashed chunks for open tabs',async()=>{
 const handlers=new Map<string,Function>(),scope='https://example.test/Nocturne/';
 const self={registration:{scope},addEventListener:(name:string,handler:Function)=>handlers.set(name,handler)};
 const caches={open:async()=>({match:async(request:any)=>String(request.url??request).endsWith('font.css')?'current-font':undefined}),match:async()=> 'previous-chunk'};
 const source=(await readFile('public/sw.js','utf8')).replace('__BUILD_VERSION__','test').replace('__PRECACHE__','[]');
 runInNewContext(source,{self,caches,URL,fetch:async()=>{throw Error('offline');}});
 async function get(path:string){let response:Promise<unknown>|undefined;handlers.get('fetch')!({request:{url:scope+path,method:'GET',mode:'cors'},respondWith:(p:Promise<unknown>)=>response=p});return response;}
 assert.equal(await get('font.css'),'current-font');assert.equal(await get('assets/old-build-12345678.js'),'previous-chunk');
});

test('offline navigation opens the current installed shell rather than the older cache',async()=>{
 const handlers=new Map<string,Function>(),scope='https://example.test/Nocturne/';let response:Promise<unknown>|undefined;
 const self={registration:{scope},addEventListener:(name:string,handler:Function)=>handlers.set(name,handler)};
 const caches={open:async()=>({match:async()=> 'current-index'}),match:async()=> 'previous-index'};
 const source=(await readFile('public/sw.js','utf8')).replace('__BUILD_VERSION__','test').replace('__PRECACHE__','[]');
 runInNewContext(source,{self,caches,URL,fetch:async()=>{throw Error('offline');}});
 handlers.get('fetch')!({request:{url:scope,method:'GET',mode:'navigate'},respondWith:(p:Promise<unknown>)=>response=p});assert.equal(await response,'current-index');
});
