// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Analysis,Project,Scene}from'./model';
import{pulse,nearestBefore,clamp,n,sample,smooth}from'./math';
export function beatResponse(a:Analysis,t:number){
 const strength=(at:number,decay:number)=>{
  if(!Number.isFinite(at)||t<at)return 0;
  const band=(values:number[])=>Math.max(sample(values,a.hopSeconds,at-.025),sample(values,a.hopSeconds,at),sample(values,a.hopSeconds,at+.025));
  const level=clamp(band(a.energy)*.4+band(a.low)*.45+band(a.high)*.15);
  return pulse(t,at,decay)*smooth((t-at)/.018)*level;
 };
 return clamp(Math.max(strength(nearestBefore(a.beats,t),.11)*clamp(.4+a.tempoConfidence),strength(nearestBefore(a.impacts,t),.075)*.85));
}
export function beatAccents(p:Project,s:Scene,t:number,w:number,h:number,focus:number){
 if(!s.performance?.enabled)return'';
 const strength=beatResponse(p.analysis,t)*(s.performance.beatSync??.65)*s.performance.intensity;if(strength<.002)return'';
 const a=strength*(1-focus*.7),u=Math.min(w,h)/1080,color=p.style.accent,kind=s.performance.beatStyle??'pulse';let shape='';
 if(kind==='pulse')shape=`<rect x="${w*.09}" y="${h*.18}" width="${w*.82}" height="${h*.64}" fill="none" stroke="${color}" stroke-width="${n((1+strength*2)*u)}"/>`;
 if(kind==='ripple')shape=`<circle cx="${w*.5}" cy="${h*.5}" r="${n(Math.min(w,h)*(.31+(1-strength)*.08))}" fill="none" stroke="${color}" stroke-width="${n(1.5*u)}"/>`;
 if(kind==='rays')for(let i=0;i<12;i++){const angle=i*Math.PI/6,r=Math.min(w,h)*.34,rr=r+(18+strength*50)*u;shape+=`<path d="M${n(w*.5+Math.cos(angle)*r)} ${n(h*.5+Math.sin(angle)*r)}L${n(w*.5+Math.cos(angle)*rr)} ${n(h*.5+Math.sin(angle)*rr)}" stroke="${color}" stroke-width="${n(2*u)}"/>`;}
 if(kind==='bars')for(let i=0;i<13;i++){const band=sample(i%2?p.analysis.high:p.analysis.low,p.analysis.hopSeconds,t),height=(4+band*strength*(18+i%4*9))*u;shape+=`<rect x="${n(w*(.31+i*.03))}" y="${n(h*.79-height)}" width="${n(3*u)}" height="${n(height)}" fill="${color}"/>`;}
 if(kind==='diamonds')for(let i=0;i<3;i++){const r=Math.min(w,h)*(.25+i*.07+strength*.025);shape+=`<path d="M${w*.5} ${n(h*.5-r)}L${n(w*.5+r)} ${h*.5}L${w*.5} ${n(h*.5+r)}L${n(w*.5-r)} ${h*.5}Z" fill="none" stroke="${color}" stroke-width="${u}" opacity="${1-i*.2}"/>`;}
 if(kind==='waveform'){const band=sample(p.analysis.high,p.analysis.hopSeconds,t),d=Array.from({length:65},(_,i)=>`${i?'L':'M'}${n(w*(.12+i*.76/64))} ${n(h*.78+Math.sin(i*.55-t*6)*(4+band*18)*strength*u)}`).join('');shape=`<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(2*u)}"/>`;}
 if(kind==='brackets')for(const x of [.12,.88])for(const y of [.22,.78])shape+=`<path d="M${n(w*x+(x<.5?1:-1)*32*u)} ${n(h*y)}H${n(w*x)}v${n((y<.5?1:-1)*(24+strength*16)*u)}" fill="none" stroke="${color}" stroke-width="${n(2*u)}"/>`;
 if(kind==='rings')for(let i=0;i<5;i++)shape+=`<ellipse cx="${w*.5}" cy="${h*.53}" rx="${n(w*(.18+i*.043+strength*.015))}" ry="${n(h*(.06+i*.016+strength*.005))}" fill="none" stroke="${color}" stroke-width="${u}" opacity="${1-i*.15}"/>`;
 return`<g data-beat-strength="${n(strength)}" opacity="${n(a*.24)}">${shape}</g>`;
}
