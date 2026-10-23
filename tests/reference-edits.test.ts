// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Project} from '../src/engine/model';
import {validateProject} from '../src/engine/model';
import {adoptReferenceEdits} from '../src/engine/reference-edits';
import {renderFrame} from '../src/engine/frame';
const original=JSON.parse(readFileSync('public/demo.json','utf8')) as Project;
test('reference direction preserves audio, scene intervals and every word timestamp',()=>{
 const next=adoptReferenceEdits(original);validateProject(next);
 assert.equal(next.words,original.words);assert.equal(next.analysis,original.analysis);assert.equal(next.audio,original.audio);assert.equal(next.visualSyncOffsetSeconds,original.visualSyncOffsetSeconds);
 assert.deepEqual(next.scenes.map(s=>[s.start,s.end,s.wordIds,s.events]),original.scenes.map(s=>[s.start,s.end,s.wordIds,s.events]));
 assert.ok(next.scenes.some((s,i)=>s.transition!==original.scenes[i].transition));
});
test('each reference composition is deterministic and hides future lyric words',()=>{
 for(const profile of ['sketch-room','wireframe-lab','solar-drift','type-archive','gallery-flight'] as const){
  const p=adoptReferenceEdits(original,profile),scene=p.scenes[0];p.style.filters=[];
  const word=p.words.find(w=>scene.wordIds.includes(w.id))!,t=word.start+(word.end-word.start)*.4;
  const a=renderFrame(p,t*p.fps);assert.equal(a,renderFrame(p,t*p.fps));assert.ok(a.includes(`data-reference-edit="${profile}"`));assert.ok(!/NaN|Infinity/.test(a));
  const ids=[...a.matchAll(/data-lyric-word="([^"]+)"/g)].map(m=>m[1]);
  for(const id of ids)assert.ok(p.words.find(w=>w.id===id)!.start<=t+.0001);
 }
});
