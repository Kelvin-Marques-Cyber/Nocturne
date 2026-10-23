// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFrame} from '../src/engine/frame';
import type {Project} from '../src/engine/model';
import {planReelShots,reelCamera,projectReelPoint} from '../src/engine/reel-direction';

const demo=JSON.parse(readFileSync('projects/deus-nos-ve.json','utf8')) as Project;
function fixture(kind:Project['scenes'][number]['kind']='soul'){
 const p=structuredClone(demo);p.direction='reel';p.duration=12;p.analysis={...p.analysis,duration:12,voice:undefined,beats:[1,2,3,4,5,6,7,8,9,10,11]};
 p.words=['Primeira frase','Outra direção','Última palavra'].flatMap((line,i)=>line.split(' ').map((text,j)=>({id:`${i}-${j}`,text,start:1+i*3+j*.7,end:1.5+i*3+j*.7,line:i,confidence:1,source:'manual' as const})));
 p.scenes=[{...p.scenes[0],start:0,end:12,kind,wordIds:p.words.map(w=>w.id),events:[],camera:{zoomFrom:1,zoomTo:1,panX:0,panY:0,roll:0,shake:0},motions:[{action:'idle',start:0,end:12}]}];return p;
}
test('reel instrument scenes render their physical instrument instead of the generic code stage',()=>{
 for(const kind of ['guitar','piano','drums'] as const){
  const p=structuredClone(demo),s=p.scenes[0];p.direction='reel';s.kind=kind;s.events=[];s.camera.lyricFocus=0;
  const svg=renderFrame(p,2*p.fps);
  assert.ok(svg.includes(`data-instrument="${kind}"`),`${kind} must reach its authored renderer`);
  assert.doesNotMatch(svg,/data-code-theatre=/);
 }
});
test('a spatial sequence follows phrases, reveals their bounds and remains deterministic when seeking backwards',()=>{
 for(const format of ['vertical','horizontal'] as const){
  const p=fixture();p.format=format;const shot=planReelShots(p,p.scenes[0])[0],w=format==='vertical'?1080:1920,h=format==='vertical'?1920:1080;
  const first=reelCamera(shot,2.2,w,h),next=reelCamera(shot,5.2,w,h);
  assert.ok(Math.abs(first.y-next.y)>80,'the next phrase changes the camera target');
  const reveal=reelCamera(shot,11.99,w,h);
  for(const phrase of shot.phrases)for(const node of phrase.nodes)for(const [x,y] of [[node.x,node.y-node.size],[node.x+node.width,node.y+node.size*.25]]){
   const at=projectReelPoint(reveal,[x,y,node.z]);assert.ok(at[0]>=w*.05&&at[0]<=w*.95&&at[1]>=h*.05&&at[1]<=h*.95,`${format}: reveal clips ${node.word.text}`);
  }
  reelCamera(shot,10,w,h);assert.deepEqual(reelCamera(shot,2.2,w,h),first);
 }
});
test('rendered lyric planes retain onset gating and rendering never rewrites imported timings',()=>{
 for(const kind of ['soul','terminal','choice','cross'] as const){
  const p=fixture(kind),before=JSON.stringify(p.words);
  const early=renderFrame(p,1.2*p.fps),later=renderFrame(p,1.85*p.fps);
  assert.match(early,/>Primeira<\/text>/);assert.doesNotMatch(early,/>frase<\/text>/);assert.match(later,/>frase<\/text>/);
  assert.doesNotMatch(early,/>Última<\/text>/);assert.equal(JSON.stringify(p.words),before);
  assert.equal(early,renderFrame(structuredClone(p),1.2*p.fps));
 }
});
test('in-place timing edits update the camera plan and a long single word fits the final reveal',()=>{
 const p=fixture(),s=p.scenes[0],before=planReelShots(p,s)[0];
 p.words[2].start=5;p.words[2].end=5.3;
 assert.equal(planReelShots(p,s)[0].phrases[1].start,5);assert.equal(before.phrases[1].start,4);
 for(const format of ['vertical','horizontal'] as const){
  p.format=format;p.words[0].text='GOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO';
  const shot=planReelShots(p,s)[0],w=format==='vertical'?1080:1920,h=format==='vertical'?1920:1080,cam=reelCamera(shot,11.99,w,h),node=shot.phrases[0].nodes[0];
  for(const x of [node.x,node.x+node.width]){const at=projectReelPoint(cam,[x,node.y,node.z]);assert.ok(at[0]>w*.03&&at[0]<w*.97);}
 }
});
test('empty reel scenes still render their world and held typography ends with its word',()=>{
 const p=fixture('guitar');p.words=[];p.scenes[0].wordIds=[];
 assert.match(renderFrame(p,2*p.fps),/data-instrument="guitar"/);
 const held=fixture();held.words=[{id:'held',text:'GOOOOO',start:1,end:4,line:0,confidence:1,source:'manual'}];held.scenes[0].wordIds=['held'];
 assert.match(renderFrame(held,2*p.fps),/data-held-word="held"/);
 assert.doesNotMatch(renderFrame(held,4.2*p.fps),/data-held-word=/);
});
test('empty scenes from every composition family fall back to their authored world',()=>{
 for(const kind of ['soul','terminal','choice','guitar'] as const){const p=fixture(kind);p.words=[];p.scenes[0].wordIds=[];assert.equal(planReelShots(p,p.scenes[0])[0].layout,'world',kind);assert.match(renderFrame(p,2*p.fps),new RegExp(`data-reel-world="${kind}"`));}
});
test('disabled performance and zero intensity leave a held word unstretched',()=>{
 for(const enabled of [true,false]){const p=fixture();p.words=[{id:'held',text:'GOOOOO',start:1,end:4,line:0,confidence:1,source:'manual'}];p.scenes[0].wordIds=['held'];p.scenes[0].performance={...p.scenes[0].performance!,enabled,intensity:enabled?0:1};assert.doesNotMatch(renderFrame(p,2*p.fps),/data-held-word=/);}
});
test('selected camera recipes change the projected phrase turn and disabling performance removes that turn',()=>{
 const p=fixture(),s=p.scenes[0];s.performance={...s.performance!,enabled:true,intensity:1,camera:'orbit-1'};
 const orbit=reelCamera(planReelShots(p,s)[0],2.2,1080,1920);
 s.performance.camera='recoil-1';const recoil=reelCamera(planReelShots(p,s)[0],2.2,1080,1920);
 assert.notEqual(orbit.yaw,recoil.yaw);
 s.performance.enabled=false;const disabled=reelCamera(planReelShots(p,s)[0],2.2,1080,1920);assert.equal(disabled.yaw,0);assert.equal(disabled.pitch,0);assert.equal(disabled.roll,0);
});
