// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
// Optional recognizer is loaded only for voice synchronization. Audio never
// leaves this worker; the network downloads the runtime and multilingual model.
import {transcribeChunks,type Recognizer} from './speech-chunks';
import {detectAudioLanguage,lyricLanguages,type LanguageRecognizer} from './speech-language';
import {acousticLyricTokens} from '../engine/ctc';
import {alignAcoustically} from './acoustic';
import type {Language} from '../engine/language';
const runtime='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
self.onmessage=async(event:MessageEvent<{samples:Float32Array;language:Language;lyrics?:string;title?:string;phase?:'acoustic'|'speech'}>)=>{
 try{
  const {samples,language,lyrics='',title}=event.data,tokens=acousticLyricTokens(lyrics,language,title);
  if(event.data.phase==='acoustic'){
   if(!tokens)throw Error('Esta letra usa a transcrição multilíngue.');
   const transcript=await alignAcoustically(samples,tokens,message=>self.postMessage({status:'message',message}));
   self.postMessage({status:'complete',transcript});return;
  }
  const {pipeline,env}=await import(/* @vite-ignore */ runtime);
  env.allowLocalModels=false;env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
  const recognizer=await pipeline('automatic-speech-recognition','Xenova/whisper-small',{device:'wasm',dtype:'q8',progress_callback:(p:{status:string;file?:string;progress?:number})=>{
   if(p.status==='progress')self.postMessage({status:'download',file:p.file,progress:p.progress??0});
  }}) as Recognizer;
  const candidates=lyricLanguages(lyrics),transcript=await transcribeChunks(samples,recognizer,language,value=>self.postMessage({status:'recognizing',...value}),clip=>detectAudioLanguage(clip,recognizer as Recognizer&LanguageRecognizer,candidates));
  await (recognizer as Recognizer&{dispose?:()=>Promise<void>}).dispose?.();
  self.postMessage({status:'complete',transcript});
 }catch(error){self.postMessage({status:'error',error:error instanceof Error?error.message:String(error)});}
};
