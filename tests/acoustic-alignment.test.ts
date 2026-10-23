// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {alignCTC,acousticLyricTokens} from '../src/engine/ctc';import {combineAcousticAndSpeech} from '../src/engine/hybrid-alignment';import {alignLyrics,type Transcript} from '../src/engine/alignment';
const alphabet="-aienoutsrmkldghybpwcvjzf'qx";
const fixture=(frames:number)=>{const data=new Float32Array(frames*29).fill(-15);for(let t=0;t<frames;t++)data[t*29]=0;return{data,times:Float64Array.from({length:frames},(_,i)=>i*.02)};};
test('a song title copied above the lyric is not aligned as sung words when the file has version labels',()=>{
 assert.deepEqual(acousticLyricTokens('MINHA CANÇÃO\n\nPrimeira frase', 'auto','Minha Canção V2 (Definitiva) (audio-converter.example)')?.map(w=>w.text),['Primeira','frase']);
 assert.deepEqual(acousticLyricTokens('NÃO PELA FORÇA!\n\nOutra frase','auto','Outra música')?.slice(0,3).map(w=>w.text),['NÃO','PELA','FORÇA!']);
});
test('CTC preserves an instrumental intro and traces words across checkpoints',async()=>{
 const {data,times}=fixture(600),letters='nassombras',at=[350,352,354,400,402,404,406,408,410,412];
 [...letters].forEach((c,i)=>{data[at[i]*29]=-10;data[at[i]*29+alphabet.indexOf(c)]=0;});
 const result=await alignCTC(data,times,[{text:'Nas',line:0},{text:'sombras',line:0}]);
 assert.equal(result.segments[0].words![0].start,6.96);assert.equal(result.segments[0].words![1].start,7.96);
});
test('a weak consonant in silence cannot pull its word seconds ahead of the vowel',async()=>{
 const {data,times}=fixture(160);data[20*29+4]=-4;data[120*29+1]=0;data[120*29]=-10;data[125*29+8]=0;data[125*29]=-10;
 const result=await alignCTC(data,times,[{text:'Nas',line:0}]);
 assert.ok(result.segments[0].words![0].start>2.2);
});
test('low-confidence acoustic guesses cannot replace an English vocal recognized elsewhere',()=>{
 const speech:Transcript={segments:[{start:2,end:3,text:'You remain',words:[{text:'You',start:2,end:2.4,confidence:.95},{text:'remain',start:2.5,end:3,confidence:.95}]}]};
 const acoustic:Transcript={segments:[{start:20,end:21,text:'You remain',words:[{text:'You',start:20,end:20.4,confidence:.02},{text:'remain',start:20.5,end:21,confidence:.02}]}]};
 const result=combineAcousticAndSpeech('You remain',acoustic,speech,30);
 assert.deepEqual(result.segments[0].words!.map(w=>w.start),[2,2.5]);
});
test('elongated written vowels use the sung word timing without changing the lyric',()=>{
 const aligned=alignLyrics('GOOOOOOOOO',{duration:8,onsets:[],vocalRegions:[]},{segments:[{start:3,end:6,text:'Go',words:[{text:'Go',start:3,end:6}]}]},'en');
 assert.equal(aligned.words[0].text,'GOOOOOOOOO');assert.equal(aligned.words[0].start,3);assert.equal(aligned.words[0].end,6);assert.equal(aligned.words[0].source,'asr');
 assert.deepEqual(acousticLyricTokens('GOOOOOOOOO')?.map(w=>w.text),['GOOOOOOOOO']);
});
