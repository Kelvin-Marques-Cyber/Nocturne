// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Project} from '../src/engine/model';
import {alignLyrics} from '../src/engine/alignment';
import {audioFrame,frameMatchesAudio,markWordAtAudio} from '../src/engine/sync';
import {validateProject} from '../src/engine/model';
const project=JSON.parse(readFileSync('projects/deus-nos-ve.json','utf8')) as Project;
test('storyboard regeneration preserves prior word timestamps',()=>{
 const result=alignLyrics(project.lyrics,project.analysis,undefined,'pt',project.words);
 for(const index of [0,1,8,75,200,247]){
  assert.equal(result.words[index].start,project.words[index].start);
  assert.equal(result.words[index].end,project.words[index].end);
  assert.equal(result.words[index].source,project.words[index].source);
 }
});
test('minor lyric edits interpolate only inserted words',()=>{
 const revised=project.lyrics.replace('Estrelas, constelações','Estrelas, grandes constelações');
 const result=alignLyrics(revised,project.analysis,undefined,'pt',project.words);
 assert.equal(result.words.length,project.words.length+1);
 assert.equal(result.words[0].start,project.words[0].start);
 assert.ok(Math.abs(result.words[2].start-project.words[1].start)<=.03);
 assert.equal(result.words[1].source,'interpolated');
});
test('different song cannot inherit the prior song timestamps',()=>{
 const result=alignLyrics('Palavras sem relação com a música que está aberta',project.analysis,undefined,'pt',project.words);
 assert.match(result.method,/estimate/);
});
test('late worker frames are not displayed after audio moves on',()=>{
 assert.equal(audioFrame(3.2,30),96);
 assert.equal(frameMatchesAudio(96,3.24,30),true);
 assert.equal(frameMatchesAudio(96,3.4,30),false);
 assert.equal(frameMatchesAudio(96,1.2,30),false);
});
test('tap sync moves just the selected word, respecting visual delay',()=>{
 const word=project.words[0],updated=markWordAtAudio({...project,visualSyncOffsetSeconds:.2},word.id,word.start+.3);
 assert.ok(Math.abs(updated.words[0].start-(word.start+.1))<.001);
 assert.equal(updated.words[0].source,'manual');
 assert.equal(updated.words[1].start,project.words[1].start);
 validateProject(updated);
});
