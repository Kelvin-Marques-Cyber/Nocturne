// SPDX-License-Identifier: Apache-2.0
import type {Transcript} from '../engine/alignment';
import type {Language} from '../engine/language';
import {acousticLyricTokens} from '../engine/ctc';
import {acousticRecoveryRegions,combineAcousticAndSpeech} from '../engine/hybrid-alignment';
import {audioBlob,decodeAudio,cachedTranscript} from '../editor/platform';
export type VoiceMethod='fast'|'speech'|'acoustic';
export async function recognizeVoice(audio:string,language:Language,signal:AbortSignal,progress:(message:string)=>void,lyrics='',title?:string,method:VoiceMethod='fast',options:{force?:boolean}={}):Promise<Transcript>{
 if(!options.force&&method!=='acoustic'){
  const cached=await cachedTranscript(audio),raw=cached&&!cached.method?.startsWith('mms-');
  const suitable=raw&&(method==='fast'||/whisper-small|faster-whisper/.test(cached.method??''));
  if(suitable){progress('Reutilizando a transcrição já reconhecida deste áudio.');return cached;}
 }
 progress('Preparando a voz para reconhecimento…');
 const buffer=await decodeAudio(await audioBlob(audio),16000);
 if(signal.aborted)throw Error('Sincronização cancelada.');
 const samples=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels;}
 async function run(phase:'acoustic'|'speech',input:Float32Array,regions?:{start:number;end:number}[]):Promise<Transcript>{
  const worker=new Worker(new URL('./speech-worker.ts',import.meta.url),{type:'module'});
  return new Promise((resolve,reject)=>{
   const done=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
   const abort=()=>{done();reject(Error('Sincronização cancelada.'));};
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
   worker.onerror=e=>{done();reject(Error(e.message||'Não foi possível carregar o reconhecimento de voz.'));};
   worker.onmessage=e=>{
    const m=e.data;
    if(m.status==='complete'){done();resolve(m.transcript);}
    else if(m.status==='error'){done();reject(Error(m.error));}
    else if(m.status==='message')progress(m.message);
    else if(m.status==='download')progress(`Baixando modelo ${method==='fast'?'leve':'de voz'}: ${Math.round(m.progress)}%. Apenas no primeiro uso.`);
    else if(m.status==='partial')progress('Voz reconhecida: '+m.text);
    else if(m.status==='recognizing')progress(`Reconhecendo voz: ${Math.round(m.progress)}% · ${Math.floor(m.completed)} / ${Math.ceil(m.duration)} s`);
   };
   worker.postMessage({samples:input,language,lyrics,title,phase,model:method==='fast'?'tiny':'small',regions},[input.buffer]);
  });
 }
 let acoustic:Transcript|undefined;
 if(method==='acoustic'&&acousticLyricTokens(lyrics,language,title)){
  acoustic=await run('acoustic',samples.slice());
  if(signal.aborted)throw Error('Sincronização cancelada.');
 }
 const duration=samples.length/16000,regions=acoustic?acousticRecoveryRegions(acoustic.segments.flatMap(s=>s.words??[]),duration):undefined;
 if(acoustic&&!regions?.length)return acoustic;
 // One bounded sequence of 20-second windows. The model is loaded once,
 // rather than once per outer window and then chunked a second time.
 const speech=await run('speech',samples,regions);
 return acoustic?combineAcousticAndSpeech(lyrics,acoustic,speech,duration,language,title):speech;
}
