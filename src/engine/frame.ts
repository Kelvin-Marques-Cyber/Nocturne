// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,Word,Point} from './model';
import {dimensions} from './model';
import {clamp,mix,smooth,easeOut,rand,n,esc,pt,pulse,sample,nearestBefore} from './math';
import {poseAt,characterSVG} from './rig';
import {television3D,tunnel3D,projector} from './space3d';
import {evaluateLyricFocus,renderLyricFocus} from './focus';
import {composeTransition,transitionDuration} from './transitions';
import {applyEffects} from './effects';
import {filmFont,textWidth,joinWords} from './language';
import {expressivePose} from './expression';
import {textureRecipes} from './catalog';
import {beatAccents,beatResponse} from './beat';
import {stageWorlds} from './stage';
import {codeTheatre} from './code-theatre';
import {libraryWorlds} from './world-library';

export function sceneAt(p:Project,t:number){return p.scenes.find(s=>t>=s.start&&t<s.end)??(t<p.scenes[0].start?p.scenes[0]:p.scenes.at(-1)!);}
export function activeWord(p:Project,t:number){return p.words.find(w=>t>=w.start&&t<w.end);}
const line=(x1:number,y1:number,x2:number,y2:number,color:string,opacity=.4,width=1)=>`<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${color}" stroke-width="${width}" opacity="${n(opacity)}" fill="none"/>`;
const txt=(text:string,x:number,y:number,size:number,color:string,extra='')=>`<text x="${n(x)}" y="${n(y)}" font-family="${filmFont}" font-size="${n(size)}" fill="${color}" ${extra}>${esc(text)}</text>`;
const ring=(x:number,y:number,r:number,color:string,op=1)=>`<circle cx="${n(x)}" cy="${n(y)}" r="${n(Math.max(0,r))}" stroke="${color}" fill="none" opacity="${n(op)}"/>`;

interface Ctx {p:Project;s:Scene;t:number;local:number;q:number;w:number;h:number;u:number;ground:number;beat:number;energy:number;impact:number;accent:string;fg:string;words:Word[];}
function hero(c:Ctx,x:number,y:number,scale=1,ghost=false,time=c.t,contacts?:{left?:Point;right?:Point}){
 let motionTime=time;
 for(const e of c.s.events.filter(e=>e.type==='freeze'))if(time>=e.at)motionTime-=clamp(time-e.at,0,e.duration);
 const expression=expressivePose(poseAt(c.s.motions,motionTime,c.p.analysis.bpm),c.p,c.s,motionTime),p=expression.pose,unit=scale*c.u*c.p.character.scale;
 if(contacts?.left)p.leftHand=[(contacts.left[0]-x)/unit,(contacts.left[1]-y)/unit];
 if(contacts?.right)p.rightHand=[(contacts.right[0]-x)/unit,(contacts.right[1]-y)/unit];
 return `<g ${expression.gesture?`data-gesture="${expression.gesture}"`:''} transform="translate(${n(x)} ${n(y)}) scale(${n(scale*c.u*c.p.character.scale)})">${characterSVG(p,c.p.character,c.accent,c.beat,ghost)}</g>`;
}
function wordObject(c:Ctx,text:string,x:number,y:number,size:number,progress:number,extra=''){
 size=Math.min(size,c.w*.84/Math.max(1,textWidth(text)));
 const letters=[...text];
 return letters.map((ch,i)=>{if(!ch.trim())return'';const phase=easeOut(progress*2.3-i*.065),shift=(1-phase)*40,rot=(1-phase)*-14;
  const lx=x+(textWidth(letters.slice(0,i).join(''))-textWidth(text)*.5)*size;
  return `<g transform="translate(${n(lx)} ${n(y+shift)}) rotate(${n(rot)})" opacity="${n(phase)}">${c.p.style.chromatic?txt(ch,1.2*c.p.style.chromatic,0,size,c.accent,'opacity=".55"'):''}${txt(ch,0,0,size,c.fg,extra)}</g>`;
 }).join('');
}
function stars(c:Ctx,count=44,connect=false){
 const pts:Point[]=Array.from({length:count},(_,i)=>[rand(c.p.seed+i*13)*c.w,(.13+rand(c.p.seed+i*31)*.5)*c.h]);
 let out='';
 pts.forEach(([x,y],i)=>{
  const breathe=.42+.35*Math.sin(c.t*.65+i),r=(i%7===0?2.4:1.2)*c.u;
  out+=`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${i%11===0?c.accent:c.fg}" opacity="${n(breathe)}"/>`;
  if(i%7===0)out+=line(x-6*c.u,y,x+6*c.u,y,c.fg,.3)+line(x,y-6*c.u,x,y+6*c.u,c.fg,.3);
  if(connect&&i>0&&i<13&&c.q>i/28)out+=line(pts[i-1][0],pts[i-1][1],x,y,c.accent,.3,1.1*c.u);
 });return out;
}
function codeField(c:Ctx,amount=7,drift=1){
 return Array.from({length:amount},(_,i)=>{
 const y=(.25+i*.065)*c.h,x=(-.22+((i*.137+c.t*.013*drift)%1))*c.w;
 return txt(i%3===0?c.s.code:`// ${c.words.map(w=>w.text).join(' ').slice(0,68)}`,x,y,16*c.u,i%3===0?c.accent:c.fg,`opacity="${i%3===0?.17:.065}" transform="rotate(-5 ${n(x)} ${n(y)})"`);
 }).join('');
}
function constellation(c:Ctx){
 const x=c.w*(c.s.variant%2?.4:.62),y=c.ground;
 const keyTime=c.words.find(w=>/constel/i.test(w.text))?.start??c.s.start;
 let out=stars(c,62,true)+`<circle cx="${c.w*.51}" cy="${c.h*.37}" r="${c.w*.43}" fill="url(#red-haze)" opacity=".26"/>`;
 out+=wordObject(c,c.s.accent,c.w*.5,c.h*.26,c.w*.064,clamp((c.t-keyTime+.6)/1.5));
 const anchor:Point=[c.w*.27,c.h*.36];
 out+=`<path d="M${pt(anchor)} Q${c.w*.8} ${c.h*.44} ${n(x)} ${n(y-172*c.u)}" fill="none" stroke="${c.accent}" opacity=".48" stroke-width="${1.3*c.u}" stroke-dasharray="${n(4+c.q*20)} 8"/>`;
 out+=ring(anchor[0],anchor[1],22*c.u+c.beat*8,c.accent,.55);
 out+=line(c.w*.12,c.ground+2,c.w*.84,c.ground+2,c.fg,.2);
 out+=hero(c,x,y,1.45);
 out+=txt('posição: infinitamente pequeno',c.w*.1,c.h*.42,14*c.u,c.fg,'opacity=".4"');
 return out;
}
function heart(c:Ctx){
 const x=c.w*.36,cy=c.h*.44,r=c.w*.21*(1+c.beat*.045);
 let out=stars(c,23)+codeField(c,3);
 const e=clamp(c.local/1.2);
 out+=`<path d="M${n(x)} ${n(cy+r*.83)} C${n(x-r*2)} ${n(cy-r*.5)} ${n(x-r*.6)} ${n(cy-r*1.6)} ${n(x)} ${n(cy-r*.58)} C${n(x+r*.6)} ${n(cy-r*1.6)} ${n(x+r*2)} ${n(cy-r*.5)} ${n(x)} ${n(cy+r*.83)}Z" fill="url(#red-haze)" stroke="${c.accent}" stroke-width="${2*c.u}" stroke-dasharray="${n(e*2000)} 2200"/>`;
 for(let i=0;i<6;i++)out+=ring(x,cy,r*(.32+i*.16),c.accent,.03+i*.025);
 const graph=Array.from({length:72},(_,i)=>{const xx=c.w*.12+i*c.w*.011,phase=(i+c.t*18)%21,yy=cy+(phase>9&&phase<14?Math.sin((phase-9)*1.3)*42*c.u:Math.sin(i*.6)*3*c.u);return`${i?'L':'M'}${n(xx)} ${n(yy)}`;}).join('');
 out+=`<path d="${graph}" stroke="${c.fg}" stroke-width="${1.7*c.u}" opacity=".75" fill="none"/>`;
 out+=wordObject(c,c.s.accent==='CORAÇÕES'?'COR(AÇÃO)':c.s.accent,c.w*.53,c.h*.25,c.w*.083,e);
 out+=hero(c,c.w*.71,c.ground,1.7);
 out+=line(x,cy+r*.83,c.w*.71,c.ground-175*c.u,c.accent,.65,1.5*c.u);
 out+=txt('read permission: granted',c.w*.12,c.h*.61,16*c.u,c.accent);
 return out;
}
function corridor(c:Ctx){
 const cx=c.w*.56,vanY=c.h*.43;
 let out=codeField(c,9,4);
 for(let i=0;i<7;i++){
  const z=((i/7+c.local*.18)%1),r=smooth(z),rw=mix(c.w*.08,c.w*.76,r),rh=mix(c.h*.08,c.h*.65,r);
  out+=`<rect x="${n(cx-rw/2)}" y="${n(vanY-rh/2)}" width="${n(rw)}" height="${n(rh)}" fill="none" stroke="${i%2?c.fg:c.accent}" stroke-width="${n((.4+r*1.7)*c.u)}" opacity="${n((1-r)*.5)}"/>`;
 }
 const wall=clamp((c.q-.55)/.45)*c.w*.23;
 out+=`<rect x="0" y="${c.h*.24}" width="${wall}" height="${c.h*.52}" fill="${c.accent}" opacity=".1"/><rect x="${c.w-wall}" y="${c.h*.24}" width="${wall}" height="${c.h*.52}" fill="${c.accent}" opacity=".16"/>`;
 const runx=c.w*.45+Math.sin(c.local*.55)*c.w*.06;
 out+=hero(c,runx-34*c.u,c.ground,1.3,true,c.t-.13)+hero(c,runx,c.ground,1.3);
 out+=wordObject(c,c.s.accent==='FUGIR'?'NÃO POSSO FUGIR':c.s.accent,c.w*.52,c.h*.26,c.w*.057,clamp(c.local));
 for(let i=0;i<4;i++){const x=((i*c.w*.4-c.local*145)%(c.w*1.5)+c.w*1.5)%(c.w*1.5)-c.w*.25;out+=txt('FUGIR();',x,c.ground+25*c.u,c.w*.11,c.accent,'opacity=".17"');}
 out+=line(c.w*.08,c.ground+4,c.w*.92,c.ground+4,c.fg,.4);
 return out;
}
function choice(c:Ctx){
 const x=c.w*.49,y=c.ground;let out=codeField(c,4);
 out+=line(x,y,c.w*.14,y-150*c.u,c.fg,.5,2*c.u)+line(x,y,c.w*.85,y-150*c.u,c.accent,.6,2*c.u);
 out+=txt('correr()',c.w*.09,y-172*c.u,27*c.u,c.fg)+txt('ficar()',c.w*.72,y-172*c.u,27*c.u,c.accent);
 out+=hero(c,x-66*c.u,y,1.3,true,c.t+.3)+hero(c,x+68*c.u,y,1.3,true,c.t+.8)+hero(c,x,y,1.3);
 const pw=c.w*.7,px=c.w*.15,py=c.h*.29,ph=172*c.u;
 out+=`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="3" fill="${c.p.style.background}" stroke="${c.fg}" stroke-opacity=".4"/>`;
 out+=line(px,py+34*c.u,px+pw,py+34*c.u,c.fg,.2)+txt('decision.pending',px+18*c.u,py+22*c.u,14*c.u,c.fg);
 out+=txt(c.s.accent,px+28*c.u,py+83*c.u,30*c.u,c.fg);
 out+=txt('> escolher uma direção_',px+28*c.u,py+126*c.u,16*c.u,c.accent);
 out+=ring(c.w*.66,py+125*c.u,5+c.beat*15,c.accent,.45);
 return out;
}
function echo(c:Ctx){
 const x=c.w*.63,y=c.ground;let out=stars(c,27);
 for(let i=0;i<7;i++){
  const phase=((c.local*.22+i*.14)%1),r=phase*c.w*1.3;
  out+=ring(c.w*.02,c.h*.45,r,c.accent,(1-phase)*.45);
  if(i<4)out+=txt('chamar(eu);',c.w*.08+phase*c.w*.2,c.h*(.25+i*.09),22*c.u,c.fg,`opacity="${n((1-phase)*.4)}"`);
 }
 out+=hero(c,x,y,1.4);
 const pull=smooth(c.q);
 out+=`<path d="M${c.w*.03} ${c.h*.45} Q${c.w*.38} ${c.h*.66} ${x-pull*13} ${y-175*c.u}" stroke="${c.accent}" fill="none" stroke-width="${1.5*c.u}"/>`;
 out+=wordObject(c,c.s.accent==='CHAMAR'?'SUA VOZ':c.s.accent,c.w*.49,c.h*.29,c.w*.09,clamp(c.local));
 return out;
}
function hide(c:Ctx){
 const x=c.w*.38,y=c.ground,bx=x+mix(65,-155,smooth((c.q-.1)/.8))*c.u,by=y-360*c.u;let out=codeField(c,7);
 out+=hero(c,x,y,1.45,false,c.t,{left:[bx+15*c.u,y-240*c.u],right:[bx+35*c.u,y-220*c.u]});
 out+=`<rect x="${n(bx)}" y="${n(by)}" width="${n(280*c.u)}" height="${n(342*c.u)}" fill="${c.p.style.background}" stroke="${c.fg}" stroke-opacity=".6" stroke-width="${2*c.u}"/>`;
 out+=txt('[ OCULTO ]',bx+20*c.u,by+44*c.u,20*c.u,c.fg,'opacity=".45"');
 for(let i=0;i<5;i++)out+=`<rect x="${n(bx+18*c.u)}" y="${n(by+(72+i*36)*c.u)}" width="${n((244-i%2*35)*c.u)}" height="${n(17*c.u)}" fill="${c.fg}" opacity=".08"/>`;
 const hx=x,hy=y-245*c.u;
 out+=`<circle cx="${hx}" cy="${hy}" r="${n(10*c.u+c.beat*4)}" fill="${c.accent}"/>`+ring(hx,hy,34*c.u,c.accent,.6)+line(hx-56*c.u,hy,hx+56*c.u,hy,c.accent,.4)+line(hx,hy-55*c.u,hx,hy+55*c.u,c.accent,.4);
 out+=wordObject(c,c.s.accent,c.w*.48,c.h*.26,c.w*.087,clamp(c.local));
 out+=txt('// o coração continua visível',c.w*.1,c.h*.77,16*c.u,c.accent);
 return out;
}
function soul(c:Ctx){
 const cx=c.w*.48,cy=c.h*.42;let out=stars(c,34,true);
 for(let i=0;i<5;i++){
 const rotate=(i-2)*8*Math.sin(c.q*2),ww=c.w*(.49-i*.06),hh=c.h*(.23-i*.02);
 out+=`<g transform="rotate(${n(rotate)} ${cx} ${cy})"><rect x="${n(cx-ww/2)}" y="${n(cy-hh/2)}" width="${n(ww)}" height="${n(hh)}" fill="none" stroke="${i===4?c.accent:c.fg}" opacity="${.12+i*.06}"/>${txt(['interior','alma','memória','verdade','visto'][i],cx-ww/2+10*c.u,cy-hh/2+22*c.u,13*c.u,i===4?c.accent:c.fg,'opacity=".6"')}</g>`;
 }
 out+=`<path d="M${cx} ${cy} C${cx+c.w*.4} ${cy+c.h*.1} ${c.w*.55} ${c.ground-80*c.u} ${c.w*.39} ${c.ground-180*c.u}" stroke="${c.accent}" stroke-width="${1.3*c.u}" fill="none"/>`;
 out+=hero(c,c.w*.39,c.ground,1.4);
 out+=wordObject(c,c.s.accent==='ALMA'?'O INVISÍVEL':c.s.accent,c.w*.53,c.h*.23,c.w*.066,clamp(c.local));
 return out;
}
function fall(c:Ctx){
 let out=codeField(c,4);const x=c.w*.48,y=c.ground;
 const q=smooth((c.q-.18)*3);
 out+=line(c.w*.08,y,c.w*.39,y,c.fg,.6,2*c.u)+line(c.w*.65,y,c.w*.9,y,c.fg,.6,2*c.u);
 out+=`<path d="M${c.w*.39} ${y} L${c.w*.45} ${y+q*70*c.u} L${c.w*.51} ${y+q*36*c.u} L${c.w*.58} ${y+q*110*c.u} L${c.w*.65} ${y}" fill="none" stroke="${c.accent}" opacity=".6"/>`;
 out+=hero(c,x+smooth(c.q)*70*c.u,y,1.4);
 out+=wordObject(c,c.q<.48?'EU CAIO':'EU LEVANTO',c.w*.51,c.h*.28,c.w*.075,clamp(c.local));
 const vals=['cair();','levantar();','fugir();','voltar();'];
 out+=vals.map((v,i)=>txt(v,c.w*.12,c.h*.41+i*30*c.u,20*c.u,i===Math.min(3,Math.floor(c.q*4))?c.accent:c.fg,`opacity="${i===Math.min(3,Math.floor(c.q*4))?1:.15}"`)).join('');return out;
}
function denial(c:Ctx){
 const y=c.ground,x=c.w*.39,drop=smooth(clamp(c.local/1.2));let out=codeField(c,6);
 const yy=mix(c.h*.28,c.ground-365*c.u,drop);
 out+=wordObject(c,c.s.accent,c.w*.56,yy,Math.min(c.w*.27,c.w*.78/Math.max(1,c.s.accent.length)*1.6),clamp(c.local/.8));
 out+=`<rect x="${c.w*.17}" y="${n(yy+24*c.u)}" width="${c.w*.7}" height="${3*c.u}" fill="${c.accent}"/>`;
 out+=hero(c,x,y,1.4,false,c.t,{left:[x+65*c.u,yy+24*c.u],right:[x+110*c.u,yy+24*c.u]});
 for(let i=1;i<5;i++)out+=txt('NÃO',c.w*.17,c.h*.17+i*49*c.u,c.w*.13,c.accent,`opacity="${.03+i*.017}"`);
 out+=txt('booleano ≠ destino',c.w*.5,c.ground+54*c.u,16*c.u,c.accent);
 return out;
}
function orbit(c:Ctx){
 const x=c.w*.55,cy=c.h*.46;let out=stars(c,77,true);
 for(let i=0;i<4;i++){
 const rx=c.w*(.15+i*.12),ry=rx*.28,angle=i*21-32;
 out+=`<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${i===2?c.accent:c.fg}" opacity="${i===2?.5:.15}" transform="rotate(${angle} ${x} ${cy})"/>`;
 const a=c.local*(.3+i*.08)+i*1.6,px=x+Math.cos(a)*rx,py=cy+Math.sin(a)*ry;
 out+=`<g transform="rotate(${angle} ${x} ${cy})"><circle cx="${n(px)}" cy="${n(py)}" r="${(3+i)*c.u}" fill="${i===2?c.accent:c.fg}"/></g>`;
 }
 const scale=mix(1.1,.7,smooth(c.q));out+=hero(c,x,c.ground,scale);
 out+=line(x,c.ground-260*c.u*scale,x,cy,c.accent,.5);
 out+=wordObject(c,c.s.accent==='TÃO PEQUENO'?'IMENSIDÃO':c.s.accent,c.w*.5,c.h*.24,c.w*.078,clamp(c.local));
 out+=txt('eu',x+28*c.u,c.ground-155*c.u*scale,14*c.u,c.accent);
 return out;
}
function terminal(c:Ctx){
 const x=c.w*.13,y=c.h*.26,ww=c.w*.74,hh=c.h*.27;
 let out=codeField(c,4)+`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="3" fill="${c.p.style.background}" stroke="${c.fg}" stroke-opacity=".3"/>`;
 out+=line(x,y+35*c.u,x+ww,y+35*c.u,c.fg,.2)+txt('vontade.ts',x+20*c.u,y+23*c.u,14*c.u,c.fg);
 const code=c.s.accent==='EU SEI'?['// depois da última recusa','','eu.sei = true;','','// e deixo de lutar.']:['const eu = { emoções };','const vontade = Daquele;','',c.s.code,'// mesmo quando eu não entendo'];
 code.forEach((v,i)=>{const length=Math.floor(clamp((c.local-i*.25)/1.4)*v.length);out+=txt(v.slice(0,length),x+24*c.u,y+(77+i*32)*c.u,Math.min(21*c.u,ww/30),i===3?c.accent:c.fg,`opacity="${i===4?.4:1}"`);});
 out+=`<rect x="${n(x+30*c.u+(Math.floor(c.local*8)%18)*12*c.u)}" y="${n(y+215*c.u)}" width="${10*c.u}" height="${20*c.u}" fill="${c.accent}" opacity="${Math.sin(c.t*7)>0?1:.2}"/>`;
 out+=hero(c,c.w*.67,c.ground,1.4);
 out+=`<path d="M${c.w*.67} ${c.ground-300*c.u} Q${c.w*.9} ${c.h*.55} ${x+ww*.8} ${y+hh}" stroke="${c.accent}" fill="none" stroke-width="${1.2*c.u}"/>`;
 return out;
}
function rest(c:Ctx){
 let out=stars(c,65,true);const x=c.w*.48,y=c.ground;
 const q=smooth(c.q);
 for(let i=0;i<5;i++){
  const xx=c.w*(.13+i*.17),yy=c.h*.32-q*c.h*(.06+i*.018);
  out+=txt(['entender','controlar','medir','negar','fugir'][i]+'()',xx,yy,18*c.u,c.fg,`opacity="${n((1-q)*.3)}" transform="rotate(${n((i-2)*q*14)} ${n(xx)} ${n(yy)})"`);
 }
 const d=`M${c.w*.07} ${y+3*c.u} C${c.w*.3} ${y-12*c.u} ${c.w*.6} ${y+14*c.u} ${c.w*.94} ${y+3*c.u}`;
 out+=`<path d="${d}" stroke="${c.accent}" fill="none" stroke-width="${1.5*c.u}"/>`;
 out+=hero(c,x,y,1.3);
 out+=wordObject(c,c.s.accent,c.w*.5,c.h*.33,c.w*.083,clamp(c.local/2));
 out+=txt('// tudo o que eu sou já é conhecido.',c.w*.13,c.h*.45,15*c.u,c.fg,'opacity=".5"');
 out+=ring(c.w*.6,c.h*.46,82*c.u,c.accent,.15);
 return out;
}
function ocean(c:Ctx){
 let out=codeField(c,4);const surface=c.h*.44,depth=smooth(c.q)*c.h*.23;
 out+=hero(c,c.w*.46,surface+depth,1.4);
 for(let j=0;j<9;j++){
  const points=Array.from({length:30},(_,i)=>`${i?'L':'M'}${n(i*c.w/29)} ${n(surface+j*30*c.u+Math.sin(i*.42+c.t*1.6-j*.6)*8*c.u)}`).join('');
  out+=`<path d="${points}" stroke="${j===0?c.accent:c.fg}" opacity="${j===0?.8:.08}" fill="none"/>`;
 }
 out+=wordObject(c,c.s.accent,c.w*.5,c.h*.26,c.w*.085,clamp(c.local));return out;
}
function door(c:Ctx){
 const x=c.w*.55,y=c.h*.3,ww=c.w*.28,hh=c.ground-y;
 let out=codeField(c,4)+`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="url(#red-haze)" stroke="${c.accent}" stroke-width="${2*c.u}"/>`;
 out+=txt('ACCESS',x+ww*.12,y+hh*.3,28*c.u,c.fg)+txt('DENIED',x+ww*.12,y+hh*.3+39*c.u,28*c.u,c.accent);
 out+=hero(c,x-105*c.u,c.ground,1.4);return out;
}
function lift(c:Ctx){
 let out=codeField(c,3);const lift=smooth(c.q)*70*c.u;
 out+=hero(c,c.w*.43,c.ground,1.4);
 out+=wordObject(c,c.s.accent,c.w*.52,c.ground-360*c.u-lift,c.w*.084,clamp(c.local));
 out+=line(c.w*.1,c.ground,c.w*.9,c.ground,c.fg,.3);return out;
}
function television(c:Ctx){return television3D({width:c.w,height:c.h,time:c.t,local:c.local,seed:c.p.seed,accent:c.accent,fg:c.fg,words:c.words,variant:c.s.variant,energy:c.energy,beat:c.beat})+hero(c,c.w*.18,c.ground,1.05);}
function tunnel3d(c:Ctx){return tunnel3D({width:c.w,height:c.h,time:c.t,local:c.local,seed:c.p.seed,accent:c.accent,fg:c.fg,words:c.words,variant:c.s.variant,energy:c.energy,beat:c.beat})+hero(c,c.w*.53,c.ground,1.5);}
function mirror(c:Ctx){
 const edge=c.w*.56,top=c.h*.27,bottom=c.ground,pw=c.w*.31;
 let out=codeField(c,3)+`<path d="M${edge} ${bottom}V${top}H${edge+pw}V${bottom}Z" fill="#13151b" stroke="${c.fg}" stroke-opacity=".48"/>`;
 const x=edge-66*c.u;
 out+=hero(c,x,c.ground,1.35,false,c.t,{right:[edge, c.ground-258*c.u]});
 out+=`<g transform="translate(${2*edge} 0) scale(-1 1)" opacity=".4">${hero(c,x,c.ground,1.35,false,c.t-.19,{right:[edge,c.ground-258*c.u]})}</g>`;
 for(let i=0;i<4;i++)out+=line(edge+15*c.u+i*13*c.u,top+8*c.u,edge+pw-10*c.u,top+90*c.u+i*19*c.u,c.fg,.045);
 out+=wordObject(c,c.s.accent,c.w*.4,c.h*.23,c.w*.082,clamp(c.local/.9));
 out+=line(c.w*.1,c.ground,c.w*.9,c.ground,c.accent,.3);return out;
}
function storm(c:Ctx){
 let out='',wind=.4+c.energy*.6;
 for(let i=0;i<95;i++){const x=(rand(c.p.seed+i*67)*c.w+c.local*150*wind)% (c.w*1.3)-c.w*.15,y=(rand(i*31)*c.h+c.local*(360+i%7*25))%c.h;
  out+=line(x,y,x-22*c.u*wind,y-67*c.u,c.fg,.05+rand(i*27)*.12,1.1*c.u);}
 out+=hero(c,c.w*.47,c.ground,1.55);
 for(let i=0;i<4;i++){const age=(c.local*.28+i*.25)%1,x=c.w*(.1+age),y=c.h*(.29+i*.075)-Math.sin(age*Math.PI)*60*c.u;out+=txt(c.words[i%c.words.length]?.text??c.s.accent,x,y,(21+i*3)*c.u,c.accent,`opacity="${n(Math.sin(age*Math.PI)*.55)}" transform="rotate(-13 ${n(x)} ${n(y)})"`);}
 out+=line(c.w*.08,c.ground,c.w*.91,c.ground,c.fg,.5,2*c.u);return out;
}
function clock(c:Ctx){
 const x=c.w*.51,y=c.h*.4,r=c.w*.31,angle=c.local*c.p.analysis.bpm/60*Math.PI/6;
 let out=codeField(c,3)+ring(x,y,r,c.fg,.25);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;out+=line(x+Math.sin(a)*r*.9,y-Math.cos(a)*r*.9,x+Math.sin(a)*r,y-Math.cos(a)*r,i===0?c.accent:c.fg,.5);}
 out+=line(x,y,x+Math.sin(angle)*r*.82,y-Math.cos(angle)*r*.82,c.accent,.9,2.2*c.u);
 out+=line(x,y,x+Math.sin(angle/12)*r*.5,y-Math.cos(angle/12)*r*.5,c.fg,.7,3*c.u);
 out+=hero(c,c.w*.3,c.ground,1.4)+wordObject(c,c.s.accent,c.w*.5,c.h*.23,c.w*.08,clamp(c.local));return out;
}
const worlds={constellation,heart,corridor,choice,echo,hide,soul,fall,denial,orbit,rest,terminal,ocean,door,lift,television,tunnel3d,mirror,storm,clock,...stageWorlds(hero,wordObject),...libraryWorlds(hero,wordObject)};

function captions(c:Ctx){
 if(!c.p.style.captions||!c.words.length)return'';
 const active=c.words.find(w=>c.t>=w.start&&c.t<w.end)??[...c.words].reverse().find(w=>c.t>=w.end&&c.t-w.end<.65);
 if(!active)return'';
 const ws=c.words.filter(w=>w.line===active.line),maxWidth=c.w*.8;
 const size=Math.min((c.p.direction==='reel'?52:34)*c.u,maxWidth/Math.max(1,ws.reduce((n,w)=>n+textWidth(w.text)/.61,0)+ws.length)*1.6);
 const total=ws.reduce((a,w)=>a+(textWidth(w.text)+.61)*size,0);let x=(c.w-total)/2;
 return `<g data-sung-caption="${esc(active.id)}">`+ws.map(w=>{
  const a=clamp((c.t-w.start+.16)/.26),y=c.h*.834+(1-easeOut(a))*12*c.u,color=c.t>=w.start&&c.t<w.end?c.accent:c.fg;
  const result=c.t>=w.start?txt(w.text,x,y,size,color,'opacity=".95"'):'';x+=(textWidth(w.text)+.61)*size;return result;
 }).join('')+'</g>';
}
function grain(c:Ctx,frame:number){
 const amount=c.p.style.grain;if(!amount)return'';
 let out='';const tick=Math.floor(frame/3);
 for(let i=0;i<90;i++){
  const x=rand(c.p.seed+i*83+tick*731)*c.w,y=rand(c.p.seed+i*97+tick*173)*c.h;
  out+=`<rect x="${n(x)}" y="${n(y)}" width="${n((1+rand(i)*6)*c.u)}" height="${n(.6*c.u)}" fill="${c.fg}" opacity="${n(amount*.28)}"/>`;
 }return out;
}
function context(p:Project,s:Scene,t:number):Ctx{
 const {width:w,height:h}=dimensions(p.format),u=Math.min(w,h)/1080,local=t-s.start,q=clamp(local/(s.end-s.start));
 const beat=beatResponse(p.analysis,t),energy=sample(p.analysis.energy,p.analysis.hopSeconds,t);
 const impact=Math.max(pulse(t,nearestBefore(p.analysis.impacts,t),.1)*.45,...s.events.filter(e=>e.type==='impact').map(e=>pulse(t,e.at,.15)*e.strength),0);
 return{p,s,t,local,q,w,h,u,ground:h*.735,beat,energy,impact,accent:p.style.accent,fg:p.style.foreground,words:p.words.filter(w=>s.wordIds.includes(w.id))};
}
function sceneLayer(c:Ctx,frame:number,id:string){
 const{p,s,t,local,q,w,h,u,energy,impact}=c,focus=evaluateLyricFocus(p,s,t),a=focus?.amount??0,visibility=1-smooth(a/.94);
 const z=mix(s.camera.zoomFrom,s.camera.zoomTo,smooth(q)),shake=impact*s.camera.shake*4*u*(1-a);
 const dx=s.camera.panX*smooth(q)*u+Math.sin(t*47.3)*shake,dy=s.camera.panY*smooth(q)*u+Math.sin(t*53.7)*shake*.6;
 const roll=s.camera.roll*Math.sin(Math.PI*q)*(1-a);
 let world='';
 if(visibility>.001){
  const theatre=p.direction==='reel'&&!['television','tunnel3d','ocean','cross','home','table','hands','abyss','valley'].includes(s.kind);
  world=theatre?codeTheatre(c):worlds[s.kind](c);
  world=`<g transform="translate(${n(w/2+dx)} ${n(h*.52+dy)}) rotate(${n(roll)}) scale(${n(z)}) translate(${n(-mix(w*.5,w*(s.camera.focusX??.5),smooth(q)))} ${n(-mix(h*.52,h*(s.camera.focusY??.52),smooth(q)))})">${world}</g>`;
  if(a>0){
   const center:Point=s.kind==='television'?projector(w,h,.32+Math.sin(local*.34+s.variant)*.22,-.08+Math.sin(local*.2)*.04,1030,1100)([-67.5,-3,125]):[w*.5,h*.74];
   const zoom=1+a*(s.kind==='television'?1.7:.35),target:Point=[mix(w*.5,center[0],a),mix(h*.5,center[1],a)];
   world=`<g transform="translate(${w*.5} ${h*.5}) scale(${n(zoom)}) translate(${n(-target[0])} ${n(-target[1])})">${world}</g>`;
  }
 }
 let out=`<circle cx="${w*.35}" cy="${h*.46}" r="${w*.63}" fill="url(#red-haze)" opacity="${n((.4+energy*.3)*visibility)}"/><g id="${id}" opacity="${n(visibility)}">${world}</g>`;
 const glitch=Math.max(impact,...s.events.filter(e=>e.type==='glitch').map(e=>pulse(t,e.at,.1)*e.strength))*p.style.glitch*(1-a);
 if(glitch>.11){const offset=(rand(frame+p.seed)-.5)*24*glitch*u;out+=`<g clip-path="url(#slice)"><rect width="${w}" height="${h}" fill="${p.style.background}"/><use xlink:href="#${id}" transform="translate(${n(offset)} 0)"/></g>`;}
 if(a<.9&&s.kind!=='television'&&p.direction!=='reel')out+=`<g opacity="${n(1-smooth(a/.45))}">${captions(c)}</g>`;
 if(a<.99){
  out+=`<g opacity="${n(1-smooth(a/.7))}">`;
  out+=txt(p.title.toLowerCase().replace(/\s+/g,'_')+'.ts',w*.075,h*.086,15*u,c.fg,'opacity=".6"');
  out+=`<rect x="${w*.075-14*u}" y="${h*.086-11*u}" width="${5*u}" height="${10*u}" fill="${c.accent}"/>`;
  out+=line(w*.075,h*.102,w*.925,h*.102,c.fg,.15)+txt(String(p.scenes.indexOf(s)+1).padStart(2,'0')+' / '+String(p.scenes.length).padStart(2,'0'),w*.8,h*.086,13*u,c.accent,'opacity=".7"');
  out+=line(w*.075,h*.876,w*.925,h*.876,c.fg,.15);
  const code=c.s.code.length>60?c.s.code.slice(0,57)+'...':c.s.code;
  out+=txt(code,w*.075,h*.907,Math.min(18*u,w*.85/Math.max(1,textWidth(code))),c.fg,'opacity=".58"');
  out+=txt(p.artist.toUpperCase(),w*.075,h*.946,11*u,c.fg,'opacity=".28"')+txt('●  '+(p.duration-t<3?'END':'REC'),w*.82,h*.946,11*u,c.accent,'opacity=".55"')+'</g>';
 }
 if(p.direction!=='reel')out+=beatAccents(p,s,t,w,h,a);
 if(focus)out+=renderLyricFocus(p,s,t,w,h,focus);
 const exposure=Math.max(0,...s.events.filter(e=>e.type==='flash').map(e=>pulse(t,e.at,e.duration*.35)*e.strength));
 if(exposure>.01)out+=`<rect width="${w}" height="${h}" fill="${c.fg}" opacity="${n(clamp(exposure)*.28*(1-a))}"/>`;
 const texture=s.performance?.enabled?textureRecipes.find(r=>r.id===s.performance?.texture):undefined;
 if(texture?.amount){const filtered=applyEffects(`<svg>${out}</svg>`,[{id:'performance',type:texture.type,amount:texture.amount*(s.performance?.intensity??1),enabled:true}],{width:w,height:h,frame,seed:p.seed,energy,beat:c.beat,focus:a,namespace:id});return filtered.slice(filtered.indexOf('>')+1,-6);}
 return out;
}
export function renderFrame(p:Project,frame:number,options?:{width?:number;height?:number}):string{
 const {width:w,height:h}=dimensions(p.format),u=Math.min(w,h)/1080,t=clamp(frame/p.fps-(p.visualSyncOffsetSeconds??0),0,p.duration-.000001),s=sceneAt(p,t),c=context(p,s,t);
 const px=options?.width??w,py=options?.height??h;
 let out=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${px}" height="${py}" viewBox="0 0 ${w} ${h}"><defs><radialGradient id="red-haze"><stop stop-color="${c.accent}" stop-opacity=".13"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient><radialGradient id="vignette"><stop offset=".4" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".57"/></radialGradient><pattern id="scan" width="${w}" height="${5*u}" patternUnits="userSpaceOnUse"><path d="M0 0 H${w}" stroke="#000000" stroke-width="${u}" opacity=".35"/></pattern><clipPath id="slice"><rect x="0" y="${n(h*(.25+rand(frame+81)*.5))}" width="${w}" height="${n((7+rand(frame)*23)*u)}"/></clipPath></defs><rect width="${w}" height="${h}" fill="${p.style.background}"/>`;
 const incoming=sceneLayer(c,frame,'world-current'),index=p.scenes.indexOf(s),duration=Math.min(transitionDuration(s.transition,p.analysis.bpm),(s.end-s.start)*.4),progress=duration?Math.max(clamp(c.local/duration),evaluateLyricFocus(p,s,t)?.amount??0):1;
 if(index>0&&progress<1){
  // A short outgoing handle is evaluated analytically, so limbs and camera
  // continue moving during a transition, even when frames are requested backwards.
  const previous=p.scenes[index-1],outgoing=sceneLayer(context(p,previous,t),frame,'world-previous');
  out+=composeTransition({kind:s.transition,progress,incoming,outgoing,width:w,height:h,background:p.style.background,accent:c.accent,foreground:c.fg,seed:p.seed+index*173,time:t});
 }else out+=incoming;
 const a=evaluateLyricFocus(p,s,t)?.amount??0;
 out+=`<rect width="${w}" height="${h}" fill="url(#scan)" opacity="${n(p.style.vhs*.4*(1-a*.8))}"/>`+grain(c,frame)+`<rect width="${w}" height="${h}" fill="url(#vignette)" opacity="${n(1-a*.8)}"/>`;
 if(t<1||p.duration-t<1.4)out+=`<rect width="${w}" height="${h}" fill="${p.style.background}" opacity="${n(t<1?1-smooth(t):1-smooth((p.duration-t)/1.4))}"/>`;
 const filtered=applyEffects(out+'</svg>',p.style.filters??[],{width:w,height:h,frame,seed:p.seed,energy:c.energy,beat:c.beat,focus:a});
 // These scenic worlds use thematic labels rather than the sung lyric. Keep
 // the actual words legible above their filters, including during transitions.
 if(p.direction==='reel'&&['ocean','cross','home','table','hands','abyss','valley'].includes(s.kind)&&a<.9)return filtered.slice(0,-6)+captions({...c,words:p.words})+'</svg>';
 return filtered;
}
