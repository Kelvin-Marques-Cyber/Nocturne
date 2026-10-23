// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Project,SceneEvent} from '../src/engine/model';
import {validateProject} from '../src/engine/model';
import {renderFrame} from '../src/engine/frame';
import {renderLyricFocus} from '../src/engine/focus';
import {vocalDelivery} from '../src/engine/voice';
const project=JSON.parse(readFileSync('projects/deus-nos-ve.json','utf8')) as Project;
test('the code theatre never displays lyrics before their word timestamps',()=>{
 const first=project.words[0],frame=(t:number)=>renderFrame(project,Math.round(t*project.fps));
 assert.doesNotMatch(frame(first.start-.2),/>Estrelas,<\/text>/);
 assert.match(frame(first.start+.15),/>Estrelas,<\/text>/);
 assert.doesNotMatch(frame(first.start+.15),/>constelações<\/text>/);
});
test('phrase focus hides future words rather than previewing them transparently',()=>{
 const first=project.words[0],second=project.words[1],scene=project.scenes[0],event:SceneEvent={at:first.start,duration:3,type:'focus',strength:1,wordId:first.id,focusMode:'phrase'};
 const focus={event,anchor:first,words:[first,second],start:first.start,end:second.end,amount:1,mode:'phrase' as const,delivery:vocalDelivery(project.analysis,[first,second])};
 const svg=renderLyricFocus(project,scene,first.start+.1,1080,1920,focus);
 assert.match(svg,/>Estrelas,<\/text>/);
 assert.doesNotMatch(svg,/>constelações<\/text>/);
});
test('positive video sync offset delays rendered lyrics without moving the audio',()=>{
 const first=project.words[0],shifted:Project={...project,visualSyncOffsetSeconds:1};
 validateProject(shifted);
 assert.doesNotMatch(renderFrame(shifted,Math.round((first.start+.2)*project.fps)),/>Estrelas,<\/text>/);
 assert.match(renderFrame(shifted,Math.round((first.start+1.2)*project.fps)),/>Estrelas,<\/text>/);
 assert.throws(()=>validateProject({...project,visualSyncOffsetSeconds:5.1}),/Deslocamento/);
});
test('scenic reel worlds display the sung lyric rather than only a thematic label',()=>{
 const p:Project=structuredClone(project),first=p.words[0];p.direction='reel';p.style.captions=true;
 for(const scene of p.scenes){scene.kind='cross';scene.accent='SÍMBOLO';scene.events=[];scene.camera.lyricFocus=0;}
 const svg=renderFrame(p,Math.round((first.start+.1)*p.fps));
 assert.match(svg,/data-sung-caption=/);assert.match(svg,/>Estrelas,<\/text>/);
 assert.doesNotMatch(svg,/>constelações<\/text>/);
 assert.doesNotMatch(renderFrame(p,Math.round((first.start-.2)*p.fps)),/data-sung-caption=/);
});
