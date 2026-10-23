// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseMetaphor} from '../src/engine/storyboard';
import {renderFrame} from '../src/engine/frame';
import {applyEffects} from '../src/engine/effects';
import {rasterize} from '../src/engine/raster';
import {typographyFor,typeWidth} from '../src/engine/typography';
import {planLyricFocus} from '../src/engine/focus';
import {fontFaces} from '../src/engine/catalog';
import {semanticGesture} from '../src/engine/director';
import {expressivePose} from '../src/engine/expression';
import {poseAt,solveRig} from '../src/engine/rig';
import {wordSustain} from '../src/engine/voice';
import {validateProject,type Project,type SceneKind,type FilterType} from '../src/engine/model';

const demo=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')) as Project;
const settings={enabled:true,camera:'dolly-0',typography:'mono-0',gesture:'explain-1',texture:'clean',rhythm:'accent',intensity:.8,variation:0};

test('instrument and landscape lyrics choose actual animated worlds in either output format',async()=>{
 const examples=[['Toco minha guitarra','guitar'],['I play the piano','piano'],['Rufam os tambores','drums'],['Atravesso a ponte','bridge'],['Me perdi na floresta','forest'],['Luzes da cidade','city'],['Caminho no deserto','desert'],['Subo a escadaria','staircase'],['Preso nesta gaiola','cage'],['Vejo um eclipse','eclipse'],['Luz no prisma','prism']] as const;
 for(const [lyric,kind] of examples){
  assert.equal(chooseMetaphor(lyric),kind,lyric);
  for(const format of ['vertical','horizontal'] as const){
   const p=structuredClone(demo),s=p.scenes[0];p.format=format;s.kind=kind as SceneKind;s.events=[];s.camera={zoomFrom:1,zoomTo:1,panX:0,panY:0,roll:0,shake:0,lyricFocus:0};s.performance={...settings};s.motions=[{action:'hold',start:s.start,end:s.end}];
   validateProject(p);const a=renderFrame(p,2*p.fps,{width:144,height:144});
   assert.equal(a,renderFrame(JSON.parse(JSON.stringify(p)),2*p.fps,{width:144,height:144}));
   assert.notEqual(a,renderFrame(p,2.17*p.fps,{width:144,height:144}));
   assert.ok((await rasterize(a)).length>300,kind);
  }
 }
});

test('new film treatments change pixels and obey disabled and zero-intensity controls',async()=>{
 const source='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#374e64"/><circle cx="40" cy="40" r="25" fill="#ed3e43"/><path d="M0 75L120 25" stroke="#efefef" stroke-width="8"/></svg>',clock={width:120,height:100,frame:60,seed:71,energy:.7,beat:.5,focus:0},plain=await rasterize(source);
 for(const type of ['sepia','cyanotype','thermal','solarize','ink','emboss','softfocus','filmgrain','dust','scratches','grid','lightleak']){
  const f={id:'test',type:type as FilterType,amount:.8,enabled:true},svg=applyEffects(source,[f],clock);
  assert.equal(svg,applyEffects(source,[f],clock));
  assert.notDeepEqual(await rasterize(svg),plain,type);
  assert.equal(applyEffects(source,[{...f,amount:0}],clock),source);
  assert.equal(applyEffects(source,[{...f,enabled:false}],clock),source);
 }
});

test('new expressive gestures keep planted feet and move reachable hands continuously',()=>{
 assert.equal(semanticGesture('Subo a escadaria'),'promise');
 const p=structuredClone(demo),s=p.scenes[0];s.events=[];s.motions=[{action:'idle',start:s.start,end:s.end}];
 for(const kind of ['offer','remember','shield','doubt','promise','reachout','carry','farewell']){
  s.performance={...settings,gesture:kind+'-2',followLyrics:false};
  const t=p.words.find(w=>s.wordIds.includes(w.id))!.start+.3,base=poseAt(s.motions,t),a=expressivePose(base,p,s,t).pose,b=expressivePose(poseAt(s.motions,t+.0001),p,s,t+.0001).pose;
  assert.deepEqual(a.leftFoot,base.leftFoot);assert.deepEqual(a.rightFoot,base.rightFoot);assert.notDeepEqual(a.leftHand,base.leftHand);
  const rig=solveRig(a),next=solveRig(b);
  for(const side of ['leftArm','rightArm'] as const)assert.ok(Math.hypot(rig[side][1][0]-next[side][1][0],rig[side][1][1]-next[side][1][1])<.1,kind);
 }
});

test('new offline proportional fonts measure accented text and ship identical browser/export assets',async()=>{
 const roman=typographyFor('lm-roman-0');
 assert.ok(typeWidth('WWWW',roman)>typeWidth('IIII',roman)*1.7,'proportional face must not silently fall back to mono');
 assert.ok(typeWidth('coração e emoção',roman)>0);
 for(const face of fontFaces){const a=await readFile('fonts/'+face.file),b=await readFile('public/'+face.file);assert.deepEqual(a,b,face.id);}
});

test('a held ordinary word or repeated vowel animates for its sung duration, while short words do not',()=>{
 for(const text of ['voltar','GOOOOOOOOO']){
  const p=structuredClone(demo);p.duration=8;p.words=[{id:'long',text,start:1,end:4,line:0,confidence:1,source:'manual'},{id:'short',text:'fim',start:5,end:5.3,line:1,confidence:1,source:'manual'}];
  p.analysis={...p.analysis,duration:8,hopSeconds:.05,voice:{source:'mix',method:'fixture',energy:Array(160).fill(.4),presence:Array(160).fill(.9),confidence:Array(160).fill(.9),pitch:Array(160).fill(220)}};
  p.scenes=[{...p.scenes[0],start:0,end:8,wordIds:['long','short'],events:[],performance:{...settings},motions:[{action:'idle',start:0,end:8}]}];p.scenes=planLyricFocus(p.scenes,p.words,'auto',p.analysis);
  assert.ok(renderFrame(p,2*p.fps).includes('data-held-word="long"'),text);
  assert.ok(renderFrame(p,3.6*p.fps).includes('data-held-word="long"'),'animation must last beyond the initial attack');
  assert.ok(!renderFrame(p,4.15*p.fps).includes('data-held-word='),'stop at the end of the actual word');
  assert.ok(!renderFrame(p,5.15*p.fps).includes('data-held-word='),'short notes keep ordinary typography');
 }
});

test('a brief voiced fragment followed by silence is not a sustained word',()=>{
 const a=structuredClone(demo.analysis);a.hopSeconds=.05;a.voice={source:'mix',method:'fixture',energy:Array(100).fill(0),presence:Array(100).fill(0),confidence:Array(100).fill(0),pitch:Array(100).fill(0)};
 for(let i=20;i<24;i++){a.voice.energy[i]=.4;a.voice.presence[i]=.9;a.voice.confidence[i]=.9;a.voice.pitch[i]=220;}
 const word={id:'word',text:'voltar',start:1,end:3,line:0,confidence:1,source:'manual' as const};
 assert.equal(wordSustain(a,word,2.5),0);
});
