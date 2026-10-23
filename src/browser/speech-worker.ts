// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
// Optional recognizer is loaded only for voice synchronization. Audio never
// leaves this worker; the network downloads the runtime and multilingual model.
const runtime='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
type Recognizer=(samples:Float32Array,options:Record<string,unknown>)=>Promise<{text:string;chunks:{text:string;timestamp:[number|null,number|null]}[]}>;
self.onmessage=async(event:MessageEvent<{samples:Float32Array;language:string}>)=>{
 try{
  const {pipeline,env}=await import(/* @vite-ignore */ runtime);
  env.allowLocalModels=false;env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;
  env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
  const recognizer=await pipeline('automatic-speech-recognition','Xenova/whisper-base',{device:'wasm',dtype:'q8',progress_callback:(p:{status:string;file?:string;progress?:number})=>{
   if(p.status==='progress')self.postMessage({status:'download',file:p.file,progress:p.progress??0});
  }}) as Recognizer;
  const {samples,language}=event.data;let chunks=0;
  self.postMessage({status:'recognizing',progress:0});
  const result=await recognizer(samples,{return_timestamps:'word',chunk_length_s:28,stride_length_s:4,task:'transcribe',...(language==='auto'?{}:{language}),chunk_callback:()=>{chunks++;self.postMessage({status:'recognizing',progress:Math.min(98,chunks*20/(samples.length/16000)*100)});}});
  const duration=samples.length/16000;
  const words=result.chunks.flatMap((chunk,i)=>{
   const start=chunk.timestamp[0],end=chunk.timestamp[1]??result.chunks[i+1]?.timestamp[0]??duration;
   if(start===null||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||start<0||start>=duration||!chunk.text.trim())return[];
   return[{text:chunk.text.trim(),start,end:Math.min(duration,end),confidence:.7}];
  });
  if(!words.length)throw Error('Não foi possível reconhecer palavras com tempos nesta gravação.');
  self.postMessage({status:'complete',transcript:{method:'whisper-base-browser-word-timestamps',language,segments:[{start:words[0].start,end:words.at(-1)!.end,text:result.text,words}]}});
 }catch(error){self.postMessage({status:'error',error:error instanceof Error?error.message:String(error)});}
};
