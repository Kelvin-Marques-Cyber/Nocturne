// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Analysis,Word,SceneEvent} from './model';
import {clamp,sample,smooth} from './math';
export const deliveries=['auto','neutral','shout','whisper','rising','sustained'] as const;
export type Delivery=typeof deliveries[number];
export const deliveryLabels:Record<Delivery,string>={auto:'Automática pela voz',neutral:'Natural',shout:'Grito / ênfase forte',whisper:'Suave / íntima',rising:'Crescendo',sustained:'Nota sustentada'};
export interface VocalDelivery {kind:Exclude<Delivery,'auto'>;source:'spectral'|'manual'|'unavailable';confidence:number;energy:number;peak:number;peakAt:number;rise:number;sustain:number}
const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);
const baselines=new WeakMap<Analysis,number>();
function baseline(a:Analysis){let v=baselines.get(a);if(v===undefined){const sorted=(a.voice?.energy??[]).filter(v=>v>.015).sort((a,b)=>a-b);v=sorted[Math.floor(sorted.length*.5)]??.4;baselines.set(a,v);}return v;}
// Uses only windows occupied by supplied lyric words. Loud drums outside them
// do not drive the delivery. The mixed track can still contain instruments;
// source/confidence remain explicit and manual overrides are authoritative.
export function vocalDelivery(a:Analysis,words:Word[],override:Delivery='auto'):VocalDelivery {
 const out:VocalDelivery={kind:'neutral',source:'unavailable',confidence:0,energy:0,peak:0,peakAt:words[0]?.start??0,rise:0,sustain:0};
 const voice=a.voice;
 if(voice&&words.length){
  const indices=[...new Set(words.flatMap(w=>Array.from({length:Math.max(1,Math.ceil((w.end-w.start)/a.hopSeconds))},(_,i)=>Math.round(w.start/a.hopSeconds)+i)))].filter(i=>i<voice.energy.length);
  const usable=indices.filter(i=>voice.presence[i]>.18&&voice.confidence[i]>.2&&voice.energy[i]>.015),levels=usable.map(i=>voice.energy[i]);
  if(usable.length>=Math.min(4,Math.ceil(.08/a.hopSeconds))){
   const max=Math.max(...levels),peakIndex=usable[levels.indexOf(max)],mid=baseline(a),energy=mean(levels),duration=words.at(-1)!.end-words[0].start;
   const first=usable.slice(0,Math.max(1,Math.floor(usable.length/3))),last=usable.slice(-Math.max(1,Math.floor(usable.length/3)));
   const pitch=(ix:number[])=>mean(ix.map(i=>voice.pitch[i]).filter(hz=>hz>65&&hz<1000));
   const early=pitch(first),late=pitch(last),rise=early&&late?12*Math.log2(late/early):0;
   let run=0,longest=0,previous=-2;
   for(const i of usable){if(voice.energy[i]>Math.max(.55,mid*1.5)){run=i===previous+1?run+a.hopSeconds:a.hopSeconds;longest=Math.max(longest,run);}else run=0;previous=i;}
   const sustain=levels.filter(v=>v>max*.8).length/levels.length;
   Object.assign(out,{source:'spectral',confidence:Math.min(voice.source==='isolated'?.9:.65,mean(usable.map(i=>voice.confidence[i]))),energy,peak:max,peakAt:peakIndex*a.hopSeconds,rise,sustain});
   if(max>.62&&max>mid*1.55&&longest>=.18)out.kind='shout';
   else if(energy<mid*.68&&max<.5)out.kind='whisper';
   else if(rise>2.2||mean(last.map(i=>voice.energy[i]))>mean(first.map(i=>voice.energy[i]))*1.5)out.kind='rising';
   else if(duration>1.25&&sustain>.72)out.kind='sustained';
  }
 }
 if(override!=='auto')Object.assign(out,{kind:override,source:'manual',confidence:1});
 return out;
}
export function lineDelivery(a:Analysis,words:Word[],events:SceneEvent[]=[]){const override=events.find(e=>e.type==='focus'&&e.delivery&&e.delivery!=='auto'&&words.some(w=>w.id===e.wordId))?.delivery;return vocalDelivery(a,words,override);}
export function voiceLevel(a:Analysis,t:number){return a.voice?clamp((sample(a.voice.energy,a.hopSeconds,t-.04)+2*sample(a.voice.energy,a.hopSeconds,t)+sample(a.voice.energy,a.hopSeconds,t+.04))/4):0;}

// Word timing owns the effect's lifetime. Repeated letters are an optional
// lyrical hint; an ordinary spelling also works when its vocal note is held.
export function wordSustain(a:Analysis,word:Word,t:number,override:Delivery='auto'){
 const duration=word.end-word.start,age=t-word.start;
 if(age<0||t>=word.end||duration<.6||override==='neutral')return 0;
 const repeated=/(\p{L})\1{2,}/iu.test(word.text.normalize('NFC'));
 if(override!=='sustained'&&!repeated&&duration<Math.max(1.05,Math.min(1.5,96/(a.bpm||120))))return 0;
 let presence=1;
 if(a.voice&&override!=='sustained'){
  const v=a.voice,from=Math.floor(word.start/a.hopSeconds),to=Math.ceil(word.end/a.hopSeconds);let voiced=0,run=0,longest=0;
  for(let i=from;i<to;i++){if(v.presence[i]>.18&&v.confidence[i]>.2&&v.energy[i]>.015){voiced++;run++;longest=Math.max(longest,run);}else run=0;}
  if(voiced/Math.max(1,to-from)<.65||longest*a.hopSeconds<Math.min(.45,duration*.35))return 0;
  presence=smooth((sample(v.presence,a.hopSeconds,t)-.15)/.25)*smooth((sample(v.confidence,a.hopSeconds,t)-.15)/.25)*smooth(voiceLevel(a,t)/.06);
 }
 const delivery=vocalDelivery(a,[word]);
 if(override!=='sustained'&&!repeated&&(delivery.source!=='spectral'||delivery.sustain<.72))return 0;
 const envelope=Math.min(smooth(age/.2),smooth((word.end-t)/.16));
 return presence*envelope*(.3+.7*smooth(age/duration))*(a.voice?.energy.length?.45+.55*voiceLevel(a,t):.65);
}
