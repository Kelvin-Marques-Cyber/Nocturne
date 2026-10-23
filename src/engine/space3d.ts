// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{n,pt,esc,rand,clamp,easeOut}from'./math';
import type{Point,Word}from'./model';
import{filmFont,textWidth,glyphWidth}from'./language';
type V3=[number,number,number];
export interface Space {width:number;height:number;time:number;local:number;seed:number;accent:string;fg:string;words:Word[];variant:number;energy:number;beat:number;}
export function projector(width:number,height:number,yaw:number,pitch:number,distance=1050,focal=1050){
 const u=Math.min(width,height)/1080;
 return(v:V3):Point=>{
  const x=v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),z=-v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw),y=v[1]*Math.cos(pitch)-z*Math.sin(pitch),zz=v[1]*Math.sin(pitch)+z*Math.cos(pitch),s=focal/Math.max(100,distance-zz);
  return[width*.51+x*s*u,height*.43+y*s*u];
 };
}
const quad=(p:(v:V3)=>Point,vs:V3[],fill:string,stroke:string,op=1)=>`<polygon points="${vs.map(v=>pt(p(v)).replace(' ', ',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="${n(op)}"/>`;
const edge=(p:(v:V3)=>Point,a:V3,b:V3,color:string,op=.4)=>`<path d="M${pt(p(a))}L${pt(p(b))}" fill="none" stroke="${color}" opacity="${n(op)}"/>`;
function text3d(p:(v:V3)=>Point,text:string,x:number,y:number,z:number,size:number,color:string,opacity=1){
 return [...text].map((char,i)=>{
  if(!char.trim())return'';
  const at:V3=[x+textWidth([...text].slice(0,i).join(''))*size,y,z],origin=p(at),dx=p([at[0]+1,at[1],z]),dy=p([at[0],at[1]+1,z]);
  return`<g transform="matrix(${n(dx[0]-origin[0])} ${n(dx[1]-origin[1])} ${n(dy[0]-origin[0])} ${n(dy[1]-origin[1])} ${pt(origin)})"><text font-family="${filmFont}" font-size="${size}" fill="${color}" opacity="${n(opacity)}">${esc(char)}</text></g>`;
 }).join('');
}
function disk(p:(v:V3)=>Point,x:number,y:number,z:number,r:number,fill:string,stroke:string){return quad(p,Array.from({length:24},(_,i)=>[x+Math.cos(i/24*Math.PI*2)*r,y+Math.sin(i/24*Math.PI*2)*r,z]as V3),fill,stroke);}
export function television3D(c:Space){
 const p=projector(c.width,c.height,.32+Math.sin(c.local*.34+c.variant)*.22,-.08+Math.sin(c.local*.2)*.04,1030,1100),t=c.time;
 let out='';
 // Real 3D positions, perspective division, depth-sorted planes and glyph-local projection.
 for(let i=-7;i<=7;i++){out+=edge(p,[i*140,430,-1400],[i*140,430,700],c.fg,.08);out+=edge(p,[-1100,430,i*160-500],[1100,430,i*160-500],c.accent,.1);}
 out+=quad(p,[[-370,-245,-130],[325,-245,-130],[325,250,-130],[-370,250,-130]],'#100f13',c.fg,.9);
 out+=quad(p,[[325,-245,-130],[325,-245,115],[325,250,115],[325,250,-130]],'#3b1c23',c.accent,.85);
 out+=quad(p,[[-370,-245,-130],[-370,-245,115],[325,-245,115],[325,-245,-130]],'#242027',c.fg,.85);
 // Tapered wooden feet and an oblique cast shadow.
 out+=quad(p,[[-300,248,0],[-248,248,0],[-305,430,30],[-340,430,30]],'#222126',c.fg,.7);
 out+=quad(p,[[240,248,0],[280,248,0],[310,430,0],[275,430,0]],'#222126',c.fg,.7);
 out+=quad(p,[[-370,-245,115],[325,-245,115],[325,250,115],[-370,250,115]],'#17161c',c.fg,.95);
 out+=quad(p,[[-344,-211,121],[210,-211,121],[210,207,121],[-344,207,121]],'#2d2930',c.fg,.7);
 const sx=-321,sy=-187,sw=507,sh=368,sz=125;
 out+=quad(p,[[sx,sy,sz],[sx+sw,sy,sz],[sx+sw,sy+sh,sz],[sx,sy+sh,sz]],'#080b10',c.accent,.9);
 // Controlled CRT snow. Seed is a pure function of the frame/time.
 const tick=Math.floor(t*15),noise=clamp(.2+c.energy*.3);
 for(let row=0;row<24;row++)for(let col=0;col<34;col++){
  const r=rand(c.seed+row*83+col*479+tick*173),x=sx+col*sw/34,y=sy+row*sh/24;
  if(r>.4)out+=quad(p,[[x,y,sz+.2],[x+sw/34,y,sz+.2],[x+sw/34,y+sh/24*.48,sz+.2],[x,y+sh/24*.48,sz+.2]],r>.94?c.accent:c.fg,'none',r*noise*.29);
 }
 for(let i=0;i<28;i++)out+=edge(p,[sx,sy+i*sh/28,sz+.3],[sx+sw,sy+i*sh/28,sz+.3],c.fg,.045);
 const rolling=sy+((c.local*69)%sh);
 out+=quad(p,[[sx,rolling,sz+.4],[sx+sw,rolling,sz+.4],[sx+sw,rolling+9,sz+.4],[sx,rolling+9,sz+.4]],c.fg,'none',.07);
 out+=text3d(p,'CH '+String((c.variant%9)+1).padStart(2,'0')+'  /  SINAL INTERIOR',sx+20,sy+28,sz+1,11,c.accent,.85);
 const active=c.words.find(w=>t>=w.start&&t<w.end)??[...c.words].reverse().find(w=>w.start<=t)??c.words[0];
 const lines=[...new Set(c.words.map(w=>w.line))],current=active?lines.indexOf(active.line):0;
 const shown=lines.slice(Math.max(0,current-1),Math.max(0,current-1)+3);
 let row=0;
 for(const li of shown){const ws=c.words.filter(w=>w.line===li);let x=sx+24,y=sy+100+row*70;
  for(const w of ws){const size=li===active?.line?23:16,length=(textWidth(w.text)+.61)*size;if(x+length>sx+sw-20){y+=32;x=sx+24;}
   const color=active?.id===w.id?c.accent:c.fg,opacity=li===active?.line?(t>=w.start?1:.2):.25;
   out+=text3d(p,w.text,x,y,sz+2,size,color,opacity);x+=length;
  }row++;
 }
 out+=text3d(p,'> o que a tela não consegue esconder_',sx+21,sy+sh-24,sz+2,10,c.accent,.65);
 out+=disk(p,264,-111,125,26,'#28252c',c.fg)+disk(p,264,-22,125,20,'#242128',c.fg)+disk(p,264,84,125,4,c.accent,c.accent);
 for(let i=0;i<6;i++)out+=edge(p,[237,131+i*10,125],[288,131+i*10,125],c.fg,.2);
 out+=edge(p,[-40,-246,-12],[-181,-389,-50],c.fg,.7)+edge(p,[-40,-246,-12],[79,-374,-50],c.fg,.7);
 out+=text3d(p,'NO SIGNAL ≠ NO ONE',-260,304,20,15,c.fg,.3);
 return out;
}
export function tunnel3D(c:Space){
 const p=projector(c.width,c.height,Math.sin(c.local*.3)*.09,Math.sin(c.local*.21)*.08,1100,950);let out='';
 for(let i=14;i>=0;i--){
  const z=-2200+((i*200+c.local*380)%2800),op=.08+(z+2200)/2800*.4;
  const vs:V3[]=[[-350,-310,z],[350,-310,z],[350,390,z],[-350,390,z]];
  out+=quad(p,vs,'none',i%3===0?c.accent:c.fg,op);
  if(i%2===0)out+=text3d(p,c.words.slice(0,6).map(w=>w.text).join(' ').slice(0,35)||'while (fugir) voltar();',-320,-190,z,22,c.accent,op);
 }
 const corners:V3[]=[[-350,-310,0],[350,-310,0],[350,390,0],[-350,390,0]];
 for(const v of corners)out+=edge(p,[v[0],v[1],-2200],[v[0],v[1],600],c.accent,.3);
 return out;
}
