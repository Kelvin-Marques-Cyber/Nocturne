// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectAudioLanguage,lyricLanguages} from '../src/browser/speech-language';
import {recognitionWindows,transcribeChunks,type SpeechProgress} from '../src/browser/speech-chunks';
test('automatic language detection predicts a language token instead of using English by default',async()=>{
 let released=false;
 const language=await detectAudioLanguage(new Float32Array(16000),{
  processor:async()=>({input_features:{data:new Float32Array(1),dims:[1],dispose:()=>{released=true;}}}),
  model:{generation_config:{decoder_start_token_id:1,lang_to_id:{'<|en|>':2,'<|pt|>':3,'<|ja|>':4}},generate:async options=>{
   assert.deepEqual(options.decoder_input_ids,[[1]]);assert.equal(options.max_new_tokens,1);
   const logits={data:new Float32Array([0,0,1,2,100]),dims:[1,5]};
   const mask=(options.logits_processor as ((ids:bigint[][],value:{data:Float32Array;dims:number[]})=>{data:Float32Array;dims:number[]})[])[0];
   mask([[1n]],logits);assert.equal(logits.data[4],-Infinity);
   return{data:BigInt64Array.of(1n,3n),dims:[1,2]};
  }},
 },['pt','en']);
 assert.equal(language,'pt');assert.equal(released,true);
});
test('bilingual lyrics retain English without confusing similar Portuguese and Spanish passages',()=>{
 const lyrics="Então eu me deito nas sombras do desespero. Minha esperança permanece no Senhor, porque a misericórdia dura para sempre.\n\nNo condemnation, no separation, nothing can take me from the hands of my Savior. I know You haven't let me go, You can still hear me.";
 assert.deepEqual(new Set(lyricLanguages(lyrics)),new Set(['pt','en']));
 assert.deepEqual(lyricLanguages(''),[]);
});
test('chunk progress advances and timestamps retain their position in the original audio',async()=>{
 const progress:SpeechProgress[]=[];let calls=0;
 const transcript=await transcribeChunks(new Float32Array(41*16000).fill(.05),async(_samples,options)=>{
  assert.equal(options.language,'pt');assert.equal(options.return_timestamps,'word');assert.equal(options.chunk_length_s,0);
  const index=calls++,start=index?2.5:7.5;
  return{text:'palavra',chunks:[{text:'palavra'+index,timestamp:[start,start+.3]}]};
 },'auto',value=>progress.push(value),async()=> 'pt');
 assert.equal(calls,4);assert.ok(progress.some(p=>p.progress>0&&p.progress<100));assert.equal(progress.at(-1)!.progress,100);
 assert.deepEqual(transcript.segments[0].words!.map(w=>w.start),[7.5,12.5,24.5,36.5]);
});
test('speech workers receive bounded windows with context rather than the whole recording',()=>{
 const windows=recognitionWindows(379,134,173);
 assert.deepEqual(windows.map(w=>[w.coreStart,w.coreEnd]),[[134,154],[154,173]]);
 assert.ok(windows.every(w=>w.end-w.start<=24));
});
test('an unavailable language detector fails explicitly instead of producing an English transcript',async()=>{
 await assert.rejects(transcribeChunks(new Float32Array(16000).fill(.05),async()=>{throw Error('must not decode');},'auto',()=>{}),/detectar o idioma/);
});
