// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyzeSamples} from '../src/browser/analyze';
import {planLyricFocus,evaluateLyricFocus} from '../src/engine/focus';
import {renderFrame} from '../src/engine/frame';
import {validateProject,type Project,type Analysis} from '../src/engine/model';
import {makeProject} from '../src/engine/storyboard';
import {cameraRecipes,typographyRecipes,catalogStats} from '../src/engine/catalog';
import {phraseProjection} from '../src/engine/focus';
import {directPerformance} from '../src/engine/director';
import {expressivePose} from '../src/engine/expression';
import {poseAt,solveRig} from '../src/engine/rig';
import {rasterize} from '../src/engine/raster';
import {vocalDelivery} from '../src/engine/voice';

const demo=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')) as Project;
function vocalFixture():Project {
 const p=structuredClone(demo);p.duration=8;p.lyrics='Eu não sei\nEu não sei\nEu não sei';
 p.words=[1,3,5].flatMap((start,line)=>['Eu','não','sei'].map((text,i)=>({id:`l${line}w${i}`,text,start:start+i*.3,end:start+(i+1)*.3,line,confidence:1,source:'manual' as const})));
 p.analysis={...p.analysis,duration:8,hopSeconds:.05,beats:[0,1,2,3,4,5,6,7],onsets:[1,3,5],impacts:[1,3,5],energy:Array(160).fill(.8),low:Array(160).fill(.9),high:Array(160).fill(.7),vocalRegions:[],silences:[],sections:[]};
 Object.assign(p.analysis,{voice:{source:'mix',method:'spectral',energy:Array.from({length:160},(_,i)=>i>=60&&i<78?.95:.22),presence:Array(160).fill(.85),pitch:Array(160).fill(220),confidence:Array(160).fill(.8)}});
 p.scenes=[{...p.scenes[0],id:'s0',start:0,end:8,kind:'choice',wordIds:p.words.map(w=>w.id),events:[],motions:[{action:'hesitate',start:0,end:8}],camera:{zoomFrom:1,zoomTo:1,panX:0,panY:0,roll:0,shake:0,lyricFocus:1}}];
 return p;
}

test('browser analysis retains a timed vocal-band contour rather than only full-mix beats',()=>{
 const sr=22050,samples=Float32Array.from({length:sr*7},(_,i)=>{const t=i/sr,gain=t>=3&&t<4?.8:.1;return gain*(Math.sin(2*Math.PI*220*t)+.25*Math.sin(2*Math.PI*440*t));});
 const analysis=analyzeSamples(samples,sr) as Analysis&{voice?:{energy:number[];pitch:number[]}};
 assert.ok(analysis.voice,'vocal-band data must survive analysis');
 const v=analysis.voice;assert.ok(v.energy[Math.round(3.4/analysis.hopSeconds)]>v.energy[Math.round(1.4/analysis.hopSeconds)]*3);
 assert.ok(v.pitch.some(hz=>hz>190&&hz<250),'retain a usable pitch estimate for the voiced fixture');
});

test('a loud repetition receives a full-phrase shout cue despite identical mix loudness and lowercase lyrics',()=>{
 const p=vocalFixture();
 p.scenes=(planLyricFocus as Function)(p.scenes,p.words,'pt',p.analysis);
 const event=p.scenes[0].events.find(e=>e.type==='focus'&&p.words.find(w=>w.id===e.wordId)?.line===1);
 assert.ok(event,'the loud middle phrase needs its own cue');assert.equal(event.focusMode,'phrase');
 const cue=evaluateLyricFocus(p,p.scenes[0],3.3) as ReturnType<typeof evaluateLyricFocus>&{delivery?:{kind:string}};
 assert.equal(cue?.delivery?.kind,'shout');assert.equal(cue?.words.map(w=>w.text).join(' '),'Eu não sei');
});

test('mixed-track bass impacts without vocal presence do not become shout cues',()=>{
 const p=vocalFixture();const voice=(p.analysis as any).voice;voice.presence.fill(.01);voice.confidence.fill(0);
 p.scenes=(planLyricFocus as Function)(p.scenes,p.words,'pt',p.analysis);
 const cue=evaluateLyricFocus(p,p.scenes[0],3.3) as any;
 assert.notEqual(cue?.delivery?.kind,'shout');
});

test('real spectral analysis does not call a train of pitched percussion hits a shout',()=>{
 const sr=22050,y=Float32Array.from({length:sr*8},(_,i)=>{const t=i/sr,hit=Math.floor(t*4)/4,age=t-hit,gain=hit>=3&&hit<4?.8:.05;return gain*Math.exp(-age*12)*Math.sin(2*Math.PI*(160*age+30*.03*(1-Math.exp(-age/.03))));});
 const a=analyzeSamples(y,sr),w={id:'v',text:'Qualquer frase',start:3,end:4,line:0,confidence:1,source:'manual' as const};assert.notEqual(vocalDelivery(a,[w]).kind,'shout');
});

test('manual phrase delivery controls the body and procedural selection as well as the camera',()=>{
 const p=vocalFixture(),s=p.scenes[0];s.performance={enabled:true,camera:'orbit-1',typography:'mono-0',gesture:'question-2',texture:'clean',rhythm:'accent',intensity:1,variation:0};
 const base=poseAt(s.motions,3.5),loud=expressivePose(base,p,s,3.5).pose;
 s.events=[{type:'focus',at:3,duration:1.6,wordId:'l1w0',focusMode:'phrase',strength:1,delivery:'whisper'}];
 const soft=expressivePose(base,p,s,3.5).pose;
 assert.ok(Math.hypot(soft.leftHand[0]-base.leftHand[0],soft.leftHand[1]-base.leftHand[1])<Math.hypot(loud.leftHand[0]-base.leftHand[0],loud.leftHand[1]-base.leftHand[1]));
 assert.equal(directPerformance(p,0,false).scenes[0].performance?.intensity,.45);
});

test('manual shouted phrase direction survives JSON and renders perspective rather than a flat scale',()=>{
 const p=vocalFixture(),s=p.scenes[0];
 Object.assign(s,{performance:{enabled:true,camera:'orbit-1',typography:'mono-0',gesture:'question-0',texture:'clean',rhythm:'accent',intensity:1,variation:0}});
 s.events=[{type:'focus',at:3,duration:1.6,wordId:'l1w0',focusMode:'phrase',strength:1,delivery:'shout'} as any];
 const json=JSON.parse(JSON.stringify(p));validateProject(json);
 const svg=renderFrame(json,3.5*p.fps);
 assert.ok(svg.includes('data-delivery="shout"'));assert.ok(svg.includes('data-phrase-3d='));
 assert.equal(svg,renderFrame(json,3.5*p.fps));
});

test('unknown procedural recipes and corrupt vocal envelopes are rejected on import',()=>{
 for(const mutate of [(p:Project)=>Object.assign(p.scenes[0],{performance:{enabled:true,camera:'missing',intensity:1}}),(p:Project)=>{(p.analysis as any).voice.energy[0]=NaN;}]){
  const p=vocalFixture();mutate(p);assert.throws(()=>validateProject(p));
 }
});

test('new storyboards receive reproducible performance recipes and vocal phrase cues automatically',()=>{
 const input=vocalFixture(),options={title:'Teste',audio:'media/test.wav',lyrics:input.lyrics,words:input.words,analysis:input.analysis,alignment:input.alignment};
 const a=makeProject(options),b=makeProject(options);validateProject(a);
 assert.ok(a.scenes.every(s=>s.performance?.enabled));assert.deepEqual(a.scenes.map(s=>s.performance),b.scenes.map(s=>s.performance));
 assert.ok(a.scenes.flatMap(s=>s.events).some(e=>e.type==='focus'&&e.wordId==='l1w0'));
 assert.ok(catalogStats.combinations>1_000_000);
});

test('every camera and font treatment keeps long projected phrases inside portrait and landscape title areas',()=>{
 const p=vocalFixture(),s=p.scenes[0];p.words[3].text='Extraordinariamente';p.words[4].text='incompreensível';p.words[5].text='星を見て、心は休む';
 s.events=[{type:'focus',at:3,duration:2,wordId:'l1w0',focusMode:'phrase',strength:1,delivery:'shout'}];
 for(const [w,h]of [[1080,1920],[1920,1080]])for(const camera of cameraRecipes)for(const type of typographyRecipes){
  s.performance={enabled:true,camera:camera.id,typography:type.id,gesture:'question-0',texture:'clean',rhythm:'accent',intensity:1,variation:0};
  for(const t of [3.22,3.55,3.82]){const cue=evaluateLyricFocus(p,s,t)!;for(const[x,y]of phraseProjection(p,s,t,w,h,cue).corners){assert.ok(x>=w*.069&&x<=w*.931,`${camera.id} ${type.id} x=${x}`);assert.ok(y>=h*.139&&y<=h*.861,`${camera.id} y=${y}`);}}
 }
});

test('performance adds expressive upper-body gestures while keeping the original stance and manual disable',()=>{
 const p=vocalFixture(),s=p.scenes[0];s.events=[];s.performance={enabled:true,camera:'orbit-1',typography:'mono-0',gesture:'question-2',texture:'clean',rhythm:'accent',intensity:1,variation:0};
 const a=renderFrame(p,1.55*p.fps);assert.ok(a.includes('data-gesture="question"'));
 s.performance.enabled=false;const b=renderFrame(p,1.55*p.fps);assert.ok(!b.includes('data-gesture='));assert.notEqual(a,b);
});

test('gestures preserve feet and blend across adjacent lyric meanings without joint pops',()=>{
 const p=vocalFixture(),s=p.scenes[0];s.performance={enabled:true,camera:'orbit-1',typography:'mono-0',gesture:'question-2',texture:'clean',rhythm:'accent',intensity:1,variation:0};
 p.words[3].text='Meu';p.words[4].text='coração';p.words[5].text='descansa';p.words[3].start=1.9;p.words[3].end=2.2;p.words[4].start=2.2;p.words[4].end=2.5;p.words[5].start=2.5;p.words[5].end=2.8;
 for(let t=1.8;t<2.4;t+=.005){
  const base=poseAt(s.motions,t),a=expressivePose(base,p,s,t).pose,b=expressivePose(poseAt(s.motions,t+.0001),p,s,t+.0001).pose;
  assert.deepEqual(a.leftFoot,base.leftFoot);assert.deepEqual(a.rightFoot,base.rightFoot);assert.deepEqual(a.hip,base.hip);
  const x=solveRig(a),y=solveRig(b);for(const limb of ['leftArm','rightArm'] as const)assert.ok(Math.hypot(x[limb][0][0]-y[limb][0][0],x[limb][0][1]-y[limb][0][1])<.15,`gesture pop at ${t}`);
 }
});

test('reroll changes actual rendered direction, preserves manual delivery and repeats exactly after serialization',async()=>{
 const p=vocalFixture();p.scenes[0].events=[{type:'focus',at:3,duration:1.6,wordId:'l1w0',focusMode:'phrase',strength:1,delivery:'shout'}];
 const a=directPerformance(p,0,false),b=directPerformance(p,1,false);validateProject(a);validateProject(b);
 assert.notDeepEqual(a.scenes[0].performance,b.scenes[0].performance);assert.equal(b.scenes[0].events[0].delivery,'shout');
 const frame=3.5*p.fps,svg=renderFrame(b,frame,{width:216,height:384});
 assert.notEqual(svg,renderFrame(a,frame,{width:216,height:384}));assert.equal(svg,renderFrame(JSON.parse(JSON.stringify(b)),frame,{width:216,height:384}));
 assert.ok((await rasterize(svg)).length>1000);
});

test('beat accents follow the audio clock and can be disabled independently of vocal expression',()=>{
 const p=directPerformance(vocalFixture(),0,false),s=p.scenes[0];s.events=[];
 const strong=renderFrame(p,2.01*p.fps),between=renderFrame(p,2.4*p.fps);
 const strength=(svg:string)=>Number(svg.match(/data-beat-strength="([\d.]+)"/)?.[1]??0);
 assert.ok(strength(strong)>strength(between)+.2);
 Object.assign(s.performance!,{beatSync:0});assert.equal(strength(renderFrame(p,2.01*p.fps)),0);
});
