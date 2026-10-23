// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Transcript} from '../engine/alignment';
import type {Language} from '../engine/language';
import {acousticLyricTokens} from '../engine/ctc';
import {audioBlob,decodeAudio} from '../editor/platform';
export async function recognizeVoice(audio:string,language:Language,signal:AbortSignal,progress:(message:string)=>void,lyrics='',title?:string,method:'acoustic'|'speech'='acoustic'):Promise<Transcript>{
 progress('Preparando a voz para sincronização…');
 const buffer=await decodeAudio(await audioBlob(audio),16000);
 if(signal.aborted)throw Error('Sincronização cancelada.');
 const samples=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels;}
 async function run(phase:'acoustic'|'speech',input:Float32Array,acoustic?:Transcript):Promise<Transcript>{
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
   else if(m.status==='message')progress(m.message);
   else if(m.status==='download')progress(`Baixando modelo de voz: ${Math.round(m.progress)}%. Apenas no primeiro uso.`);
   else if(m.status==='recognizing')progress(`Reconhecendo trecho ${m.chunk}/${m.total}: ${Math.floor(m.completed)} de ${Math.ceil(m.duration)} segundos processados (${Math.round(m.progress)}%). Os tempos serão aplicados ao concluir.`);
  };
  worker.postMessage({samples:input,language,lyrics,title,phase,acoustic},[input.buffer]);
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
 progress('Conferindo palavras com a voz. O modelo é baixado no primeiro uso…');
 return run('speech',samples,acoustic);
}
