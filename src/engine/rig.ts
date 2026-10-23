// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {clamp,mix,smooth,ik,n,pt,esc} from './math';
import type {Action,Point,Character,Motion} from './model';
export interface Pose {hip:Point;neck:Point;head:Point;leftHand:Point;rightHand:Point;leftFoot:Point;rightFoot:Point;tilt:number;squash:number;rotation:number;}
export const anatomy={upperArm:44,forearm:45,thigh:61,shin:61,headX:19,headY:23};
const tau=Math.PI*2;
function hermite(a:number,b:number,v:number,t:number){const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a+(t3-2*t2+t)*v+(-2*t3+3*t2)*b+(t3-t2)*v;}
// The stance foot moves backwards at a constant local velocity. The swing
// uses matching endpoint velocities and zero vertical speed at heel contact.
export function gaitFoot(phase:number,stride:number,lift:number,stance:number):Point{
 phase=((phase%1)+1)%1;
 if(phase<stance)return[mix(stride,-stride,phase/stance),0];
 const u=(phase-stance)/(1-stance),v=-2*stride*(1-stance)/stance;
 return[hermite(-stride,stride,v,u),-lift*Math.sin(Math.PI*u)**2];
}
export function poseFor(action:Action,t:number):Pose {
 const breath=Math.sin(t*2.05),p:Pose={hip:[0,-120.3+breath*.4],neck:[-1,-205+breath*.7],head:[1,-241+breath*.8],leftHand:[-21,-111+breath*.4],rightHand:[23,-110+breath*.6],leftFoot:[-16,0],rightFoot:[17,0],tilt:-2,squash:1,rotation:0};
 if(action==='walk'||action==='run'){
  const run=action==='run',phase=t*(run?1:.5),a=phase*tau,contact=Math.cos(a*2),stride=run?43:24;
  const bob=run?-109+5*contact:-119+1.2*contact,lean=run?32:7;
  p.hip=[run?8:2,bob];p.neck=[lean,-(run?190:204)+(bob+(run?109:119))*.68];p.head=[lean+(run?10:2),p.neck[1]-36];
  p.leftFoot=gaitFoot(phase,stride,run?48:23,run?.43:.64);p.rightFoot=gaitFoot(phase+.5,stride,run?48:23,run?.43:.64);
  const maxLeg=121.4,hipLift=Math.max(0,...[p.leftFoot,p.rightFoot].map(f=>f[1]===0?-Math.sqrt(maxLeg**2-(f[0]-p.hip[0])**2)-p.hip[1]:0));
  p.hip[1]+=hipLift;p.neck[1]+=hipLift;p.head[1]+=hipLift;
  if(run){p.leftHand=[lean-9-Math.cos(a)*39,-156+Math.sin(a)*15];p.rightHand=[lean+9+Math.cos(a)*39,-156-Math.sin(a)*15];}
  else{p.leftHand=[lean-13-Math.cos(a)*23,-117+Math.sin(a)*5];p.rightHand=[lean+13+Math.cos(a)*23,-116-Math.sin(a)*5];}
  p.tilt=run?10:1;
 }else if(action==='kneel'||action==='rise'){
  const q=action==='kneel'?smooth(t/1.3):1-smooth(t/1.6),anticipate=Math.sin(Math.PI*clamp(t/.35))*4*(action==='kneel'?1:0);
  p.hip=[-18*q,mix(-120.3,-53,q)-anticipate];p.neck=[mix(-1,-7,q),mix(-205,-133,q)-anticipate*.6];p.head=[mix(1,5,q),mix(-241,-169,q)];
  p.leftFoot=[mix(-16,-58,q),0];p.rightFoot=[mix(17,42,q),0];p.leftHand=[mix(-21,7,q),mix(-111,-76,q)];p.rightHand=[mix(23,37,q),mix(-110,-73,q)];p.tilt=15*q;
 }else if(action==='fear'||action==='hesitate'){
  const q=action==='fear'?1:.45,weight=Math.sin(t*1.2)*q*2;
  p.hip=[-7*q+weight,-119];p.neck=[-17*q+weight,-200];p.head=[-21*q+weight,-234];
  p.leftHand=action==='fear'?[-34,-183]:[-31,-117];p.rightHand=action==='fear'?[-3,-160]:[-11,-174];p.leftFoot=[-22,0];p.rightFoot=[19,0];p.tilt=-11*q;
 }else if(action==='surprise'){
  const q=smooth(t/.32),settle=Math.exp(-Math.max(0,t-.32)*3)*Math.sin(Math.max(0,t-.32)*9)*2;
  p.hip=[-7*q,-119];p.neck=[-16*q,-206-settle];p.head=[-20*q,-242-settle];p.leftHand=[mix(-21,-61,q),mix(-111,-208,q)];p.rightHand=[mix(23,52,q),mix(-110,-215,q)];p.tilt=-12*q;
 }else if(action==='reach'){
  const q=smooth(t/.7);p.neck=[7,-205];p.head=[12,-241];p.leftHand=[-17,-118];p.rightHand=[mix(23,45,q),mix(-110,-262,q)+breath];p.tilt=8;
 }else if(action==='hold'){
  const q=smooth(t/.65);p.neck=[3,-204];p.head=[8,-239];p.leftHand=[mix(-21,10,q),mix(-111,-171,q)];p.rightHand=[mix(23,-11,q),mix(-110,-170,q)];p.tilt=8;
 }else if(action==='push'||action==='drag'){
  const q=smooth(t/.45),strain=Math.sin(t*3)*1.4;
  p.hip=[-12,-111+strain];p.neck=[mix(3,27,q),-190+strain*.5];p.head=[mix(7,37,q),-225+strain*.5];
  p.leftHand=[70,-176];p.rightHand=[82,-170];p.leftFoot=[-44,0];p.rightFoot=[35,0];p.tilt=11;
 }else if(action==='crawl'){
  const a=t*3.2;p.hip=[-42,-43+Math.sin(a)*2];p.neck=[24,-77];p.head=[52,-99];p.leftHand=[51+Math.sin(a)*16,-1];p.rightHand=[72-Math.sin(a)*16,-1];p.leftFoot=[-109+Math.sin(a)*12,0];p.rightFoot=[-78-Math.sin(a)*12,0];p.tilt=15;
 }else if(action==='stumble'){
  const q=smooth(t/.8);p.hip=[q*7,-116];p.neck=[q*30,-201];p.head=[q*39,-236];p.leftHand=[-55,-171];p.rightHand=[64,-183];p.leftFoot=[-24,0];p.rightFoot=[39,-Math.sin(q*Math.PI)*27];p.rotation=q*12;p.tilt=11*q;
 }else if(action==='fall'){
  const q=smooth((t-.14)/.92),impact=Math.max(0,t-1.06),bounce=Math.sin(impact*11)*Math.exp(-impact*5)*2;
  p.hip=[8,-116];p.neck=[16,-199];p.head=[27,-235];p.leftHand=[-37,-168];p.rightHand=[59,-189];p.leftFoot=[-25,0];p.rightFoot=[36,-29*q];p.rotation=q*83+bounce;p.squash=1-Math.sin(Math.PI*q)*.025;p.tilt=7;
 }else if(action==='turn'){
  const q=smooth(t/.8),look=Math.sin(q*Math.PI/2);p.neck=[-3+look*5,-204];p.head=[mix(-8,13,q),-240];p.leftHand=[-25,-112];p.rightHand=[20+look*6,-113];p.tilt=mix(-9,8,q);
 }else if(action==='brace'){
  const q=smooth(t/.5),strain=Math.sin(t*2.7)*1.2;p.hip=[-11,-111];p.neck=[mix(-1,29,q),-189+strain];p.head=[mix(1,39,q),-223+strain];p.leftHand=[-8,-155];p.rightHand=[59,-224];p.leftFoot=[-44,0];p.rightFoot=[35,0];p.tilt=16;
 }else if(action==='float'){
  const up=18+Math.sin(t*1.8)*8;p.hip=[0,-120-up];p.neck=[6,-204-up];p.head=[13,-240-up];p.leftHand=[-46,-161-up];p.rightHand=[54,-173-up];p.leftFoot=[-32,-18-up];p.rightFoot=[26,-37-up];p.tilt=7;
 }else if(action==='recoil'){
  const q=(1-Math.exp(-t*15))*Math.exp(-t*2.5);p.hip=[-9*q,-120];p.neck=[-29*q,-204];p.head=[-40*q,-240];p.leftHand=[-27-q*13,-111-q*40];p.rightHand=[23-q*18,-111-q*56];p.tilt=-18*q;
 }else if(action==='rest'){
  p.hip=[-24,-52+breath*.7];p.neck=[-9,-127+breath*.9];p.head=[0,-163+breath];p.leftHand=[28,-58];p.rightHand=[45,-52];p.leftFoot=[52,0];p.rightFoot=[83,0];p.tilt=10;
 }
 return p;
}
function blendPose(a:Pose,b:Pose,t:number):Pose{const out={...a};for(const k of ['hip','neck','head','leftHand','rightHand','leftFoot','rightFoot']as const)out[k]=[mix(a[k][0],b[k][0],t),mix(a[k][1],b[k][1],t)];for(const k of ['tilt','squash','rotation']as const)out[k]=mix(a[k],b[k],t);return out;}
function motionPose(m:Motion,t:number,bpm:number){
 const duration=m.end-m.start,elapsed=Math.max(0,t-m.start),canonical:Partial<Record<Action,number>>={kneel:1.3,rise:1.6,stumble:.8,fall:1.1,surprise:.45};
 const speed=m.action==='walk'||m.action==='run'||m.action==='crawl'?clamp(bpm/120,.5,1.7):Math.max(1,(canonical[m.action]??0)/duration);
 return poseFor(m.action,elapsed*speed);
}
export function poseAt(motions:Motion[],t:number,bpm=120):Pose {
 let index=motions.findIndex(m=>t>=m.start&&t<m.end);if(index<0)index=t>=(motions.at(-1)?.end??0)?motions.length-1:0;
 const m=motions[index];if(!m)return poseFor('idle',t);
 const now=motionPose(m,t,bpm),prev=motions[index-1],blend=Math.min(.34,(m.end-m.start)*.3);
 return prev?blendPose(motionPose(prev,prev.end,bpm),now,smooth((t-m.start)/blend)):now;
}
export function solveRig(p:Pose){
 const dx=p.neck[0]-p.hip[0],dy=p.neck[1]-p.hip[1],length=Math.max(1,Math.hypot(dx,dy)),side:Point=[-dy/length,dx/length],center:Point=[mix(p.neck[0],p.hip[0],.1),mix(p.neck[1],p.hip[1],.1)];
 const shoulder=(sign:number):Point=>[center[0]+side[0]*sign*8,center[1]+side[1]*sign*8];
 const hip=(sign:number):Point=>[p.hip[0]+side[0]*sign*3,p.hip[1]+side[1]*sign*3];
 const ls=shoulder(-1),rs=shoulder(1),lh=hip(-1),rh=hip(1);
 // Keep a small elbow bend instead of snapping into a locked, straight arm
 // when an expressive target reaches the edge of the anatomical workspace.
 const arm=(root:Point,target:Point,sign:number)=>{
  const dx=target[0]-root[0],dy=target[1]-root[1],distance=Math.hypot(dx,dy),reach=anatomy.upperArm+anatomy.forearm-2;
  const end:Point=distance>reach?[root[0]+dx*reach/distance,root[1]+dy*reach/distance]:target;
  return ik(root,end,anatomy.upperArm,anatomy.forearm,-sign);
 };
 const leg=(root:Point,target:Point)=>{let result=ik(root,target,anatomy.thigh,anatomy.shin,-1);if(result[0][1]>Math.max(root[1],target[1])+1)result=ik(root,target,anatomy.thigh,anatomy.shin,1);return result;};
 return{leftShoulder:ls,rightShoulder:rs,leftHip:lh,rightHip:rh,leftArm:arm(ls,p.leftHand,-1),rightArm:arm(rs,p.rightHand,1),leftLeg:leg(lh,p.leftFoot),rightLeg:leg(rh,p.rightFoot)};
}
function limb(root:Point,joint:Point,end:Point){
 // Slightly round a joint while keeping the skeleton and planted endpoints.
 const a:Point=[mix(root[0],joint[0],.91),mix(root[1],joint[1],.91)],b:Point=[mix(joint[0],end[0],.09),mix(joint[1],end[1],.09)];
 return`M${pt(root)} L${pt(a)} Q${pt(joint)} ${pt(b)} L${pt(end)}`;
}
export function characterSVG(p:Pose,c:Character,accent:string,heartPulse:number,ghost=false){
 const rig=solveRig(p),s=c.thickness,opacity=ghost?.14:1;
 const path=(d:string,alpha=1)=>`<path d="${d}" opacity="${n(alpha)}"/>`;
 const paths=[path(limb(rig.leftHip,...rig.leftLeg),.57),path(limb(rig.leftShoulder,...rig.leftArm),.57),path(`M${pt(p.hip)} C${n(p.hip[0]-2)} ${n(p.hip[1]-27)} ${n(p.neck[0]+2)} ${n(p.neck[1]+30)} ${pt(p.neck)}`),path(`M${pt(rig.leftShoulder)} Q${pt(p.neck)} ${pt(rig.rightShoulder)}`,.45),path(limb(rig.rightHip,...rig.rightLeg)),path(limb(rig.rightShoulder,...rig.rightArm))];
 for(const [foot,sign]of [[rig.leftLeg[1],-1],[rig.rightLeg[1],1]]as const)paths.push(path(`M${pt(foot)} q${n(6+sign)} 1 10 0`,sign<0?.57:1));
 const rx=anatomy.headX*c.head,ry=anatomy.headY*c.head,bottom:Point=[p.head[0],p.head[1]+ry];
 const neck=path(`M${pt(p.neck)} Q${n(mix(p.neck[0],bottom[0],.6))} ${n(mix(p.neck[1],bottom[1],.5))} ${pt(bottom)}`);
 const head=`<g transform="rotate(${n(p.tilt*.7)} ${pt(p.head)})"><ellipse cx="${n(p.head[0])}" cy="${n(p.head[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${ghost?'none':'#08090b'}"/></g>`;
 const a=p.rotation*Math.PI/180;
 const points=[...rig.leftArm,...rig.rightArm,...rig.leftLeg,...rig.rightLeg,p.hip,p.neck];
 const maxY=Math.max(0,...points.map(([x,y])=>x*Math.sin(a)+y*p.squash*Math.cos(a)),p.head[0]*Math.sin(a)+p.head[1]*p.squash*Math.cos(a)+Math.hypot(rx*Math.sin(a),ry*Math.cos(a)));
 const ground=-maxY;
 const heart:Point=[mix(p.hip[0],p.neck[0],.69),mix(p.hip[1],p.neck[1],.69)];
 return `<g data-character="articulated" opacity="${opacity}" transform="translate(0 ${n(ground)}) rotate(${n(p.rotation)}) scale(1 ${n(p.squash)})"><g fill="none" stroke="${esc(c.stroke)}" stroke-width="${n(s)}" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}${neck}${head}</g>${c.heart&&!ghost?`<circle cx="${n(heart[0])}" cy="${n(heart[1])}" r="${n(3.7+heartPulse*1.3)}" fill="${accent}"/><circle cx="${n(heart[0])}" cy="${n(heart[1])}" r="${n(8+heartPulse*5)}" stroke="${accent}" stroke-width=".8" fill="none" opacity=".27"/>`:''}</g>`;
}
