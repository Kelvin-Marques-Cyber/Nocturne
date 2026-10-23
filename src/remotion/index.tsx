// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import React,{useRef,useLayoutEffect} from 'react';
import {registerRoot,Composition,useCurrentFrame,AbsoluteFill,Audio,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
import demo from '../../public/demo.json';
import type {Project} from '../engine/model';
import {dimensions} from '../engine/model';
import {renderFrame} from '../engine/frame';
import {real3DScene,hasReal3D} from '../engine/real3d-plan';
function Film({project}:{project:Project}){
 const frame=useCurrentFrame(),canvas=useRef<HTMLCanvasElement>(null),scene=useRef<import('../browser/real3d').Real3DRenderer|undefined>(undefined),t=Math.max(0,frame/project.fps-(project.visualSyncOffsetSeconds??0)),active=!!real3DScene(project,t),dim=dimensions(project.format);
 useLayoutEffect(()=>{
  if(!active)return;const handle=delayRender('Preparando objeto 3D');let alive=true;
  import('../browser/real3d').then(m=>{if(alive&&canvas.current){scene.current=new m.Real3DRenderer(canvas.current);scene.current.render(project,t,dim.width,dim.height);}continueRender(handle);}).catch(cancelRender);
  return()=>{alive=false;scene.current?.dispose();scene.current=undefined;};
 },[project,active]);
 useLayoutEffect(()=>{if(active)scene.current?.render(project,t,dim.width,dim.height);},[frame,project]);
 return <AbsoluteFill><canvas ref={canvas} style={{position:'absolute',inset:0,width:'100%',height:'100%',visibility:active?'visible':'hidden'}}/><div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:renderFrame(project,frame)}}/><Audio src={staticFile(project.audio)}/></AbsoluteFill>;
}
const Root=()=>{const p=demo as Project;const d=dimensions(p.format);return <Composition id="Nocturne" component={Film} durationInFrames={Math.ceil(p.duration*p.fps)} fps={p.fps} width={d.width} height={d.height} defaultProps={{project:p}} calculateMetadata={({props})=>({durationInFrames:Math.ceil(props.project.duration*props.project.fps),fps:props.project.fps,...dimensions(props.project.format)})}/>;};
registerRoot(Root);
