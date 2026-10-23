// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,Word,Point} from './model';
import {dimensions} from './model';
import {clamp,mix,smooth} from './math';
import {lineDelivery,type VocalDelivery} from './voice';
import {typographyFor,typeWidth,type Typography} from './typography';
import {cameraRecipes} from './catalog';

export type ReelLayout='cascade'|'desktop'|'dialog'|'world';
export interface ReelWord {word:Word;x:number;y:number;z:number;size:number;width:number;}
export interface ReelPhrase {words:Word[];start:number;end:number;delivery:VocalDelivery;nodes:ReelWord[];x:number;y:number;z:number;width:number;height:number;}
export interface ReelShot {start:number;end:number;layout:ReelLayout;phrases:ReelPhrase[];type:Typography;camera:typeof cameraRecipes[number];bounds:{x:number;y:number;width:number;height:number;z:number};intensity:number;turnAt:number;sign:number;}
export interface ReelCamera {x:number;y:number;distance:number;yaw:number;pitch:number;roll:number;focal:number;width:number;height:number;}
const cache=new WeakMap<Scene,{signature:string;words:Word[];analysis:Project['analysis'];shots:ReelShot[]}>();

function composition(s:Scene,phrases:Pick<ReelPhrase,'words'|'delivery'>[]):ReelLayout{
 if(!phrases.length)return'world';
 // Instrument and landscape renderers retain their identity, props and contacts.
 if(['terminal','television','hide','mirror'].includes(s.kind))return'desktop';
 if(['choice','door','denial'].includes(s.kind))return'dialog';
 if(['soul','echo','heart','constellation','orbit'].includes(s.kind)||phrases.some(p=>p.delivery.kind==='shout')&&!['guitar','piano','drums'].includes(s.kind))return'cascade';
 return'world';
}
function phraseNodes(words:Word[],size:number,maxWidth:number,type:Typography){
 const longest=Math.max(1,...words.map(w=>typeWidth(w.text,type)));
 size=Math.min(size,maxWidth/longest);
 const rows:Word[][]=[[]];let used=0;
 for(const word of words){const width=typeWidth(word.text,type)*size,space=used?typeWidth(' ',type)*size:0;if(used&&used+space+width>maxWidth){rows.push([]);used=0;}rows.at(-1)!.push(word);used+=width+(used?space:0);}
 const gap=typeWidth(' ',type)*size,lineHeight=size*1.28;
 return{height:rows.length*lineHeight,nodes:rows.flatMap((row,r)=>{const length=row.reduce((n,w)=>n+typeWidth(w.text,type)*size,0)+gap*(row.length-1);let x=-length/2;return row.map(word=>{const node={word,x,y:(r-(rows.length-1)/2)*lineHeight+size*.34,z:0,size,width:typeWidth(word.text,type)*size};x+=node.width+gap;return node;});})};
}
export function planReelShots(p:Project,s:Scene):ReelShot[]{
 const {width:w,height:h}=dimensions(p.format),u=Math.min(w,h)/1080,words=p.words.filter(word=>s.wordIds.includes(word.id));
 // Editing a word in place must invalidate the plan, not just replacing arrays.
 const signature=JSON.stringify([p.format,s.kind,s.start,s.end,s.variant,s.performance,s.events,words.map(w=>[w.id,w.text,w.line,w.start,w.end])]);
 const old=cache.get(s);if(old?.signature===signature&&old.words===p.words&&old.analysis===p.analysis)return old.shots;
 const lines=[...new Set(words.map(w=>w.line))].map(line=>words.filter(w=>w.line===line));
 const phrases=lines.map(words=>({words,start:words[0].start,end:Math.max(...words.map(w=>w.end)),delivery:lineDelivery(p.analysis,words,s.events)}));
 const layout=composition(s,phrases),type=typographyFor(s.performance?.typography),groups=layout==='world'?[phrases]:Array.from({length:Math.max(1,Math.ceil(phrases.length/4))},(_,i)=>phrases.slice(i*4,i*4+4));
 const intensity=s.performance?.enabled===false?0:s.performance?.intensity??.7;
 const shots=groups.map((group,index):ReelShot=>{
  const start=index?Math.max(s.start,group[0].start-.12):s.start,end=groups[index+1]?Math.max(start+.01,groups[index+1][0].start-.12):s.end;
  let y=0;
  const laid=group.map((phrase,i):ReelPhrase=>{
   const displaySize=layout==='cascade'?Math.min(240,Math.max(112,w*.72/Math.max(1,typeWidth(phrase.words.map(w=>w.text).join(' '),type))/u)):layout==='world'?76:66;
   const content=phraseNodes(phrase.words,displaySize*u,w*(layout==='desktop'?.66:layout==='dialog'?.72:.8),type);
   const x=layout==='desktop'?(i%2?1:-1)*w*.09:layout==='cascade'?((i%3)-1)*w*.075:0;
   const cy=layout==='world'?-h*.265:layout==='dialog'?-h*.055:y;
   const z=layout==='world'?70*u:(i%3)*36*u;
   if(layout==='cascade')y+=Math.max(220*u,content.height+105*u);else if(layout==='desktop')y+=Math.max(240*u,content.height+100*u);
   return{...phrase,x,y:cy,z,width:layout==='desktop'?w*.83:layout==='dialog'?w*.88:Math.max(1,...content.nodes.map(n=>n.width)),height:content.height+((layout==='desktop'||layout==='dialog')?140*u:0),nodes:content.nodes.map(n=>({...n,x:n.x+x,y:n.y+cy,z}))};
  });
  const left=Math.min(0,...laid.flatMap(p=>p.nodes.map(n=>n.x)),...laid.map(p=>p.x-p.width/2)),right=Math.max(0,...laid.flatMap(p=>p.nodes.map(n=>n.x+n.width)),...laid.map(p=>p.x+p.width/2));
  const top=Math.min(0,...laid.flatMap(p=>p.nodes.map(n=>n.y-n.size)),...laid.map(p=>p.y-p.height/2)),bottom=Math.max(0,...laid.flatMap(p=>p.nodes.map(n=>n.y+n.size*.3)),...laid.map(p=>p.y+p.height/2));
  const anchor=laid[0]?.start??start,turnAt=p.analysis.beats.find(b=>b>anchor+.22&&b<anchor+.85)??anchor+.55;
  return{start,end,layout,phrases:laid,type,camera:cameraRecipes.find(r=>r.id===s.performance?.camera)??cameraRecipes[0],bounds:{x:(left+right)/2,y:(top+bottom)/2,width:Math.max(1,right-left),height:Math.max(1,bottom-top),z:Math.max(0,...laid.map(p=>p.z))},intensity,turnAt,sign:(s.variant+index)%2?-1:1};
 });
 cache.set(s,{signature,words:p.words,analysis:p.analysis,shots});return shots;
}
export function reelShotAt(shots:ReelShot[],t:number){return shots.find(s=>t>=s.start&&t<s.end)??(t<shots[0].start?shots[0]:shots.at(-1)!);}
export function reelCamera(shot:ReelShot,t:number,w:number,h:number):ReelCamera{
 const phrases=shot.phrases,index=phrases.reduce((last,p,i)=>t>=p.start?i:last,0),phrase=phrases[index],previous=phrases[Math.max(0,index-1)]??phrase;
 const follow=phrase?smooth((t-phrase.start)/.52):0,spatial=shot.layout==='cascade'||shot.layout==='desktop';
 const last=phrases.at(-1),revealAt=last?Math.max(shot.start,Math.min(last.end,shot.end-.9)):shot.end;
 const reveal=spatial?smooth((t-revealAt)/Math.max(.1,shot.end-revealAt-.08)):0;
 let x=spatial&&phrase?mix(previous.x,phrase.x,follow):0,y=spatial&&phrase?mix(previous.y,phrase.y,follow):0;
 const focal=Math.min(w,h)*1.3,fit=Math.min(1.08,w*.74/shot.bounds.width,h*.70/shot.bounds.height),wideDistance=focal/fit+shot.bounds.z;
 let distance=focal/(shot.layout==='desktop'?.94:1.06)+Math.max(0,phrase?.z??0);
 x=mix(x,shot.bounds.x,reveal);y=mix(y,shot.bounds.y,reveal);distance=mix(distance,wideDistance,reveal);
 const turn=(smooth((t-shot.turnAt)/.19)-smooth((t-shot.turnAt-.28)/.75)*.3)*shot.intensity*(1-reveal*.6);
 const delivery=phrase?.delivery,peak=delivery?.kind==='shout'&&delivery.source!=='unavailable'?Math.exp(-Math.max(0,t-delivery.peakAt)*5)*smooth((t-delivery.peakAt)/.035):0;
 distance/=1+peak*.10*shot.intensity;
 const recipe=shot.camera,on=shot.intensity>0;
 distance/=1+recipe.depth*turn*.3;
 return{x:x+recipe.x*w*turn,y:y+recipe.y*h*turn,distance,yaw:on?shot.sign*(.025*shot.intensity+clamp(recipe.yaw*turn,-.14,.14)):0,pitch:on?-.016*shot.intensity+clamp(recipe.pitch*turn,-.08,.08):0,roll:on?clamp(recipe.roll*turn,-.035,.035):0,focal,width:w,height:h};
}
export function projectReelPoint(c:ReelCamera,point:[number,number,number]):Point{
 const dx=point[0]-c.x,dy=point[1]-c.y,dz=point[2],x=dx*Math.cos(c.yaw)+dz*Math.sin(c.yaw),z=-dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw),y=dy*Math.cos(c.pitch)-z*Math.sin(c.pitch),zz=dy*Math.sin(c.pitch)+z*Math.cos(c.pitch),scale=c.focal/Math.max(c.focal*.22,c.distance-zz);
 const xx=x*Math.cos(c.roll)-y*Math.sin(c.roll),yy=x*Math.sin(c.roll)+y*Math.cos(c.roll);
 return[c.width*.5+xx*scale,c.height*.46+yy*scale];
}
