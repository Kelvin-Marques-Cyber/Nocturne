// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Project,Scene,SceneEvent,Word}from'./model';
import{normalize}from'./model';
import{wordEmphasis,analyzeMeaning}from'./semantics';
import{filmFont,textWidth,type Language}from'./language';
import{clamp,smooth,easeOut,mix,n,esc}from'./math';
export interface LyricFocus {event:SceneEvent;anchor:Word;words:Word[];start:number;end:number;amount:number;mode:'phrase'|'word';}
const emphasis:Record<string,number>={ve:16,coracoes:13,coracao:13,constelacoes:9,estrelas:7,correr:12,ficar:10,livre:12,chamar:13,esconder:14,alma:11,caio:11,levanto:12,fugir:15,encontrar:12,pequeno:10,ninguem:10,emocoes:12,vontade:12,controlar:14,descansar:17,sei:6};
function phraseFor(scene:Scene,words:Word[],anchor:Word){return words.filter(w=>w.line===anchor.line&&scene.wordIds.includes(w.id));}
function windowFor(scene:Scene,words:Word[],anchor:Word,event:SceneEvent){
 const line=phraseFor(scene,words,anchor),fast=event.focusMode==='word',start=Math.max(scene.start+.025,anchor.start-(fast?.12:.22));
 const lineEnd=line.at(-1)?.end??anchor.end,end=Math.min(scene.end-.025,Math.max(anchor.end+.18,Math.min(lineEnd+.24,anchor.start+event.duration)));
 return{line,start,end};
}
// Only selected meanings become close-ups. The gaps preserve scenes and let
// a wide shot breathe before the next vocal emphasis. Word IDs are the clock.
export function planLyricFocus(scenes:Scene[],words:Word[],language:Language='auto'):Scene[]{
 let previousEnd=-10;
 return scenes.map(s=>{
  const events=s.events.filter(e=>e.type!=='focus'),ws=words.filter(w=>s.wordIds.includes(w.id));
  if(s.end-s.start<.55||!ws.length)return{...s,events};
  const candidates=ws.map(w=>{
   const key=normalize(w.text),line=phraseFor(s,words,w),alone=line.length===1;
   const meaning=analyzeMeaning(w.text,language),negative=meaning.hits.some(h=>h.concept==='refusal');
   const score=negative?(alone?100:0):Math.max(emphasis[key]??0,wordEmphasis(w.text,language))+(s.kind==='television'?1:0);
   const mode=alone||key==='constelacoes'||meaning.kind==='rest'||meaning.kind==='corridor'?'word' as const:'phrase' as const;
   const event:SceneEvent={at:w.start,duration:mode==='word'?1.4:2.6,type:'focus',strength:1,wordId:w.id,focusMode:mode};
   return{w,score,event,window:windowFor(s,words,w,event)};
  }).filter(c=>c.score>5&&c.window.end-c.window.start>.48).sort((a,b)=>b.score-a.score||a.w.start-b.w.start);
  const chosen=candidates.find(c=>c.window.start>=previousEnd+.8);
  if(chosen){events.push(chosen.event);previousEnd=chosen.window.end;}
  return{...s,camera:{...s.camera,lyricFocus:s.camera.lyricFocus??1},events};
 });
}
export function evaluateLyricFocus(p:Project,s:Scene,t:number):LyricFocus|undefined{
 const intensity=s.camera.lyricFocus??1;if(intensity<=0)return;
 let best:LyricFocus|undefined;
 for(const event of s.events.filter(e=>e.type==='focus')){
  const anchor=p.words.find(w=>w.id===event.wordId);if(!anchor)continue;
  const{line,start,end}=windowFor(s,p.words,anchor,event);if(t<start||t>=end)continue;
  const mode=event.focusMode??'phrase',ramp=Math.min(mode==='word'?.15:.24,(end-start)*.24),release=Math.min(.26,(end-start)*.25);
  const envelope=Math.min(smooth((t-start)/ramp),smooth((end-t)/release)),amount=envelope*clamp(event.strength)*intensity;
  const cue={event,anchor,words:mode==='word'?[anchor]:line,start,end,amount,mode};
  if(!best||best.amount<amount)best=cue;
 }
 return best;
}
interface LayoutWord {word:Word;x:number;y:number;size:number;}
export function focusLayout(cue:LyricFocus,w:number,h:number):LayoutWord[]{
 const horizontal=w>h,maxChars=cue.mode==='word'?100:horizontal?27:17,rows:Word[][]=[[]];
 for(const word of cue.words){const row=rows.at(-1)!;if(row.length&&row.reduce((n,w)=>n+textWidth(w.text)/.61,0)+row.length+textWidth(word.text)/.61>maxChars)rows.push([]);rows.at(-1)!.push(word);}
 const lengths=rows.map(row=>row.reduce((a,x)=>a+textWidth(x.text),0)+(row.length-1)*.61),longest=Math.max(1,...lengths);
 const size=Math.min(w*(cue.mode==='word'?.37:.19),h*(cue.mode==='word'?.31:.18),w*.85/longest,h*.65/(rows.length*1.3)),lineHeight=size*1.3;
 const center=h*(horizontal?.52:.5),baseY=center-(rows.length-1)*lineHeight*.5+size*.3;
 return rows.flatMap((row,r)=>{let x=(w-lengths[r]*size)/2;return row.map(word=>{const item={word,x,y:baseY+r*lineHeight,size};x+=(textWidth(word.text)+.61)*size;return item;});});
}
export function renderLyricFocus(p:Project,s:Scene,t:number,w:number,h:number,cue:LyricFocus){
 const u=Math.min(w,h)/1080,a=cue.amount,travel=easeOut(a),layout=focusLayout(cue,w,h),words=cue.words;
 const charCount=words.reduce((sum,w)=>sum+textWidth(w.text)+.61,0),small=Math.min(34*u,w*.8/(charCount)),total=charCount*small*.61;
 let cursor=(w-total)/2;
 const active=words.find(w=>t>=w.start&&t<w.end)??cue.anchor;
 let out=`<g data-lyric-focus="${esc(cue.anchor.id)}" data-focus-amount="${n(a)}" opacity="${n(smooth(a/.28))}">`;
 for(const item of layout){
  const{x,y,size,word}=item,startX=cursor,startY=h*.834;
  cursor+=(textWidth(word.text)+.61)*small;
  const sizeNow=mix(small,size,travel),xx=mix(startX,x,travel),yy=mix(startY,y,travel),isActive=word.id===active.id;
  const attack=clamp((t-word.start)/.11),stretch=isActive?1+Math.sin(attack*Math.PI)*.035:1;
  const color=isActive?p.style.accent:p.style.foreground,alpha=t>=word.start?.98:.54;
  out+=`<g transform="translate(${n(xx)} ${n(yy)}) scale(${n(stretch)} 1)"><text font-family="${filmFont}" font-size="${n(sizeNow)}" fill="${color}" opacity="${alpha}">${esc(word.text)}</text>`;
  if(isActive){const width=textWidth(word.text)*sizeNow;out+=`<path d="M0 ${n(sizeNow*.18)}H${n(width)}" stroke="${p.style.accent}" stroke-width="${n(Math.max(1.2*u,sizeNow*.013))}" opacity="${n(a*.6)}"/>`;if(cue.mode==='word')out+=`<rect x="${n(width+sizeNow*.12)}" y="${n(-sizeNow*.76)}" width="${n(sizeNow*.07)}" height="${n(sizeNow*.78)}" fill="${p.style.accent}" opacity="${n(a*.8)}"/>`;}
  out+='</g>';
 }
 if(s.kind==='television'){
  for(let row=0;row<14;row++)out+=`<path d="M0 ${n((h*.32+row*h*.027+t*13)%h)}H${w}" stroke="${p.style.foreground}" opacity="${n(a*.018)}" stroke-width="${u}"/>`;
 }
 return out+'</g>';
}
