// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,Point} from './model';
import type {Pose} from './rig';
import {gestureRecipes} from './catalog';
import {semanticGesture} from './director';
import {lineDelivery,voiceLevel} from './voice';
import {clamp,smooth,mix} from './math';

export function expressivePose(base:Pose,p:Project,s:Scene,t:number):{pose:Pose;gesture?:string}{
 const performance=s.performance;if(!performance?.enabled||performance.intensity<=0)return{pose:base};
 const recipe=gestureRecipes.find(g=>g.id===performance.gesture)!;
 const words=p.words.filter(w=>s.wordIds.includes(w.id));
 const motion=s.motions.find(m=>t>=m.start&&t<m.end),current=motion?.action;
 // Physical locomotion and load-bearing hands keep their original constraints.
 const protectedAction=current&&['fall','crawl','push','drag','brace','run','stumble'].includes(current);
 if(protectedAction)return{pose:base};
 const motionFade=motion?Math.min(smooth((t-motion.start)/.3),smooth((motion.end-t)/.3)):1;
 const targets:Record<string,[Point,Point,number]>={
  question:[[-59,55],[56,58],-8],refuse:[[-52,8],[58,21],-12],appeal:[[-16,24],[19,18],-10],explain:[[-53,58],[60,40],4],protect:[[16,29],[-13,43],9],listen:[[-24,82],[36,-17],-12],resolve:[[-22,82],[43,39],-3],grieve:[[-12,66],[17,68],14],welcome:[[-65,36],[66,34],-5],release:[[-52,76],[53,74],5],point:[[-20,82],[43,-43],-7],search:[[-24,80],[53,-14],-13],
  offer:[[-37,61],[48,60],5],remember:[[-26,72],[24,-12],-9],shield:[[-29,5],[33,17],-11],doubt:[[-38,29],[36,-4],-15],promise:[[-19,34],[39,11],-4],reachout:[[-18,78],[68,24],8],carry:[[-38,66],[40,67],12],farewell:[[-20,80],[48,-28],-6]
 };
 const layers=[...new Set(words.map(w=>w.line))].flatMap(id=>{
  const line=words.filter(w=>w.line===id),start=line[0].start,end=line.at(-1)!.end;
  const envelope=Math.min(smooth((t-start+.18)/(.36/recipe.speed)),smooth((end+.32-t)/.35));if(envelope<=0)return[];
  const delivery=lineDelivery(p.analysis,line,s.events),gesture=performance.followLyrics===false?recipe.kind:semanticGesture(line.map(w=>w.text).join(' '),recipe.kind);
  const weight=clamp(envelope*recipe.amount*performance.intensity*(delivery.kind==='shout'?1:delivery.kind==='whisper'?.6:.8)*(current==='walk'?.18:1))*motionFade;
  return[{gesture,weight,line}];
 });
 if(!layers.length)return{pose:base};
 // Neighboring sentence performances overlap and crossfade instead of
 // switching when the current word changes ownership at a boundary.
 const sum=layers.reduce((n,l)=>n+l.weight,0),normalizer=Math.max(1,sum),pose={...base,leftHand:[...base.leftHand]as Point,rightHand:[...base.rightHand]as Point,head:[...base.head]as Point};
 for(const layer of layers){const{gesture,line}=layer,weight=layer.weight/normalizer,[left,right,tilt]=targets[gesture];
  for(const [key,target]of [['leftHand',left],['rightHand',right]]as const){pose[key][0]+=(base.neck[0]+target[0]-base[key][0])*weight;pose[key][1]+=(base.neck[1]+target[1]-base[key][1])*weight;}
  const active=line.find(w=>t>=w.start&&t<w.end),wordProgress=active?clamp((t-active.start)/Math.max(.1,active.end-active.start)):0,emphasis=Math.sin(wordProgress*Math.PI)*voiceLevel(p.analysis,t);
  pose.head[0]+=weight*(gesture==='search'?-6:gesture==='point'?5:2);pose.head[1]+=weight*(gesture==='grieve'?8:-1-emphasis*1.5);pose.tilt+=(tilt-base.tilt)*weight;
 }
 const gesture=layers.reduce((a,b)=>a.weight>b.weight?a:b).gesture;
 // Feet, pelvis and body rotation are untouched: gestures are sentence-shaped
 // upper-body performances, never beat-driven dance loops.
 return{pose,gesture};
}
