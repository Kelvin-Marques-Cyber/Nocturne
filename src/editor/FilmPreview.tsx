// SPDX-License-Identifier: Apache-2.0
import React,{useEffect,useRef,memo} from 'react';
import type {Project} from '../engine/model';
import {FramePool} from '../browser/frame-pool';
import {renderFrame} from '../engine/frame';
import {audioFrame,frameMatchesAudio} from '../engine/sync';
import {real3DScene,hasReal3D} from '../engine/real3d-plan';
interface Props{project:Project;time:number;playing:boolean;audio:React.RefObject<HTMLAudioElement|null>;paused:boolean;}
// Use the HTMLAudioElement clock and refuse to paint frames rendered for an older position.
export const FilmPreview=memo(function FilmPreview({project,time,playing,audio,paused}:Props){
 const element=useRef<HTMLDivElement>(null),clock=useRef({time,playing,paused});clock.current={time,playing,paused};
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  let alive=true,busy=false,ready=false,displayed=-1,raf=0,pool:FramePool|undefined;
  let scene3D:import('../browser/real3d').Real3DRenderer|undefined;
  let load3D:Promise<void>|undefined;
  const ensure3D=()=>load3D??=(import('../browser/real3d').then(m=>{if(alive&&canvas.current)scene3D=new m.Real3DRenderer(canvas.current);}));
  try{pool=new FramePool();void pool.init(project).then(()=>{ready=true;}).catch(()=>{pool?.close();pool=undefined;ready=true;});}catch{ready=true;}
  const now=()=>clock.current.playing?audio.current?.currentTime??clock.current.time:clock.current.time;
  const draw=()=>{
   if(!alive)return;
   const state=clock.current,visible=element.current?.getClientRects().length,frame=audioFrame(now(),project.fps);
   if(ready&&!busy&&!state.paused&&visible&&document.visibilityState!=='hidden'&&frame!==displayed){
    busy=true;
    const result=pool?pool.frame(frame):Promise.resolve(renderFrame(project,frame));
    void result.then(async svg=>{
     const t=Math.max(0,frame/project.fps-(project.visualSyncOffsetSeconds??0)),active=!!real3DScene(project,t);
     if(active){await ensure3D();if(!alive)return;const width=project.format==='vertical'?540:960,height=project.format==='vertical'?960:540;scene3D?.render(project,t,width,height);}
     if(canvas.current)canvas.current.style.visibility=active?'visible':'hidden';
     if(!alive||!element.current||clock.current.paused)return;
     if(!frameMatchesAudio(frame,now(),project.fps))return;
     element.current.innerHTML=svg;displayed=frame;
    }).catch(()=>{pool?.close();pool=undefined;displayed=-1;}).finally(()=>{busy=false;});
   }
   raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);
  return()=>{alive=false;cancelAnimationFrame(raf);pool?.close();scene3D?.dispose();};
 },[project,audio]);
 return <div className="film-frame" style={{position:'relative',aspectRatio:project.format==='vertical'?'9/16':'16/9'}} aria-label="Prévia do videoclipe"><canvas ref={canvas} style={{position:'absolute',inset:0,width:'100%',height:'100%',visibility:'hidden'}}/><div ref={element} style={{position:'absolute',inset:0}}/></div>;
});
