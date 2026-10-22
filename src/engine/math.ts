// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Point} from './model';
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
export const smoother=(t:number)=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const easeOut=(t:number)=>1-Math.pow(1-clamp(t),3);
export const spring=(t:number)=>1-Math.exp(-8*Math.max(0,t))*(Math.cos(11*t)+.5*Math.sin(11*t));
export const pulse=(time:number,start:number,decay=.18)=>time>=start?Math.exp(-(time-start)/decay):0;
export const rand=(seed:number)=>{let x=Math.imul(seed^0x9e3779b9,0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return((x^(x>>>16))>>>0)/4294967296;};
export const n=(v:number)=>Number(v.toFixed(3));
export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const pt=(p:Point)=>`${n(p[0])} ${n(p[1])}`;
export function ik(root:Point,target:Point,l1:number,l2:number,bend=1):[Point,Point]{
 const dx=target[0]-root[0],dy=target[1]-root[1],d=Math.max(.001,Math.min(Math.hypot(dx,dy),l1+l2-.001));
 const a=Math.atan2(dy,dx),b=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
 const joint:Point=[root[0]+Math.cos(a+b*bend)*l1,root[1]+Math.sin(a+b*bend)*l1];
 return [joint,[root[0]+Math.cos(a)*d,root[1]+Math.sin(a)*d]];
}
export function sample(values:number[],hop:number,time:number){const x=clamp(time/hop,0,Math.max(0,values.length-1)),i=Math.floor(x);return mix(values[i]??0,values[i+1]??values[i]??0,x-i);}
export function nearestBefore(values:number[],t:number){let l=0,r=values.length-1,found=-1;while(l<=r){const m=(l+r)>>>1;if(values[m]<=t){found=m;l=m+1;}else r=m-1;}return found<0?-Infinity:values[found];}
