// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planLyricFocus,evaluateLyricFocus} from '../src/engine/focus';
import {renderFrame,sceneAt} from '../src/engine/frame';
import type {Project} from '../src/engine/model';

const demo=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')) as Project;
function ordinaryVerses(){
 const p=structuredClone(demo);p.duration=40;
 p.words=Array.from({length:10},(_,line)=>['Meu','coração','recorda','caminhos'].map((text,i)=>({id:`v${line}-${i}`,text,line,start:line*4+1+i*.45,end:line*4+1+(i+1)*.45,confidence:1,source:'manual' as const}))).flat();
 p.analysis={...p.analysis,duration:40,hopSeconds:.05,voice:{source:'mix',method:'fixture',energy:Array(800).fill(.4),presence:Array(800).fill(.9),confidence:Array(800).fill(.9),pitch:Array(800).fill(220)}};
 p.scenes=Array.from({length:10},(_,i)=>({...p.scenes[0],id:`s${i}`,start:i*4,end:(i+1)*4,wordIds:p.words.filter(w=>w.line===i).map(w=>w.id),events:[],motions:[{action:'idle' as const,start:i*4,end:(i+1)*4}],camera:{zoomFrom:1,zoomTo:1,panX:0,panY:0,roll:0,shake:0,lyricFocus:1}}));
 return p;
}

test('ordinary singing keeps the character on stage instead of zooming every verse',()=>{
 const p=ordinaryVerses();p.scenes=planLyricFocus(p.scenes,p.words,'pt',p.analysis);
 let closeups=0,samples=0;
 for(let t=.5;t<p.duration;t+=.1){samples++;if((evaluateLyricFocus(p,sceneAt(p,t),t)?.amount??0)>.85)closeups++;}
 assert.ok(closeups/samples<.2,`full-screen lyric occupancy ${Math.round(closeups/samples*100)}%`);
 assert.ok(renderFrame(p,2*p.fps).includes('data-character='),'the verse should show its actor');
});

test('an estimated long word cannot hold an automatic close-up for its entire interval',()=>{
 const p=ordinaryVerses();delete p.analysis.voice;
 p.words=[{id:'held-estimate',text:'NÃO',line:0,start:1,end:14,confidence:.12,source:'estimated'}];
 p.scenes=[{...p.scenes[0],end:40,wordIds:['held-estimate'],motions:[{action:'idle',start:0,end:40}]}];
 p.scenes=planLyricFocus(p.scenes,p.words,'pt',p.analysis);
 assert.ok(evaluateLyricFocus(p,p.scenes[0],1.4));
 assert.equal(evaluateLyricFocus(p,p.scenes[0],5),undefined,'return to the stage even when alignment stretches a word');
});

test('automatic replanning preserves an explicitly chosen phrase performance',()=>{
 const p=ordinaryVerses(),s=p.scenes[0],manual={type:'focus' as const,wordId:'v0-0',at:1,duration:2.3,strength:.9,focusMode:'phrase' as const,delivery:'shout' as const};
 s.events=[manual];p.scenes=planLyricFocus(p.scenes,p.words,'pt',p.analysis);
 assert.ok(p.scenes[0].events.some(e=>JSON.stringify(e)===JSON.stringify(manual)));
});

test('a shouted opening phrase can receive its accent without a quiet-stage introduction',()=>{
 const p=ordinaryVerses();for(const w of p.words.filter(w=>w.line===0)){w.start-=.8;w.end-=.8;}
 for(let i=4;i<40;i++)p.analysis.voice!.energy[i]=.95;
 p.scenes=planLyricFocus(p.scenes,p.words,'pt',p.analysis);
 assert.equal(evaluateLyricFocus(p,p.scenes[0],.6)?.delivery.kind,'shout');
});
