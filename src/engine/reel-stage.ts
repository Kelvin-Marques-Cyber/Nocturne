// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,Word,Point,Action} from './model';
import {clamp,smooth,mix,n,esc,pt} from './math';
import {poseAt,characterSVG} from './rig';
import {expressivePose} from './expression';
import {wordSustain} from './voice';
import {filmFont} from './language';
import {beatAccents} from './beat';
import {planReelShots,reelShotAt,reelCamera,projectReelPoint,type ReelCamera,type ReelPhrase,type ReelShot} from './reel-direction';

export interface ReelContext {p:Project;s:Scene;t:number;w:number;h:number;u:number;beat:number;energy:number;accent:string;fg:string;words:Word[];}
const polygon=(cam:ReelCamera,x:number,y:number,z:number,w:number,h:number,fill:string,stroke='none',opacity=1)=>`<polygon points="${[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]].map(v=>pt(projectReelPoint(cam,v as [number,number,number]))).join(' ')}" fill="${fill}" stroke="${stroke}" opacity="${n(opacity)}"/>`;
function onPlane(cam:ReelCamera,x:number,y:number,z:number,content:string){
 const origin=projectReelPoint(cam,[x,y,z]),right=projectReelPoint(cam,[x+1,y,z]),down=projectReelPoint(cam,[x,y+1,z]);
 return`<g transform="matrix(${n(right[0]-origin[0])} ${n(right[1]-origin[1])} ${n(down[0]-origin[0])} ${n(down[1]-origin[1])} ${pt(origin)})">${content}</g>`;
}
function label(cam:ReelCamera,text:string,x:number,y:number,z:number,size:number,color:string){return onPlane(cam,x,y,z,`<text font-family="${filmFont}" font-size="${n(size)}" fill="${color}">${esc(text)}</text>`);}
function lyric(c:ReelContext,shot:ReelShot,phrase:ReelPhrase,cam:ReelCamera,color:string){
 const {t,p}=c,visible=phrase.nodes.filter(node=>t>=node.word.start);if(!visible.length)return'';
 return`<g data-sung-caption="${esc(visible.at(-1)!.word.id)}">`+visible.map(node=>{
  const word=node.word,age=t-word.start,enter=smooth(age/.14),held=shot.intensity>0?wordSustain(p.analysis,word,t)*shot.intensity:0,hit=t<word.end;
  const expand=1+held*.095,x=node.x-node.width*(expand-1)/2,y=node.y+(1-enter)*9*c.u;
  const face=shot.type.face,paint=shot.layout==='cascade'?color:hit?color:shot.layout==='desktop'||shot.layout==='dialog'?'#1b2836':c.fg;
  // Explicit glyph scaling works in both browser SVG and librsvg/FFmpeg;
  // textLength/lengthAdjust is not implemented consistently by the latter.
  const body=`<text data-lyric-word="${esc(word.id)}" font-family="${face.family}" font-weight="${face.weight}" font-style="${face.italic?'italic':'normal'}" font-size="${n(node.size)}" letter-spacing="${n(shot.type.tracking*node.size)}" transform="scale(${n(shot.type.width*expand)} 1)" fill="${shot.type.outline?'none':paint}" ${shot.type.outline?`stroke="${paint}" stroke-width="${n(1.6*c.u)}"`:''}>${esc(word.text)}</text>`;
  return`<g opacity="${n(enter)}" ${held?`data-held-word="${esc(word.id)}"`:''}>${onPlane(cam,x,y,node.z+2,body)}</g>`;
 }).join('')+'</g>';
}
function windowFrame(c:ReelContext,cam:ReelCamera,phrase:ReelPhrase,index:number,title:string,dialog=false){
 const x=phrase.x-phrase.width/2,y=phrase.y-phrase.height/2-15*c.u,z=phrase.z,ww=phrase.width,hh=phrase.height+35*c.u;
 let out=polygon(cam,x+12*c.u,y+16*c.u,z-8,ww,hh,'#050b12','none',.45);
 out+=polygon(cam,x,y,z,ww,hh,'#d5d9dd','#f0f2f3')+polygon(cam,x+5*c.u,y+5*c.u,z+1,ww-10*c.u,37*c.u,dialog?'#263d59':'#304e69');
 out+=polygon(cam,x+12*c.u,y+50*c.u,z+1,ww-24*c.u,hh-62*c.u,'#f3efe5','#88939c');
 out+=label(cam,title,x+16*c.u,y+31*c.u,z+2,19*c.u,'#edf2f5');
 for(let i=0;i<3;i++){out+=polygon(cam,x+ww-(72-i*21)*c.u,y+13*c.u,z+2,16*c.u,18*c.u,'#d4d9dc','#f5f5f5');}
 // The progress is owned by sung words, so pauses leave the action still.
 const completed=phrase.words.filter(w=>c.t>=w.start).length/Math.max(1,phrase.words.length),barWidth=ww-38*c.u;
 out+=polygon(cam,x+19*c.u,y+hh-13*c.u,z+2,barWidth,3*c.u,'#afb6ba');
 out+=polygon(cam,x+19*c.u,y+hh-13*c.u,z+3,barWidth*completed,3*c.u,c.accent);
 return`<g data-reel-window="${index}">${out}</g>`;
}
function actor(c:ReelContext,cam:ReelCamera,shot:ReelShot,phrase:ReelPhrase|undefined){
 if(!phrase)return'';
 const age=c.t-phrase.start,answer=smooth((c.t-phrase.end+.1)/.6),x=shot.layout==='dialog'?c.w*.29:shot.bounds.x+c.w*.25,y=shot.layout==='dialog'?c.h*.30:shot.bounds.y+shot.bounds.height*.5+390*c.u;
 const foreground=shot.layout==='cascade',at:Point=foreground?[c.w*.86,c.h*.88]:projectReelPoint(cam,[x,y,105*c.u]),scale=foreground?1.5*c.u:Math.min(c.w,c.h)/1080*1.8*cam.focal/Math.max(cam.focal*.3,cam.distance-105*c.u);
 const motions=[{action:'hesitate' as Action,start:phrase.start-.4,end:phrase.start+.45},{action:'reach' as Action,start:phrase.start+.45,end:Math.max(phrase.start+.46,phrase.end)},{action:'turn' as Action,start:Math.max(phrase.start+.46,phrase.end),end:Math.max(phrase.start+.47,shot.end+.5)}];
 const scene=foreground?c.s:{...c.s,motions},expression=expressivePose(poseAt(scene.motions,c.t,c.p.analysis.bpm),c.p,scene,c.t),pose=expression.pose;
 let out=`<g ${expression.gesture?`data-gesture="${expression.gesture}"`:''} data-reel-actor="${age<.45?'anticipate':answer>.5?'settle':'reach'}" transform="translate(${pt(at)}) scale(${n(scale*c.p.character.scale)})">${characterSVG(pose,c.p.character,c.accent,0)}</g>`;
 if(shot.layout==='dialog'){
  const from:Point=[at[0]+pose.rightHand[0]*scale*c.p.character.scale,at[1]+pose.rightHand[1]*scale*c.p.character.scale],button=projectReelPoint(cam,[c.w*.26,phrase.y+phrase.height/2+75*c.u,phrase.z+8]);
  const q=smooth((age-.25)/Math.max(.5,phrase.end-phrase.start-.1)),cursor:Point=[mix(from[0],button[0],q),mix(from[1],button[1],q)];
  out+=`<path d="M${pt(cursor)}l0 ${15*c.u} ${5*c.u} ${-5*c.u} ${5*c.u} ${10*c.u} ${4*c.u} ${-2*c.u} ${-5*c.u} ${-10*c.u} ${8*c.u} ${-1*c.u}Z" fill="#f6f4e9" stroke="#192534" stroke-width="${c.u}"/>`;
 }
 return out;
}
export function renderReelStage(c:ReelContext,nativeWorld:()=>string){
 const shots=planReelShots(c.p,c.s),shot=reelShotAt(shots,c.t),cam=reelCamera(shot,c.t,c.w,c.h),active=shot.phrases.reduce((last,p,i)=>c.t>=p.start?i:last,0),phrase=shot.phrases[active];
 const colors=[c.accent,'#59d7ea','#c4e66e','#f1bf68'];let out='';
 if(shot.layout==='world'){
  const q=smooth((c.t-shot.start)/Math.max(.1,shot.end-shot.start)),zoom=mix(c.s.camera.zoomFrom,c.s.camera.zoomTo,q),dx=c.s.camera.panX*q*c.u,dy=c.s.camera.panY*q*c.u;
  out+=`<g data-reel-world="${c.s.kind}" transform="translate(${n(c.w*.5+dx)} ${n(c.h*.52+dy)}) scale(${n(zoom)}) translate(${-c.w*.5} ${-c.h*.52})">${nativeWorld()}</g>`;
  if(c.p.style.captions&&phrase)out+=lyric(c,shot,phrase,cam,c.accent);
 }else if(shot.layout==='cascade'){
  const base=projectReelPoint(cam,[shot.bounds.x,shot.bounds.y,0]);
  out+=`<path d="M${n(base[0])} ${n(c.h*.08)}V${n(c.h*.9)}" stroke="${c.accent}" stroke-width="${c.u}" opacity=".09"/>`;
  shot.phrases.forEach((p,i)=>{if(c.t>=p.start)out+=lyric(c,shot,p,cam,p.delivery.kind==='shout'?c.accent:colors[i%colors.length]);});
  if(phrase?.delivery.kind!=='shout')out+=actor(c,cam,shot,phrase);
 }else{
  const background=shot.layout==='desktop'?'#18364d':'#14283c';
  out+=`<rect width="${c.w}" height="${c.h}" fill="${background}"/><path d="M0 ${c.h*.88}H${c.w}" stroke="#6193ac" opacity=".16"/>`;
  if(shot.layout==='desktop'){
   shot.phrases.forEach((p,i)=>{if(c.t<p.start-.16)return;const appear=smooth((c.t-p.start+.16)/.25);out+=`<g opacity="${n(appear)}">${windowFrame(c,cam,p,i,c.p.title.toLowerCase().replace(/\s+/g,'_')+'.'+String(i+1).padStart(2,'0'))}${lyric(c,shot,p,cam,'#c42e47')}</g>`;});
   if(shot.phrases.length<3)out+=actor(c,cam,shot,phrase);
  }else if(phrase){
   out+=windowFrame(c,cam,phrase,active,c.s.title,true)+lyric(c,shot,phrase,cam,'#bd2942');
   const by=phrase.y+phrase.height/2+45*c.u,bx=c.w*.12,done=smooth((c.t-phrase.end+.08)/.35);
   out+=polygon(cam,bx,by,phrase.z,220*c.u,66*c.u,done>.5?'#c4e66e':'#d6dce0','#f4f5f5')+label(cam,done>.5?'✓':'↵',bx+90*c.u,by+45*c.u,phrase.z+2,36*c.u,'#21354a');
   out+=actor(c,cam,shot,phrase);
  }
 }
 // A restrained recording mark belongs to the film, rather than editor chrome.
 out+=`<circle cx="${c.w*.885}" cy="${c.h*.045}" r="${3*c.u}" fill="${c.accent}"/><text x="${c.w*.9}" y="${c.h*.047}" font-family="${filmFont}" font-size="${9*c.u}" fill="${c.fg}" opacity=".55">REC</text>`;
 return`<g data-reel-layout="${shot.layout}">${out}${beatAccents(c.p,c.s,c.t,c.w,c.h,0)}</g>`;
}
