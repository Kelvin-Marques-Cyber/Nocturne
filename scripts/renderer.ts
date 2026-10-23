// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {ensureProjectFonts} from './font-support';
import {rasterizeRGB} from '../src/engine/raster';
import {availableParallelism} from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {resolve,join} from 'node:path';
import {mkdir,rename,rm,readFile} from 'node:fs/promises';
import type {Project} from '../src/engine/model';
import {dimensions,validateProject} from '../src/engine/model';
import {renderFrame} from '../src/engine/frame';
import {hasReal3D,real3DScene} from '../src/engine/real3d-plan';
import sharp from 'sharp';
export interface RenderOptions {from?:number;duration?:number;output:string;width?:number;height?:number;crf?:number;preset?:string;onProgress?:(value:{frame:number;total:number;percent:number;elapsed:number})=>void;signal?:AbortSignal;}
const positive=(x:number)=>Number.isFinite(x)&&x>0;
export async function renderVideo(project:Project,opts:RenderOptions){
 validateProject(project);await ensureProjectFonts(project);
 const from=opts.from??0,duration=Math.min(opts.duration??project.duration,project.duration-from);
 if(!Number.isFinite(from)||from<0||from>=project.duration||!positive(duration))throw Error('Trecho de renderização inválido.');
 const {width,height}=dimensions(project.format),ww=opts.width??width,hh=opts.height??height;
 if(!positive(ww)||!positive(hh)||ww%2||hh%2||ww>3840||hh>3840)throw Error('Use dimensões pares, até 3840 px.');
 if(!/^media\/[\w.-]+\.(mp3|wav|flac|m4a|ogg)$/i.test(project.audio))throw Error('O áudio deve estar em public/media/ com nome simples.');
 const audio=resolve('public',project.audio);await readFile(audio);
 const total=Math.ceil(duration*project.fps),out=resolve(opts.output),temp=out.replace(/\.mp4$/i,'')+'.rendering.mp4';
 await mkdir(resolve(out,'..'),{recursive:true});
 const threads=Math.max(1,Math.min(4,availableParallelism()-1));
 const ffmpeg=spawn(process.env.FFMPEG??'ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${ww}x${hh}`,'-framerate',String(project.fps),'-i','pipe:0','-ss',String(from),'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset',opts.preset??'veryfast','-crf',String(opts.crf??19),'-pix_fmt','yuv420p','-threads',String(threads),'-c:a','aac','-b:a','192k','-ar','48000','-t',String(duration),'-movflags','+faststart',temp],{stdio:['pipe','ignore','pipe']});
 let stderr='';ffmpeg.stderr.on('data',d=>{stderr=(stderr+d).slice(-8000);});
 let spawnError:Error|undefined;ffmpeg.on('error',e=>{spawnError=e;});
 // Install exit handlers immediately: errors must not become unhandled rejections while frames are being generated.
 const completion=new Promise<{code:number|null}>((res)=>ffmpeg.once('close',code=>res({code})));
 ffmpeg.stdin.on('error',()=>{});
 const abort=()=>ffmpeg.kill('SIGTERM');opts.signal?.addEventListener('abort',abort,{once:true});
 const start=Date.now();
 let scene3D:Awaited<ReturnType<typeof import('./real3d-native').native3DRenderer>>|undefined;
 try{
  if(hasReal3D(project)){const {native3DRenderer}=await import('./real3d-native');scene3D=await native3DRenderer(project,ww,hh);}
  const concurrency=Math.max(2,Math.min(6,availableParallelism(),Math.floor(96*1024*1024/(ww*hh*3))));
  const pending=new Map<number,ReturnType<typeof rasterizeRGB>>();
  const enqueue=(i:number)=>{if(i<total){const at=from*project.fps+i;if(scene3D&&real3DScene(project,Math.max(0,at/project.fps-(project.visualSyncOffsetSeconds??0))))return;const promise=rasterizeRGB(renderFrame(project,at,{width:ww,height:hh}));promise.catch(()=>{});pending.set(i,promise);}};
  for(let i=0;i<Math.min(concurrency,total);i++)enqueue(i);
  for(let i=0;i<total;i++){
   if(opts.signal?.aborted)throw Error('Renderização cancelada.');if(spawnError)throw spawnError;if(ffmpeg.exitCode!==null)throw Error(stderr||'FFmpeg encerrou antes do último frame.');
   const at=from*project.fps+i,is3D=scene3D&&real3DScene(project,Math.max(0,at/project.fps-(project.visualSyncOffsetSeconds??0)));
   const frame=is3D?await sharp(await scene3D!.frame(at)).removeAlpha().raw().toBuffer():await pending.get(i)!;pending.delete(i);enqueue(i+concurrency);
   if(!ffmpeg.stdin.write(frame))await once(ffmpeg.stdin,'drain');
   if(i%project.fps===0||i===total-1)opts.onProgress?.({frame:i+1,total,percent:(i+1)/total*100,elapsed:(Date.now()-start)/1000});
  }
  ffmpeg.stdin.end();const result=await completion;if(result.code!==0)throw spawnError??Error(stderr||'FFmpeg falhou.');
  await rename(temp,out);
  const metadata=JSON.parse(execFileSync(process.env.FFPROBE??'ffprobe',['-v','quiet','-of','json','-show_streams',out],{encoding:'utf8'})),encoded=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');
  return {output:out,frames:Number(encoded.nb_frames),inputFrames:total,duration,width:ww,height:hh,fps:project.fps,elapsed:(Date.now()-start)/1000};
 }catch(e){ffmpeg.kill('SIGTERM');await completion;await rm(temp,{force:true});throw e;}finally{opts.signal?.removeEventListener('abort',abort);await scene3D?.close();}
}
