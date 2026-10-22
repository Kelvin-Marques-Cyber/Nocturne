// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {clamp,mix,smooth,ik,n,pt,esc} from './math';
import type {Action,Point,Character,Motion} from './model';
export interface Pose {hip:Point;neck:Point;head:Point;leftHand:Point;rightHand:Point;leftFoot:Point;rightFoot:Point;tilt:number;squash:number;rotation:number;}
// Feet are ground contacts. IK solves knees and elbows, preserving limb lengths.
export function poseFor(action:Action,t:number):Pose {
 const breath=Math.sin(t*2.2),s=Math.sin(t*7),c=Math.cos(t*7);
 const p:Pose={hip:[0,-108+breath*1.4],neck:[-3,-202+breath*2],head:[-2,-229+breath*2],leftHand:[-31,-112],rightHand:[34,-112],leftFoot:[-18,0],rightFoot:[22,0],tilt:0,squash:1,rotation:0};
 if(action==='walk'||action==='run'){
  const run=action==='run',a=t*(run?11:5.4),stride=run?67:33,lean=run?29:9,bob=Math.abs(Math.sin(a))* (run?10:4);
  p.hip=[lean*.4,-108-bob];p.neck=[lean,-202-bob];p.head=[lean+6,-229-bob];
  const foot=(phase:number):Point=>[Math.cos(phase)*stride,-Math.max(0,Math.sin(phase))*(run?49:20)];
  p.leftFoot=foot(a);p.rightFoot=foot(a+Math.PI);
  p.leftHand=[lean-Math.cos(a)*stride*.75,-145+Math.sin(a)*17];p.rightHand=[lean+Math.cos(a)*stride*.75,-145-Math.sin(a)*17];p.tilt=run?10:3;
 } else if(action==='kneel'||action==='rise'){
  const q=action==='kneel'?smooth(t/1.3):1-smooth(t/1.6);
  p.hip=[-12*q,mix(-108,-52,q)];p.neck=[mix(-3,30,q),mix(-202,-135,q)];p.head=[mix(-2,48,q),mix(-229,-158,q)];
  p.leftFoot=[-35,0];p.rightFoot=[mix(22,58,q),0];p.leftHand=[mix(-31,20,q),mix(-112,-70,q)];p.rightHand=[mix(34,49,q),mix(-112,-65,q)];p.tilt=22*q;
 } else if(action==='fear'||action==='hesitate'){
  const q=action==='fear'?1:.55;p.hip=[-9*q,-108];p.neck=[-20*q,-193];p.head=[-25*q,-221];
  p.leftHand=[-48+Math.sin(t*17)*q,-167];p.rightHand=[20+Math.sin(t*19)*q,-176];p.leftFoot=[-30,0];p.rightFoot=[18,0];p.tilt=-12*q;
 } else if(action==='surprise'){
  const q=1-Math.exp(-Math.max(t,0)*6);p.hip=[-8,-108];p.neck=[-21,-203];p.head=[-27,-237-5*Math.sin(t*4)];p.leftHand=[-80*q,-207];p.rightHand=[63*q,-211];p.tilt=-12;
 } else if(action==='reach'||action==='hold'){
  p.rightHand=[55,-245+breath*2];p.leftHand=action==='hold'?[-35,-232]:[-20,-132];p.neck=[10,-202];p.head=[13,-231];p.tilt=8;
 } else if(action==='push'||action==='drag'){
  p.hip=[-13,-99];p.neck=[28,-176];p.head=[39,-198];p.leftHand=[82,-149];p.rightHand=[85,-180];p.leftFoot=[-57,-Math.max(0,s)*7];p.rightFoot=[35,-Math.max(0,-s)*7];p.tilt=14;
 } else if(action==='crawl'){
  p.hip=[-45,-40];p.neck=[35,-66];p.head=[64,-82];p.leftHand=[60+25*s,-2];p.rightHand=[78-25*s,-2];p.leftFoot=[-98+15*s,0];p.rightFoot=[-59-15*s,0];p.tilt=20;
 } else if(action==='stumble'||action==='fall'){
  const q=smooth(t/(action==='fall'?1.15:1.7));p.hip=[q*36,-108+q*24];p.neck=[q*54,-202+q*15];p.head=[q*60,-229+q*10];p.leftHand=[-73,-164+Math.sin(t*5)*12];p.rightHand=[77,-174];p.leftFoot=[-28,0];p.rightFoot=[55,-27*q];p.rotation=q*78;p.squash=1-q*.08;
 } else if(action==='rest'){
  p.hip=[-20,-50+breath];p.neck=[-40,-132+breath];p.head=[-31,-159+breath];p.leftHand=[20,-56];p.rightHand=[40,-45];p.leftFoot=[47,0];p.rightFoot=[79,0];p.tilt=10;
 }
 return p;
}
function blendPose(a:Pose,b:Pose,t:number):Pose{const out={...a};for(const k of ['hip','neck','head','leftHand','rightHand','leftFoot','rightFoot']as const)out[k]=[mix(a[k][0],b[k][0],t),mix(a[k][1],b[k][1],t)];for(const k of ['tilt','squash','rotation']as const)out[k]=mix(a[k],b[k],t);return out;}
export function poseAt(motions:Motion[],t:number):Pose {
 let index=motions.findIndex(m=>t>=m.start&&t<m.end);if(index<0)index=t>= (motions.at(-1)?.end??0)?motions.length-1:0;
 const m=motions[index];if(!m)return poseFor('idle',t);
 const now=poseFor(m.action,Math.max(0,t-m.start));const prev=motions[index-1];
 return prev?blendPose(poseFor(prev.action,Math.max(0,prev.end-prev.start)),now,smooth((t-m.start)/.42)):now;
}
function limb(root:Point,target:Point,l1:number,l2:number,bend:number){const [joint,end]=ik(root,target,l1,l2,bend);return `M ${pt(root)} Q ${pt(root)} ${pt(joint)} Q ${pt(joint)} ${pt(end)}`;}
export function characterSVG(p:Pose,c:Character,accent:string,heartPulse:number,ghost=false){
 const sh:Point=[p.neck[0],p.neck[1]+13],s=c.thickness;
 const paths=[`M ${pt(p.hip)} C ${p.hip[0]-8} ${p.hip[1]-30} ${p.neck[0]+8} ${p.neck[1]+40} ${pt(p.neck)}`,limb(sh,p.leftHand,51,55,-1),limb(sh,p.rightHand,51,55,1),limb(p.hip,p.leftFoot,60,60,1),limb(p.hip,p.rightFoot,60,60,-1)];
 const head=`M ${n(p.head[0]-17)} ${n(p.head[1]+9)} C ${n(p.head[0]-32)} ${n(p.head[1]-26)} ${n(p.head[0]+15)} ${n(p.head[1]-43*c.head)} ${n(p.head[0]+22)} ${n(p.head[1]-13)} C ${n(p.head[0]+35)} ${n(p.head[1]+17)} ${n(p.head[0]-9)} ${n(p.head[1]+28)} ${n(p.head[0]-17)} ${n(p.head[1]+9)}`;
 const render=(color:string,width:number,opacity:number,offset=0)=>`<g fill="none" stroke="${esc(color)}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${offset} ${-offset*.4})">${paths.map(d=>`<path d="${d}"/>`).join('')}<path d="${head}" transform="rotate(${p.tilt} ${pt(p.head)})"/></g>`;
 return `<g transform="rotate(${n(p.rotation)} 0 0) scale(1 ${n(p.squash)})">${render(c.stroke,s,ghost?.32:.91)}${render(c.stroke,s*.38,.32,1.4)}${c.heart&&!ghost?`<circle cx="${n(mix(p.hip[0],p.neck[0],.7))}" cy="${n(mix(p.hip[1],p.neck[1],.7))}" r="${n(4+heartPulse*2)}" fill="${accent}"/><circle cx="${n(mix(p.hip[0],p.neck[0],.7))}" cy="${n(mix(p.hip[1],p.neck[1],.7))}" r="${n(9+heartPulse*7)}" stroke="${accent}" stroke-width="1" fill="none" opacity=".4"/>`:''}</g>`;
}
