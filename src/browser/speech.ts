// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Transcript} from '../engine/alignment';
import type {Language} from '../engine/language';
import {acousticLyricTokens} from '../engine/ctc';
import {acousticRecoveryRegions,combineAcousticAndSpeech} from '../engine/hybrid-alignment';
import {recognitionWindows} from './speech-chunks';
import {audioBlob,decodeAudio} from '../editor/platform';
export async function recognizeVoice(audio:string,language:Language,signal:AbortSignal,progress:(message:string)=>void,lyrics='',title?:string,method:'acoustic'|'speech'='acoustic'):Promise<Transcript>{
 progress('Preparando a voz para sincronização…');
 const buffer=await decodeAudio(await audioBlob(audio),16000);
 if(signal.aborted)throw Error('Sincronização cancelada.');
 const samples=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels;}
 async function run(phase:'acoustic'|'speech',input:Float32Array,report=progress):Promise<Transcript>{
 const worker=new Worker(new URL('./speech-worker.ts',import.meta.url),{type:'module'});
 return new Promise((resolve,reject)=>{
  const done=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
  const abort=()=>{done();reject(Error('Sincronização cancelada.'));};
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  worker.onerror=e=>{done();reject(Error(e.message||'Não foi possível carregar o reconhecimento de voz.'));};
  worker.onmessage=e=>{
   const m=e.data;
   if(m.status==='complete'){done();resolve(m.transcript);}
   else if(m.status==='error'){done();reject(Error(m.error));}
   else if(m.status==='message')report(m.message);
   else if(m.status==='download')report(`Baixando modelo de voz: ${Math.round(m.progress)}%. Apenas no primeiro uso.`);
   else if(m.status==='recognizing')report(m.completed>0?`Reconhecendo voz: ${Math.round(m.progress)}%…`:`Processando janela de voz ${m.chunk}/${m.total}…`);
  };
  worker.postMessage({samples:input,language,lyrics,title,phase},[input.buffer]);
 });
 }
 let acoustic:Transcript|undefined;
 if(method==='acoustic'&&acousticLyricTokens(lyrics,language,title)){
  acoustic=await run('acoustic',samples.slice());
  // Terminating the acoustic worker releases its WASM heap before another
  // runtime loads Whisper. Releasing a model alone does not shrink that heap.
  await new Promise<void>(resolve=>setTimeout(resolve,100));
  if(signal.aborted)throw Error('Sincronização cancelada.');
 }
 const duration=samples.length/16000,regions=acoustic?acousticRecoveryRegions(acoustic.segments.flatMap(s=>s.words??[]),duration):[{start:0,end:duration}],windows=regions.flatMap(region=>recognitionWindows(duration,region.start,region.end));
 const segments:Transcript['segments']=[];
 for(const [index,window]of windows.entries()){
  if(signal.aborted)throw Error('Sincronização cancelada.');
  const prefix=`Trecho ${index+1}/${windows.length} (${Math.floor(window.coreStart)}–${Math.ceil(window.coreEnd)} s): `;
  progress(prefix+'conferindo palavras com a voz…');
  try{
   const result=await run('speech',samples.slice(Math.round(window.start*16000),Math.round(window.end*16000)),message=>progress(prefix+message));
   for(const segment of result.segments){
    const words=segment.words?.map(w=>({...w,start:w.start+window.start,end:w.end+window.start})).filter(w=>(w.start+w.end)/2>=window.coreStart&&(w.start+w.end)/2<window.coreEnd);
    if(words?.length)segments.push({start:words[0].start,end:words.at(-1)!.end,text:words.map(w=>w.text).join(' '),words});
   }
  }catch(error){if(!acoustic||!(error instanceof Error)||!error.message.includes('reconhecer palavras com tempos'))throw error;}
  // Each bounded speech window also gets a fresh worker: decoder caches and
  // growing WASM heaps must not accumulate across an entire recording.
  await new Promise<void>(resolve=>setTimeout(resolve,100));
 }
 return acoustic?combineAcousticAndSpeech(lyrics,acoustic,{segments},duration,language,title):{method:'whisper-small-browser-word-timestamps-v2',language,segments};
}
