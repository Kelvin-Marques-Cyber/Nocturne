// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Transcript} from '../engine/alignment';
import {normalize} from '../engine/model';
export type Recognizer=(samples:Float32Array,options:Record<string,unknown>)=>Promise<{text:string;chunks:{text:string;timestamp:[number|null,number|null]}[]}>;
export interface SpeechProgress {progress:number;chunk:number;total:number;completed:number;duration:number;language?:string}
export function recognitionWindows(duration:number,start=0,end=duration){
 const windows:{start:number;end:number;coreStart:number;coreEnd:number}[]=[];
 for(let from=start;from<end;from+=20)windows.push({start:Math.max(0,from-2),end:Math.min(duration,from+22),coreStart:from,coreEnd:Math.min(end,from+20)});
 return windows;
}
// Own the windows: Transformers.js v3 no longer calls chunk_callback for Whisper.
// Context protects words at a cut; only the middle of each window is retained.
export async function transcribeChunks(samples:Float32Array,recognizer:Recognizer,language:string,progress:(value:SpeechProgress)=>void,detectLanguage?:(samples:Float32Array)=>Promise<string>):Promise<Transcript>{
 const rate=16000,duration=samples.length/rate,step=12,context=2,total=Math.ceil(duration/step);
 const words:NonNullable<Transcript['segments'][number]['words']>=[];
 for(let chunk=0;chunk<total;chunk++){
  const from=chunk*step,to=Math.min(duration,from+step),clipStart=Math.max(0,from-context),clipEnd=Math.min(duration,to+context);
  progress({progress:from/duration*100,chunk:chunk+1,total,completed:from,duration});
  const spoken=language==='auto'?await detectLanguage?.(samples.subarray(Math.round(from*rate),Math.round(to*rate))):language;
  if(!spoken)throw Error('Não foi possível detectar o idioma da voz. Selecione o idioma da letra e tente novamente.');
  progress({progress:from/duration*100,chunk:chunk+1,total,completed:from,duration,language:spoken});
  const result=await recognizer(samples.subarray(Math.round(clipStart*rate),Math.round(clipEnd*rate)),{return_timestamps:'word',chunk_length_s:0,task:'transcribe',language:spoken,max_new_tokens:Math.min(448,Math.max(48,Math.ceil((clipEnd-clipStart)*16+24)))});
  for(let i=0;i<result.chunks.length;i++){
   const part=result.chunks[i],begin=part.timestamp[0],finish=part.timestamp[1]??result.chunks[i+1]?.timestamp[0]??clipEnd-clipStart;
   if(begin===null||!Number.isFinite(begin)||!Number.isFinite(finish)||finish<=begin||!part.text.trim())continue;
   const start=Math.max(clipStart,clipStart+begin),end=Math.min(clipEnd,clipStart+finish),middle=(start+end)/2;
   if(end<=start||middle<from||middle>=to)continue;
   const last=words.at(-1),overlap=last?Math.min(last.end,end)-Math.max(last.start,start):0;
   if(last&&normalize(last.text)===normalize(part.text)&&overlap>0&&overlap>=Math.min(last.end-last.start,end-start)*.5){last.end=Math.max(last.end,end);continue;}
   words.push({text:part.text.trim(),start,end,confidence:.7});
  }
  progress({progress:to/duration*100,chunk:chunk+1,total,completed:to,duration});
 }
 if(!words.length)throw Error('Não foi possível reconhecer palavras com tempos nesta gravação.');
 return{method:'whisper-small-browser-word-timestamps-v2',language,segments:[{start:words[0].start,end:words.at(-1)!.end,text:words.map(w=>w.text).join(' '),words}]};
}
