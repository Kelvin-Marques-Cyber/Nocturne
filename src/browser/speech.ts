// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Transcript} from '../engine/alignment';
import type {Language} from '../engine/language';
import {audioBlob,decodeAudio} from '../editor/platform';
export async function recognizeVoice(audio:string,language:Language,signal:AbortSignal,progress:(message:string)=>void):Promise<Transcript>{
 progress('Preparando a voz para sincronização…');
 const buffer=await decodeAudio(await audioBlob(audio),16000);
 if(signal.aborted)throw Error('Sincronização cancelada.');
 const samples=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels;}
 const worker=new Worker(new URL('./speech-worker.ts',import.meta.url),{type:'module'});
 progress('Carregando reconhecimento de voz. O modelo é baixado no primeiro uso…');
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
   else if(m.status==='download')progress(`Baixando modelo de voz: ${Math.round(m.progress)}%. Apenas no primeiro uso.`);
   else if(m.status==='recognizing')progress(`Sincronizando palavras com a voz: ${Math.round(m.progress)}%…`);
  };
  worker.postMessage({samples,language},[samples.buffer]);
 });
}
