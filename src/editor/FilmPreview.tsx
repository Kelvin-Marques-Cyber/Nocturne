// SPDX-License-Identifier: Apache-2.0
import React,{useEffect,useRef,memo} from 'react';
import type {Project} from '../engine/model';
import {FramePool} from '../browser/frame-pool';
import {renderFrame} from '../engine/frame';
import {audioFrame,frameMatchesAudio} from '../engine/sync';
interface Props{project:Project;time:number;playing:boolean;audio:React.RefObject<HTMLAudioElement|null>;paused:boolean;}
// Use the HTMLAudioElement clock and refuse to paint frames rendered for an older position.
export const FilmPreview=memo(function FilmPreview({project,time,playing,audio,paused}:Props){
 const element=useRef<HTMLDivElement>(null),clock=useRef({time,playing,paused});clock.current={time,playing,paused};
 useEffect(()=>{
  let alive=true,busy=false,ready=false,displayed=-1,raf=0,pool:FramePool|undefined;
  try{pool=new FramePool();void pool.init(project).then(()=>{ready=true;}).catch(()=>{pool?.close();pool=undefined;ready=true;});}catch{ready=true;}
  const now=()=>clock.current.playing?audio.current?.currentTime??clock.current.time:clock.current.time;
  const draw=()=>{
   if(!alive)return;
   const state=clock.current,visible=element.current?.getClientRects().length,frame=audioFrame(now(),project.fps);
   if(ready&&!busy&&!state.paused&&visible&&document.visibilityState!=='hidden'&&frame!==displayed){
    busy=true;
    const result=pool?pool.frame(frame):Promise.resolve(renderFrame(project,frame));
    void result.then(svg=>{
     if(!alive||!element.current||clock.current.paused)return;
     if(!frameMatchesAudio(frame,now(),project.fps))return;
     element.current.innerHTML=svg;displayed=frame;
    }).catch(()=>{pool?.close();pool=undefined;displayed=-1;}).finally(()=>{busy=false;});
   }
   raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);
  return()=>{alive=false;cancelAnimationFrame(raf);pool?.close();};
 },[project,audio]);
 return <div ref={element} className="film-frame" style={{aspectRatio:project.format==='vertical'?'9/16':'16/9'}} aria-label="Prévia do videoclipe"/>;
});
