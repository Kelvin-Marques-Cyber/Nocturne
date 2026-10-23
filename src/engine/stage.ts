// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,Point} from './model';
import {n,rand,smooth} from './math';

export interface StageContext {p:Project;s:Scene;t:number;local:number;q:number;w:number;h:number;u:number;ground:number;beat:number;energy:number;accent:string;fg:string;}
export type Hero<C>=(c:C,x:number,y:number,scale?:number,ghost?:boolean,time?:number,contacts?:{left?:Point;right?:Point})=>string;
export type Words<C>=(c:C,text:string,x:number,y:number,size:number,progress:number)=>string;
const path=(d:string,color:string,opacity=.5,width=1)=>`<path d="${d}" fill="none" stroke="${color}" opacity="${n(opacity)}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;

// These are animated worlds, not alternate names for the same background.
// Hero and lettering remain the same shared preview/export renderers.
export function stageWorlds<C extends StageContext>(hero:Hero<C>,words:Words<C>){
 const caption=(c:C)=>words(c,c.s.accent,c.w*.5,c.h*.24,c.w*.065,Math.min(1,c.local));
 const floor=(c:C)=>path(`M${c.w*.08} ${c.ground}H${c.w*.92}`,c.fg,.25,1.2*c.u);
 const instrument=(c:C,kind:'guitar'|'piano'|'drums')=>{
  const x=c.w*.5,y=c.ground,scale=1.9,unit=scale*c.u*c.p.character.scale;
  const at=(px:number,py:number):Point=>[x+px*unit,y+py*unit];
  const strum=c.beat*(.3+c.energy*.7),fret=Math.sin(c.t*.85)*5*c.energy;
  const left:Point=kind==='guitar'?[48+fret,-183-fret*.7]:kind==='piano'?[-28+Math.sin(c.t*1.8)*8*c.energy,-143+strum*3]:[-35,-157+strum*19];
  const right:Point=kind==='guitar'?[5+strum*5,-147+strum*17]:kind==='piano'?[35+Math.sin(c.t*1.3)*10*c.energy,-143+strum*4]:[45,-151+strum*17];
  let prop='';
  if(kind==='guitar'){
   prop=`<path d="M-18 -165 C-48 -167 -46 -134 -30 -123 C-23 -112 -8 -112 2 -124 C23 -124 28 -145 12 -155 L65 -201 L72 -196 L83 -208 L72 -216 L61 -206 L5 -165 Q-5 -154 -18 -165Z" fill="${c.p.style.background}" stroke="${c.fg}" stroke-width="1.5"/>`;
   prop+=path('M-26 -146L70 -205 M-24 -143L72 -202 M-22 -140L74 -199',c.accent,.8,.55);
   prop+=`<ellipse cx="-9" cy="-144" rx="9" ry="12" fill="${c.accent}" opacity=".12"/>`+path('M-16 -135L-2 -148 M-27 -133L-15 -125',c.fg,.7,1.7);
   for(let i=0;i<7;i++){const xx=17+i*6,yy=-168-i*5;prop+=path(`M${xx} ${yy}l6 6`,c.fg,.5,.6);}
   prop+=path(`M-40 -155Q-14 -177 9 -161 M-44 -150Q-13 -186 14 -159`,c.accent,strum*.5,.8);
  }else if(kind==='piano'){
   prop=`<path d="M-73 -146H76V-120H-73Z" fill="${c.fg}" stroke="${c.fg}" stroke-width="1.2"/>`;
   for(let i=0;i<21;i++){const xx=-72+i*7;prop+=path(`M${xx} -145v24`,c.p.style.background,.8,.7);if(![2,6].includes(i%7))prop+=`<rect x="${xx+4}" y="-146" width="4" height="15" fill="${c.p.style.background}"/>`;}
   prop+=path('M-63 -120L-40 0 M63 -120L40 0 M-53 -75H53',c.fg,.65,2);
   prop+=`<rect x="${n(-31+Math.sin(c.t*1.8)*8*c.energy)}" y="-142" width="6" height="19" fill="${c.accent}" opacity="${n(.2+strum*.7)}"/><rect x="${n(31+Math.sin(c.t*1.3)*10*c.energy)}" y="-142" width="6" height="19" fill="${c.accent}" opacity="${n(.15+strum*.65)}"/>`;
  }else{
   prop=`<circle cx="0" cy="-46" r="42" fill="${c.p.style.background}" stroke="${c.fg}" stroke-width="1.8"/><circle cx="0" cy="-46" r="${n(26+strum*7)}" fill="none" stroke="${c.accent}" opacity="${n(.25+strum*.4)}"/>`;
   for(const side of [-1,1]){const xx=side*37;prop+=`<path d="M${xx-23} -137v34q23 9 46 0v-34Z" fill="${c.p.style.background}" stroke="${c.fg}"/><ellipse cx="${xx}" cy="-137" rx="23" ry="7" fill="${c.p.style.background}" stroke="${c.accent}"/>`;}
   prop+=path('M-74 -154V0 M77 -158V0 M-93 0h38 M58 0h38',c.fg,.6,1.2);
   prop+=`<ellipse cx="-74" cy="-155" rx="27" ry="4" transform="rotate(${n(-4+strum*8)} -74 -155)" fill="${c.accent}" opacity=".65"/><ellipse cx="77" cy="-160" rx="31" ry="4" transform="rotate(${n(5-strum*9)} 77 -160)" fill="${c.accent}" opacity=".65"/>`;
   prop+=path(`M${n(left[0])} ${n(left[1])}l-7 ${n(23-strum*8)} M${n(right[0])} ${n(right[1])}l14 ${n(16-strum*7)}`,c.fg,.95,1.8);
  }
  // Contacts and instruments use the identical character scale. Hands are
  // constrained after lyric gestures, so fingers remain on the instrument.
  const strap=kind==='guitar'?`<g transform="translate(${n(x)} ${n(y)}) scale(${n(unit)})">${path('M-4 -201L-27 -143L20 -135',c.accent,.55,2)}</g>`:'';
  let out=floor(c)+strap+hero(c,x,y,scale,false,c.t,{left:at(...left),right:at(...right)});
  out+=`<g data-instrument="${kind}" data-contact-left="${n(left[0])} ${n(left[1])}" data-contact-right="${n(right[0])} ${n(right[1])}" transform="translate(${n(x)} ${n(y)}) scale(${n(unit)})">${prop}<circle cx="${n(left[0])}" cy="${n(left[1])}" r="2.3" fill="${c.fg}"/><circle cx="${n(right[0])}" cy="${n(right[1])}" r="2.3" fill="${c.fg}"/></g>`;
  for(let i=0;i<4;i++)out+=path(`M${n(c.w*(.16+i*.22))} ${c.h*.29}L${n(c.w*(.3+i*.13))} ${c.ground}`,c.accent,.04+c.beat*.04,12*c.u);
  return caption(c)+out;
 };
 return {
  guitar:(c:C)=>instrument(c,'guitar'),piano:(c:C)=>instrument(c,'piano'),drums:(c:C)=>instrument(c,'drums'),
  bridge:(c:C)=>{
   let out='',x=c.w*(.3+smooth(c.q)*.4);
   for(const side of [-1,1]){const yy=c.ground+side*17*c.u;out+=path(`M${c.w*.08} ${yy}H${c.w*.92}`,c.fg,.45,1.5*c.u);out+=path(`M${c.w*.08} ${yy-170*c.u}Q${c.w*.5} ${yy-10*c.u} ${c.w*.92} ${yy-170*c.u}`,c.accent,.6,1.3*c.u);}
   for(let i=0;i<19;i++){const xx=c.w*(.08+i*.84/18),sag=Math.sin(i/18*Math.PI)*66*c.u;out+=path(`M${xx} ${c.ground-170*c.u+sag}V${c.ground+17*c.u} M${xx-8*c.u} ${c.ground-17*c.u}l16 ${34*c.u}`,c.fg,.25,c.u);}
   out+=path(`M0 ${c.h*.84}Q${c.w*.4} ${c.h*(.81+Math.sin(c.t*.4)*.01)} ${c.w} ${c.h*.85}`,c.accent,.15,c.u);
   return caption(c)+out+hero(c,x,c.ground,1.35);
  },
  forest:(c:C)=>{
   let out='';for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
    const xx=c.w*(i/7)+Math.sin(c.t*.12+layer)*c.w*.012*(layer+1),height=c.h*(.32+rand(i*37+layer*151+c.p.seed)*.23),yy=c.ground-layer*18*c.u;
    out+=path(`M${xx} ${yy}v${-height} M${xx} ${yy-height*.65}l${-38*(layer+1)*c.u} ${-height*.18} M${xx} ${yy-height*.78}l${34*(layer+1)*c.u} ${-height*.14}`,c.fg,.1+layer*.12,(layer+1)*c.u);
   }return caption(c)+out+floor(c)+hero(c,c.w*.51,c.ground,1.45);
  },
  city:(c:C)=>{
   let out='';for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
    const ww=c.w*.13,xx=i*ww-c.w*.04+Math.sin(c.t*.09)*layer*10*c.u,hh=c.h*(.16+rand(c.p.seed+i*19+layer*61)*.31),yy=c.ground-layer*26*c.u;
    out+=`<rect x="${n(xx)}" y="${n(yy-hh)}" width="${n(ww*.88)}" height="${n(hh)}" fill="${c.p.style.background}" stroke="${c.fg}" stroke-opacity="${.08+layer*.1}"/>`;
    for(let j=0;j<8;j++){const light=.08+.12*(1+Math.sin(c.t*.5+i+j));out+=`<rect x="${n(xx+ww*.2+(j%2)*ww*.34)}" y="${n(yy-hh+20*c.u+Math.floor(j/2)*hh*.2)}" width="${8*c.u}" height="${11*c.u}" fill="${c.accent}" opacity="${n(light)}"/>`;}
   }return caption(c)+out+floor(c)+hero(c,c.w*.5,c.ground,1.4);
  },
  desert:(c:C)=>{
   let out='';for(let i=0;i<5;i++){const yy=c.h*(.49+i*.055),drift=Math.sin(c.t*.2+i)*c.w*.025;out+=path(`M${-c.w*.1} ${yy}Q${c.w*.25+drift} ${yy-c.h*.09} ${c.w*.58} ${yy}T${c.w*1.1} ${yy}`,i%2?c.accent:c.fg,.12+i*.04,(1+i*.2)*c.u);}
   out+=`<circle cx="${c.w*.74}" cy="${c.h*.34}" r="${c.w*.08}" fill="none" stroke="${c.accent}" opacity=".45"/>`;
   return caption(c)+out+floor(c)+hero(c,c.w*(.38+.13*smooth(c.q)),c.ground,1.35);
  },
  staircase:(c:C)=>{
   let out='',step=c.w*.075,rise=c.h*.025;
   for(let i=0;i<10;i++){const xx=c.w*.12+i*step,yy=c.ground-i*rise;out+=path(`M${xx} ${yy+rise}V${yy}h${step}l${step*.55} ${-rise*.5}h${-step}`,i%2?c.fg:c.accent,.45,1.4*c.u);}
   const level=smooth(c.q)*7,x=c.w*.16+level*step,y=c.ground-level*rise;
   // A moving tread stays beneath both feet throughout the ascent.
   out+=path(`M${x-46*c.u} ${y}h${92*c.u}`,c.fg,.9,2*c.u);
   return caption(c)+out+hero(c,x,y,1.3);
  },
  cage:(c:C)=>{
   let out='',cx=c.w*.5,top=c.h*.36,bottom=c.ground+15*c.u,open=smooth(c.q)*c.w*.16;
   out+=`<ellipse cx="${cx}" cy="${top}" rx="${c.w*.28}" ry="${c.h*.045}" fill="none" stroke="${c.fg}" opacity=".4"/>`;
   for(let i=0;i<9;i++){const xx=cx+(i-4)*c.w*.055+(i<4?-open:i>4?open:open*.7);out+=path(`M${xx} ${top}V${bottom}`,c.fg,.24+(i%2)*.15,2*c.u);}
   return caption(c)+hero(c,cx,c.ground,1.4)+out+floor(c);
  },
  eclipse:(c:C)=>{
   const x=c.w*.5,y=c.h*.4,r=c.w*.2;let out='';
   for(let i=0;i<9;i++)out+=`<circle cx="${x}" cy="${y}" r="${n(r*(1+i*.035)+c.beat*3*c.u)}" fill="none" stroke="${c.accent}" opacity="${n(.12/(1+i*.35))}"/>`;
   out+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${c.fg}" opacity=".8"/><circle cx="${n(x+(smooth(c.q)-.5)*r*2.6)}" cy="${y-r*.07}" r="${r*.97}" fill="${c.p.style.background}"/>`;
   return caption(c)+out+hero(c,c.w*.5,c.ground,1.25)+floor(c);
  },
  prism:(c:C)=>{
   const x=c.w*.48,y=c.h*.43,r=c.w*.16;let out=path(`M0 ${y}H${x-r*.65}`,c.fg,.65,2*c.u);
   out+=`<path d="M${x} ${y-r}L${x-r} ${y+r}H${x+r}Z" fill="${c.accent}" fill-opacity=".035" stroke="${c.fg}" stroke-opacity=".7" stroke-width="${1.6*c.u}"/>`;
   ['#ed3e43','#e9a747','#dddc69','#7acb9a','#769ed7'].forEach((color,i)=>{out+=path(`M${x+r*.5} ${y}L${c.w*.94} ${y+(i-2)*c.h*(.035+c.beat*.008)}`,color,.4+c.energy*.2,1.4*c.u);});
   return caption(c)+out+hero(c,c.w*.34,c.ground,1.3)+floor(c);
  }
 };
}
