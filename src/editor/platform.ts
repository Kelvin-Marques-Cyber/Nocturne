// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Project,Analysis}from'../engine/model';
import{validateProject}from'../engine/model';
import{alignLyrics,type Transcript}from'../engine/alignment';
import{createStoryboard}from'../engine/storyboard';
import{persist,stored}from'../browser/storage';
export const browserMode=import.meta.env.VITE_STATIC==='true';
export const base=import.meta.env.BASE_URL;
export async function api(path:string,data?:unknown,method='POST'):Promise<any>{
 if(browserMode){
  if(path==='/api/demo')return(await fetch(base+'demo.json')).json();
  if(path==='/api/storyboard'){
   const{project,lyrics,transcript}=data as {project:Project;lyrics:string;transcript?:Transcript};validateProject(project);
   const aligned=alignLyrics(lyrics,project.analysis,transcript,project.language),next:Project={...project,lyrics,words:aligned.words,alignment:{method:aligned.method,coverage:aligned.coverage,notes:aligned.notes,reviewRequired:true},scenes:createStoryboard(lyrics,aligned.words,project.analysis,project.language)};validateProject(next);return next;
  }
  if(path==='/api/project'){const project=data as Project;validateProject(project);await persist('project:'+project.id,project);return{saved:true};}
  throw Error('Esta operação requer o aplicativo local.');
 }
 const res=await fetch(path,data===undefined?undefined:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),out=await res.json();if(!res.ok)throw Error(out.error??'Falha de comunicação.');return out;
}
export async function audioBlob(audio:string){const blob=browserMode?await stored<Blob>('audio:'+audio):undefined;if(blob)return blob;const r=await fetch(base+audio);if(!r.ok||!(r.headers.get('Content-Type')??'').startsWith('audio/'))throw Error('Importe sua música na aba Fonte para ouvir e exportar.');return r.blob();}
export async function audioURL(audio:string){return browserMode?URL.createObjectURL(await audioBlob(audio)):base+audio;}
export async function decodeAudio(blob:Blob,sampleRate=22050){const context=new OfflineAudioContext(2,1,sampleRate);return context.decodeAudioData(await blob.arrayBuffer());}
export async function importAudioFile(file:File):Promise<{audio:string;title:string;analysis:Analysis}>{
 if(!/\.(mp3|wav|flac)$/i.test(file.name)||file.size>256*1024*1024)throw Error('Importe MP3, WAV ou FLAC de até 256 MB.');
 if(!browserMode){const response=await fetch('/api/audio?name='+encodeURIComponent(file.name),{method:'POST',body:file}),data=await response.json();if(!response.ok)throw Error(data.error);return data;}
 const buffer=await decodeAudio(file),mono=new Float32Array(buffer.length);for(let c=0;c<buffer.numberOfChannels;c++){const values=buffer.getChannelData(c);for(let i=0;i<values.length;i++)mono[i]+=values[i]/buffer.numberOfChannels;}
 const worker=new Worker(new URL('../browser/analysis-worker.ts',import.meta.url),{type:'module'});
 const analysis=await new Promise<Analysis>((resolve,reject)=>{worker.onmessage=e=>{worker.terminate();if(e.data.error)reject(Error(e.data.error));else resolve(e.data.analysis);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({samples:mono,sampleRate:buffer.sampleRate},[mono.buffer]);});
 const audio='media/browser-'+[...crypto.getRandomValues(new Uint8Array(12))].map(n=>n.toString(16).padStart(2,'0')).join('')+'.'+file.name.split('.').at(-1)!.toLowerCase();await persist('audio:'+audio,file);return{audio,title:file.name.replace(/\.[^.]+$/,''),analysis};
}
