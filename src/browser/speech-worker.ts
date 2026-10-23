// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
// Optional recognizer is loaded only for voice synchronization. Audio never
// leaves this worker; the network downloads the runtime and multilingual model.
import {transcribeChunks,type Recognizer} from './speech-chunks';
import {detectAudioLanguage,lyricLanguages,type LanguageRecognizer} from './speech-language';
import {acousticLyricTokens} from '../engine/ctc';
import {alignAcoustically} from './acoustic';
import type {Language} from '../engine/language';
import {acousticRecoveryRegions,combineAcousticAndSpeech} from '../engine/hybrid-alignment';
import type {Transcript} from '../engine/alignment';
const runtime='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
self.onmessage=async(event:MessageEvent<{samples:Float32Array;language:Language;lyrics?:string;title?:string;phase?:'acoustic'|'speech';acoustic?:Transcript}>)=>{
 try{
  const {samples,language,lyrics='',title}=event.data,tokens=acousticLyricTokens(lyrics,language,title);
  if(event.data.phase==='acoustic'){
   if(!tokens)throw Error('Esta letra usa a transcrição multilíngue.');
   const transcript=await alignAcoustically(samples,tokens,message=>self.postMessage({status:'message',message}));
   self.postMessage({status:'complete',transcript});return;
  }
  const acoustic=event.data.acoustic;
  const regions=acoustic?acousticRecoveryRegions(acoustic.segments.flatMap(s=>s.words??[]),samples.length/16000):[];
  if(acoustic&&!regions.length){self.postMessage({status:'complete',transcript:combineAcousticAndSpeech(lyrics,acoustic,{segments:[]},samples.length/16000,language,title)});return;}
  const {pipeline,env}=await import(/* @vite-ignore */ runtime);
  env.allowLocalModels=false;env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
  const recognizer=await pipeline('automatic-speech-recognition','Xenova/whisper-small',{device:'wasm',dtype:'q8',progress_callback:(p:{status:string;file?:string;progress?:number})=>{
   if(p.status==='progress')self.postMessage({status:'download',file:p.file,progress:p.progress??0});
  }}) as Recognizer;
  const candidates=lyricLanguages(lyrics);let transcript:Transcript;
  if(acoustic){
   const segments:Transcript['segments']=[];
   for(const [i,region] of regions.entries()){
    self.postMessage({status:'message',message:`Conferindo trecho de voz ${i+1}/${regions.length} (${Math.floor(region.start)}–${Math.ceil(region.end)} s)…`});
    const result=await transcribeChunks(samples.subarray(Math.round(region.start*16000),Math.round(region.end*16000)),recognizer,language,()=>{},clip=>detectAudioLanguage(clip,recognizer as Recognizer&LanguageRecognizer,candidates));
    segments.push(...result.segments.map(s=>({...s,start:s.start+region.start,end:s.end+region.start,words:s.words?.map(w=>({...w,start:w.start+region.start,end:w.end+region.start}))})));
   }
   transcript=combineAcousticAndSpeech(lyrics,acoustic,{segments},samples.length/16000,language,title);
  }else transcript=await transcribeChunks(samples,recognizer,language,value=>self.postMessage({status:'recognizing',...value}),clip=>detectAudioLanguage(clip,recognizer as Recognizer&LanguageRecognizer,candidates));
  await (recognizer as Recognizer&{dispose?:()=>Promise<void>}).dispose?.();
  self.postMessage({status:'complete',transcript});
 }catch(error){self.postMessage({status:'error',error:error instanceof Error?error.message:String(error)});}
};
