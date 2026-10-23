// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeAudio,canEncodeVideo}from'mediabunny';
import{registerAacEncoder}from'@mediabunny/aac-encoder';
import type{Project}from'../engine/model';
import{validateProject,dimensions}from'../engine/model';
import{renderFrame}from'../engine/frame';
import{audioBlob,decodeAudio}from'../editor/platform';
import{loadFilmFonts,outlineText}from'./fonts';
export interface BrowserRenderOptions{from?:number;duration?:number;width?:number;height?:number;fps?:number;signal?:AbortSignal;onProgress?:(percent:number)=>void;}
export async function renderBrowserVideo(project:Project,options:BrowserRenderOptions={}):Promise<Blob>{
 validateProject(project);
 const dim=dimensions(project.format),w=options.width??dim.width,h=options.height??dim.height,fps=options.fps??project.fps,from=options.from??0,duration=Math.min(options.duration??project.duration,project.duration-from);
 if(!Number.isFinite(from)||from<0||duration<=0||!Number.isInteger(fps)||fps<=0||fps>60||w%2||h%2||w<=0||h<=0)throw Error('Trecho ou dimensões inválidos.');
 if(!await canEncodeVideo('avc',{width:w,height:h,frameRate:fps}))throw Error('Este navegador não oferece codificação H.264. Abra no Chrome/Edge com WebCodecs ou use o renderizador FFmpeg local.');
 if(!await canEncodeAudio('aac'))registerAacEncoder();
 const fonts=await loadFilmFonts(project.lyrics),buffer=await decodeAudio(await audioBlob(project.audio),48000);
 if(buffer.duration+.05<from+duration)throw Error('A gravação importada termina antes do trecho solicitado. Importe o áudio correspondente ao storyboard.');
 const start=Math.round(from*buffer.sampleRate),length=Math.min(Math.round(duration*buffer.sampleRate),buffer.length-start);
 if(length<1)throw Error('O áudio importado não cobre este trecho.');
 const clip=new AudioBuffer({length,numberOfChannels:buffer.numberOfChannels,sampleRate:buffer.sampleRate});for(let c=0;c<clip.numberOfChannels;c++)clip.copyToChannel(buffer.getChannelData(c).subarray(start,start+length),c);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas 2D indisponível.');
 const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target}),video=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:w*h*fps*.13}),keyFrameInterval:2}),audio=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192000})});
 output.addVideoTrack(video,{frameRate:fps});output.addAudioTrack(audio);await output.start();
  const cache=new Map<string,{d:string;width:number}>(),total=Math.ceil(duration*fps);
 let canUseBitmap=typeof createImageBitmap==='function';
 type PreparedFrame={source:CanvasImageSource;dispose:()=>void};
 async function prepareFrame(frame:number):Promise<PreparedFrame>{
  const svg=outlineText(renderFrame(project,(from+frame/fps)*project.fps,{width:w,height:h}),fonts,cache);
  const blob=new Blob([svg],{type:'image/svg+xml'});
  // Decode ahead when the browser supports bitmap decoding; don't keep many
  // large RGBA frames alive (a 1080p bitmap is about 8MB).
  if(canUseBitmap){
   try{const bitmap=await createImageBitmap(blob);return{source:bitmap,dispose:()=>bitmap.close()};}
   catch{canUseBitmap=false;}
  }
  const url=URL.createObjectURL(blob),image=new Image();
  try{
   await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('Falha ao desenhar um quadro SVG.'));image.src=url;});
   return{source:image,dispose:()=>URL.revokeObjectURL(url)};
  }catch(error){URL.revokeObjectURL(url);throw error;}
 }
 let prepared:Promise<PreparedFrame>|undefined;
 const startPrepare=(frame:number)=>{const result=prepareFrame(frame);void result.catch(()=>{});return result;};
 try{
  await audio.add(clip);audio.close();
  prepared=startPrepare(0);
  for(let frame=0;frame<total;frame++){
   if(options.signal?.aborted)throw Error('Renderização cancelada.');
   const current=await prepared;
   prepared=frame+1<total?startPrepare(frame+1):undefined;
   try{context.drawImage(current.source,0,0,w,h);}finally{current.dispose();}
   await video.add(frame/fps,Math.min(1/fps,duration-frame/fps));
   if(frame%12===0||frame===total-1){options.onProgress?.((frame+1)/total*100);await new Promise<void>(r=>setTimeout(r,0));}
   if(cache.size>2500)cache.clear();
  }
  video.close();await output.finalize();if(!target.buffer)throw Error('MP4 não foi finalizado.');return new Blob([target.buffer],{type:'video/mp4'});
 }catch(error){
  // The ahead-of-time rasterization may already have a decoded bitmap.
  if(prepared)try{(await prepared).dispose();}catch{}
  await output.cancel();throw error;
 }
}
