// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Project,Scene,SceneEvent,Word,Analysis,Point}from'./model';
import{normalize}from'./model';
import{wordEmphasis,analyzeMeaning}from'./semantics';
import{filmFont,textWidth,type Language}from'./language';
import{clamp,smooth,easeOut,mix,n,esc}from'./math';
import{vocalDelivery,voiceLevel,type VocalDelivery}from'./voice';
import{cameraRecipes,rhythmRecipes}from'./catalog';
import{typeWidth,typographyFor,type Typography}from'./typography';
import{beatResponse}from'./beat';
export interface LyricFocus {event:SceneEvent;anchor:Word;words:Word[];start:number;end:number;amount:number;mode:'phrase'|'word';delivery:VocalDelivery;}
const emphasis:Record<string,number>={ve:16,coracoes:13,coracao:13,constelacoes:9,estrelas:7,correr:12,ficar:10,livre:12,chamar:13,esconder:14,alma:11,caio:11,levanto:12,fugir:15,encontrar:12,pequeno:10,ninguem:10,emocoes:12,vontade:12,controlar:14,descansar:17,sei:6};
function phraseFor(scene:Scene,words:Word[],anchor:Word){return words.filter(w=>w.line===anchor.line&&scene.wordIds.includes(w.id));}
function windowFor(scene:Scene,words:Word[],anchor:Word,event:SceneEvent){
 const line=phraseFor(scene,words,anchor),fast=event.focusMode==='word',start=Math.max(scene.start+.025,anchor.start-(fast?.12:.22));
 const lineEnd=line.at(-1)?.end??anchor.end,end=Math.min(scene.end-.025,Math.max(anchor.end+.18,Math.min(lineEnd+.24,anchor.start+event.duration)));
 return{line,start,end};
}
// Only selected meanings become close-ups. The gaps preserve scenes and let
// a wide shot breathe before the next vocal emphasis. Word IDs are the clock.
export function planLyricFocus(scenes:Scene[],words:Word[],language:Language='auto',analysis?:Analysis):Scene[]{
 let previousEnd=-10;
 return scenes.map(s=>{
  const events=s.events.filter(e=>e.type!=='focus'),ws=words.filter(w=>s.wordIds.includes(w.id));
  if(s.end-s.start<.55||!ws.length)return{...s,events};
  const candidates=ws.map(w=>{
   const key=normalize(w.text),line=phraseFor(s,words,w),alone=line.length===1;
   const meaning=analyzeMeaning(w.text,language),negative=meaning.hits.some(h=>h.concept==='refusal');
   const score=negative?(alone?100:0):Math.max(emphasis[key]??0,wordEmphasis(w.text,language))+(s.kind==='television'?1:0);
   const mode=alone||key==='constelacoes'||meaning.kind==='rest'||meaning.kind==='corridor'?'word' as const:'phrase' as const;
   const anchor=analysis&&mode==='phrase'?line[0]:w;
   const event:SceneEvent={at:anchor.start,duration:mode==='word'?1.4:analysis?Math.min(12,(line.at(-1)?.end??anchor.end)-anchor.start+.5):2.6,type:'focus',strength:1,wordId:anchor.id,focusMode:mode};
   return{w:anchor,score,event,window:windowFor(s,words,anchor,event)};
  });
  if(analysis)for(const line of new Set(ws.map(w=>w.line))){
   const phrase=ws.filter(w=>w.line===line),delivery=vocalDelivery(analysis,phrase),w=phrase[0];
   // Whole-line vocal emphasis outranks lexical hints, including unknown lyrics.
   if(phrase.length&&((delivery.source==='spectral'&&delivery.kind!=='neutral')||!candidates.some(c=>c.w.line===line&&c.score>8))){
    const event:SceneEvent={type:'focus',at:w.start,duration:Math.min(12,phrase.at(-1)!.end-w.start+.5),strength:1,wordId:w.id,focusMode:'phrase'};
    candidates.push({w,score:delivery.kind==='shout'?150:delivery.kind==='neutral'?8:60,event,window:windowFor(s,words,w,event)});
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.w.start-b.w.start);
  const selected:typeof candidates=[];
  for(const c of candidates){if(c.score<=5||c.window.end-c.window.start<=.48||c.window.start<previousEnd+.55||selected.some(x=>c.window.start<x.window.end+.45&&c.window.end>x.window.start-.45))continue;selected.push(c);if(selected.length>=(analysis?.voice?Math.max(1,Math.min(3,Math.floor((s.end-s.start)/2.1))):1))break;}
  selected.sort((a,b)=>a.window.start-b.window.start);
  for(const c of selected){events.push(c.event);previousEnd=c.window.end;}
  return{...s,camera:{...s.camera,lyricFocus:s.camera.lyricFocus??1},events};
 });
}
export function evaluateLyricFocus(p:Project,s:Scene,t:number):LyricFocus|undefined{
 const intensity=s.camera.lyricFocus??1;if(intensity<=0)return;
 let best:LyricFocus|undefined;
 for(const event of s.events.filter(e=>e.type==='focus')){
  const anchor=p.words.find(w=>w.id===event.wordId);if(!anchor)continue;
  const{line,start,end}=windowFor(s,p.words,anchor,event);if(t<start||t>=end)continue;
  const mode=event.focusMode??'phrase',delivery=vocalDelivery(p.analysis,line,event.delivery),rhythm=s.performance?.enabled?rhythmRecipes.find(r=>r.id===s.performance?.rhythm):undefined,ramp=Math.min(delivery.kind==='shout'?.085:delivery.kind==='whisper'?.32:rhythm?.attack??(mode==='word'?.15:.24),(end-start)*.24),release=Math.min(delivery.kind==='sustained'?.4:rhythm?.release??.26,(end-start)*.25);
  const envelope=Math.min(smooth((t-start)/ramp),smooth((end-t)/release)),amount=envelope*clamp(event.strength)*intensity;
  const cue={event,anchor,words:mode==='word'?[anchor]:line,start,end,amount,mode,delivery};
  if(!best||best.amount<amount)best=cue;
 }
 return best;
}
interface LayoutWord {word:Word;x:number;y:number;size:number;}
export function focusLayout(cue:LyricFocus,w:number,h:number,type:Typography=typographyFor()):LayoutWord[]{
 const horizontal=w>h,maxChars=cue.mode==='word'?100:horizontal?27:17,rows:Word[][]=[[]];
 for(const word of cue.words){const row=rows.at(-1)!;if(row.length&&row.reduce((n,w)=>n+typeWidth(w.text,type)/.61,0)+row.length+typeWidth(word.text,type)/.61>maxChars)rows.push([]);rows.at(-1)!.push(word);}
 const space=typeWidth(' ',type),lengths=rows.map(row=>row.reduce((a,x)=>a+typeWidth(x.text,type),0)+(row.length-1)*space),longest=Math.max(1,...lengths);
 const size=Math.min(w*(cue.mode==='word'?.34:.18),h*(cue.mode==='word'?.29:.17),w*.77/longest,h*.55/(rows.length*1.3)),lineHeight=size*1.3;
 const center=h*(horizontal?.52:.5),baseY=center-(rows.length-1)*lineHeight*.5+size*.3;
 return rows.flatMap((row,r)=>{let x=(w-lengths[r]*size)/2;return row.map(word=>{const item={word,x,y:baseY+r*lineHeight,size};x+=(typeWidth(word.text,type)+space)*size;return item;});});
}
export function phraseProjection(p:Project,s:Scene,t:number,w:number,h:number,cue:LyricFocus){
 const recipe=cameraRecipes.find(c=>c.id===s.performance?.camera)??cameraRecipes[3],rhythm=rhythmRecipes.find(r=>r.id===s.performance?.rhythm)??rhythmRecipes[0],type=typographyFor(s.performance?.typography),layout=focusLayout(cue,w,h,type);
 const enabled=s.performance?.enabled??true,intensity=enabled?(s.performance?.intensity??.7):0,age=t-cue.start,rotate=smooth((age-rhythm.delay)/.6)*cue.amount;
 const delivery=cue.delivery,burst=delivery.kind==='shout'?Math.exp(-Math.max(0,t-delivery.peakAt)*7)*smooth(Math.max(0,t-delivery.peakAt)/.035):0;
 const yaw=recipe.yaw*rotate*intensity,pitch=recipe.pitch*rotate*intensity,roll=recipe.roll*rotate*intensity,level=voiceLevel(p.analysis,t);
 const beat=enabled?beatResponse(p.analysis,t)*(s.performance?.beatSync??.65):0;
 const zoom=1+intensity*(recipe.depth*cue.amount+burst*.11+(delivery.kind==='rising'?smooth(age/Math.max(.2,cue.end-cue.start))*.045:0)+level*.012+beat*.025),focal=Math.min(w,h)*2.8,cx=w*.5,cy=h*.5;
 const raw=(x:number,y:number):Point=>{
  x=(x-cx)*zoom;y=(y-cy)*zoom;
  const xx=x*Math.cos(yaw),z=-x*Math.sin(yaw),yy=y*Math.cos(pitch)-z*Math.sin(pitch),zz=y*Math.sin(pitch)+z*Math.cos(pitch),perspective=focal/Math.max(focal*.5,focal-zz);
  return[cx+(xx*Math.cos(roll)-yy*Math.sin(roll))*perspective+w*recipe.x*rotate*intensity,cy+(xx*Math.sin(roll)+yy*Math.cos(roll))*perspective+h*recipe.y*rotate*intensity];
 };
 const corners=layout.flatMap(item=>{const right=item.x+typeWidth(item.word.text,type)*item.size;return[[item.x-item.size*.1,item.y-item.size*1.04],[right+item.size*.12,item.y-item.size*1.04],[right+item.size*.12,item.y+item.size*.32],[item.x-item.size*.1,item.y+item.size*.32]].map(([x,y])=>raw(x,y));});
 const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 // Fit the projected plane, not only its flat source rectangle. All camera
 // recipes retain a safe title area even on long lines and extreme aspect ratios.
 const fit=Math.min(1,w*.86/Math.max(1,right-left),h*.72/Math.max(1,bottom-top)),centerX=(left+right)/2,centerY=(top+bottom)/2;
 const targetX=clamp(centerX,w*.07+(right-left)*fit/2,w*.93-(right-left)*fit/2),targetY=clamp(centerY,h*.14+(bottom-top)*fit/2,h*.86-(bottom-top)*fit/2);
 const project=(x:number,y:number):Point=>{const v=raw(x,y);return[targetX+(v[0]-centerX)*fit,targetY+(v[1]-centerY)*fit];};
 return{layout,type,project,yaw,pitch,zoom,corners:corners.map(v=>[targetX+(v[0]-centerX)*fit,targetY+(v[1]-centerY)*fit]as Point)};
}
export function renderLyricFocus(p:Project,s:Scene,t:number,w:number,h:number,cue:LyricFocus){
 const u=Math.min(w,h)/1080,a=cue.amount,travel=easeOut(a),projection=phraseProjection(p,s,t,w,h,cue),{layout,type,project}=projection,words=cue.words;
 const charCount=words.reduce((sum,w)=>sum+textWidth(w.text)+.61,0),small=Math.min(34*u,w*.8/(charCount)),total=charCount*small*.61;
 let cursor=(w-total)/2;
 const active=words.find(w=>t>=w.start&&t<w.end)??cue.anchor;
 let out=`<g data-lyric-focus="${esc(cue.anchor.id)}" data-focus-amount="${n(a)}" data-delivery="${cue.delivery.kind}" data-phrase-3d="${n(projection.yaw)} ${n(projection.pitch)}" aria-label="${esc(words.map(w=>w.text).join(' '))}" opacity="${n(smooth(a/.28))}">`;
 for(const item of layout){
  const{x,y,size,word}=item,startX=cursor,startY=h*.834;
  cursor+=(textWidth(word.text)+.61)*small;
  const sizeNow=mix(small,size,travel),target=project(x,y),dx=project(x+1,y),dy=project(x,y+1),xx=mix(startX,target[0],travel),yy=mix(startY,target[1],travel),isActive=word.id===active.id;
  const attack=clamp((t-word.start)/.11),stretch=isActive?1+Math.sin(attack*Math.PI)*.035:1;
  const color=isActive?p.style.accent:p.style.foreground,alpha=t>=word.start?.98:.54;
  out+=`<g transform="matrix(${n(mix(1,dx[0]-target[0],travel))} ${n((dx[1]-target[1])*travel)} ${n((dy[0]-target[0])*travel)} ${n(mix(1,dy[1]-target[1],travel))} ${n(xx)} ${n(yy)})"><g transform="scale(${n(type.width*stretch)} 1)"><text font-family="${type.face.family},Noto Sans CJK JP" font-kerning="none" font-weight="${type.face.weight}" font-style="${type.face.italic?'oblique':'normal'}" letter-spacing="${n(type.tracking*sizeNow)}" font-size="${n(sizeNow)}" fill="${type.outline&&!isActive?'none':color}" ${type.outline?`stroke="${color}" stroke-width="${n(sizeNow*.012)}"`:''} opacity="${alpha}">${esc(word.text)}</text>`;
  if(isActive){const width=typeWidth(word.text,type)/type.width*sizeNow;out+=`<path d="M0 ${n(sizeNow*.18)}H${n(width)}" stroke="${p.style.accent}" stroke-width="${n(Math.max(1.2*u,sizeNow*.013))}" opacity="${n(a*.6)}"/>`;if(cue.mode==='word')out+=`<rect x="${n(width+sizeNow*.12)}" y="${n(-sizeNow*.76)}" width="${n(sizeNow*.07)}" height="${n(sizeNow*.78)}" fill="${p.style.accent}" opacity="${n(a*.8)}"/>`;}
  out+='</g>';
  out+='</g>';
 }
 if(s.kind==='television'){
  for(let row=0;row<14;row++)out+=`<path d="M0 ${n((h*.32+row*h*.027+t*13)%h)}H${w}" stroke="${p.style.foreground}" opacity="${n(a*.018)}" stroke-width="${u}"/>`;
 }
 return out+'</g>';
}
