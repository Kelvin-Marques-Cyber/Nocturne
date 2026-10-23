// SPDX-License-Identifier: Apache-2.0
// A sentence is a prop and a stage direction, rather than a caption on a slide.
import type {Project,Scene,Word,Point,Action} from './model';
import {poseAt,characterSVG} from './rig';
import {expressivePose} from './expression';
import {analyzeMeaning} from './semantics';
import {filmFont,textWidth} from './language';
import {clamp,smooth,mix,n,esc,nearestBefore} from './math';
type Act='execute'|'permission'|'pressure'|'loop'|'erase'|'descend'|'call'|'release';
interface Cue {p:Project;s:Scene;t:number;local:number;q:number;w:number;h:number;u:number;ground:number;beat:number;energy:number;accent:string;fg:string;words:Word[];}
const plans=new WeakMap<Scene,{source:Word[];lines:Word[][];act:Act}>();
function plan(p:Project,s:Scene){
 const old=plans.get(s);if(old?.source===p.words)return old;
 const words=p.words.filter(w=>s.wordIds.includes(w.id)),lines=[...new Set(words.map(w=>w.line))].map(line=>words.filter(w=>w.line===line));
 const concepts=new Set(analyzeMeaning(words.map(w=>w.text).join(' '),p.language).hits.map(h=>h.concept));
 const any=(...keys:string[])=>keys.some(k=>concepts.has(k));
 const act:Act=any('abyss','ocean','fall')?'descend':any('escape')?'loop':any('rest','home','hands','table','sunrise')?'release':any('threshold','choice','refusal')?'permission':any('known-soul','sight','voice')?'call':any('hide','mirror','soul')?'erase':any('cage','scales','storm','emotion')?'pressure':'execute';
 const result={source:p.words,lines,act};plans.set(s,result);return result;
}
const actions:Record<Act,Action>={execute:'turn',permission:'hesitate',pressure:'brace',loop:'run',erase:'hold',descend:'kneel',call:'reach',release:'rest'};
const functions:Record<Act,string>={execute:'await',permission:'if',pressure:'while',loop:'while',erase:'try',descend:'yield',call:'await',release:'return'};
export function codeTheatre(c:Cue){
 const{p,s,t,w,h,u,fg,accent}=c,{lines,act}=plan(p,s);
 const activeIndex=Math.max(0,lines.reduce((last,line,index)=>t>=line[0].start?index:last,-1)),current=activeIndex>=0?lines[activeIndex]:[],anchor=current[0]?.start??s.start;
 const age=t-anchor,lineEnd=current.at(-1)?.end??s.end,progress=smooth((t-anchor)/Math.max(.4,lineEnd-anchor));
 const stroke=(d:string,color=fg,opacity=.4,width=1.4*u)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" opacity="${n(opacity)}" stroke-linecap="round"/>`;
 const text=(value:string,x:number,y:number,size:number,color=fg,extra='')=>`<text x="${n(x)}" y="${n(y)}" font-family="${filmFont}" font-size="${n(size)}" fill="${color}" ${extra}>${esc(value)}</text>`;
 // The stage is predominantly empty. Depth is carried by three rails and
 // one sentence-plane, with a single motivated reframing after an onset.
 const trigger=(p.analysis.beats.find(b=>b>anchor+.4&&b<anchor+1.1)??anchor+.65),turn=smooth((t-trigger)/.18),settle=smooth((t-trigger-.25)/.7);
 const tilt=(s.variant%2?-1:1)*(turn*2.2-settle*.8),yaw=(turn*.16-settle*.045)*(s.variant%2?-1:1);
 let out=`<g data-code-theatre="${act}">`;
 for(let rail=0;rail<3;rail++){
  const x=w*(.1+rail*.39),offset=(rail-1)*progress*12*u;
  out+=stroke(`M${n(x+offset)} ${h*.16}L${n(x-offset)} ${h*.85}`,rail===1?accent:fg,rail===1?.13:.055,rail===1?3*u:u);
 }
 const floor=h*.738,actorX=w*(act==='permission'?.62:act==='pressure'?.52:act==='release'?.44:.59),scale=1.9*u*p.character.scale;
 const descent=act==='descend'?smooth((c.local-.45)/Math.max(1.4,s.end-s.start-1))*h*.13:0;
 const motions=[{action:actions[act],start:s.start,end:s.end}];
 const stageScene={...s,motions};
 const base=expressivePose(poseAt(motions,t,p.analysis.bpm),p,stageScene,t).pose;
 // Returning to the ground is slow and weighted; there is no beat-driven
 // vertical bounce. A moving hand follows its prop through the same transform.
 let x=actorX,y=floor+descent,contact:Point|undefined;
 if(act==='loop'){
  x=w*.53;
  out+=stroke(`M${w*.07} ${floor}H${w*.94}`,fg,.45);
  const shift=((c.local*185*u)%(w*.8));
  for(let i=-1;i<3;i++)out+=text('↳ '+s.code,w*.1+i*w*.8-shift,floor+47*u,23*u,accent,'opacity=".2"');
 }else if(act==='descend'){
  out+=stroke(`M${w*.06} ${floor}H${w*.36}M${w*.76} ${floor}H${w*.95}`,fg,.55);
  out+=stroke(`M${w*.36} ${floor}L${w*.3} ${h*.9}M${w*.76} ${floor}L${w*.83} ${h*.9}`,accent,.5);
  out+=stroke(`M${w*.59} ${h*.24}Q${w*.7} ${h*.5} ${x+22*u} ${y-250*u}`,accent,.45);
 }else out+=stroke(`M${w*.08} ${floor}Q${w*.42} ${floor+3*u} ${w*.92} ${floor}`,fg,.35);
 if(act==='permission'){
  const px=w*.15,py=h*.33,pw=w*.7,ph=178*u,accept=smooth((age-.6)/1.15);
  out+=`<g transform="translate(0 ${n((1-smooth((age+.18)/.3))*-35*u)})"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="3" fill="#0e0b0d" stroke="${accent}" stroke-opacity=".65"/>`;
  out+=text('permission.request()',px+21*u,py+33*u,19*u,fg,'opacity=".65"');
  const sentence=current.filter(word=>t>=word.start).map(word=>word.text).join(' '),size=Math.min(31*u,(pw-45*u)/Math.max(1,textWidth(sentence)));
  out+=text(sentence,px+21*u,py+84*u,size);
  for(let i=0;i<2;i++){const bx=px+pw*(i?.54:.05),bw=pw*.4;out+=`<rect x="${n(bx)}" y="${py+111*u}" width="${bw}" height="${43*u}" fill="${i?accent:'#231a1d'}" opacity="${n(i?.35+accept*.6:.6)}"/>`+text(i?'true':'false',bx+bw*.3,py+139*u,22*u);}
  out+='</g>';
  const button:Point=[px+pw*.73,py+132*u];
  // A cursor travels from the character's hand; it can reach a distant UI
  // without stretching a physical arm beyond its limb lengths.
  contact=[x+42*u,y-310*u];
  const cursor:Point=[mix(contact[0],button[0],accept),mix(contact[1],button[1],accept)];
  out+=stroke(`M${contact[0]} ${contact[1]}Q${x+80*u} ${py+ph} ${n(cursor[0])} ${n(cursor[1])}`,accent,.3);
  out+=`<path d="M${n(cursor[0])} ${n(cursor[1])}l0 21 6-7 6 12 5-3-6-11 10-2Z" fill="${fg}"/>`;
 }else{
  // Preserve original words. Syntax is staged around them rather than
  // translating a multilingual lyric into hard-coded Portuguese labels.
  const atY=h*.45,scroll=(activeIndex>0?activeIndex-1+smooth(age/.32):0)*71*u;
  let code='';
  lines.forEach((line,row)=>{
   if(row<activeIndex-1||row>activeIndex)return; // Do not preview future lyric lines.
   const yy=atY+row*71*u-scroll,phrase=line.map(word=>word.text).join(' '),size=Math.min(41*u,w*.78/Math.max(1,textWidth(phrase)+2));
   let xx=w*.12;
   const opacity=row===activeIndex?1:row<activeIndex?.45:.16;
   code+=text(String(row+1).padStart(2,'0'),w*.065,yy,size*.43,fg,`opacity="${opacity*.38}"`);
   code+=text('//',xx,yy,size,accent,`opacity="${opacity*.85}"`);xx+=size*1.8;
   for(const word of line){
    if(t<word.start)continue; // Never show a word before its vocal onset.
     const hit=t<word.end,enter=smooth((t-word.start)/.22);
    code+=text(word.text,xx,yy+(1-enter)*6*u,size,hit?accent:fg,`opacity="${n(opacity*.98)}"`);
    if(hit)code+=`<rect x="${n(xx+textWidth(word.text)*size+4*u)}" y="${n(yy-size*.79)}" width="${4*u}" height="${size*.86}" fill="${accent}"/>`;
    xx+=(textWidth(word.text)+.61)*size;
   }
  });
  // Piecewise affine glyph-plane perspective remains valid in SVG/FFmpeg.
  out+=`<g transform="translate(${w*.5} ${h*.42}) rotate(${n(tilt)}) matrix(${n(Math.cos(yaw))} ${n(Math.sin(yaw)*.08)} ${n(Math.sin(yaw)*.06)} 1 0 0) translate(${-w*.5} ${-h*.42})">${code}</g>`;
  out+=text(functions[act]+' {',w*.12,h*.275,37*u,accent);
  out+=text(s.code,w*.12,h*.307,Math.min(28*u,w*.76/Math.max(1,textWidth(s.code))),fg,'opacity=".62"');
 }
 if(act==='pressure'){
  const close=smooth(c.q)*w*.24;
  for(const side of [0,1]){const xx=side?w-close:0;out+=`<rect x="${n(xx)}" y="${h*.21}" width="${n(close)}" height="${h*.55}" fill="${accent}" opacity=".1"/>`+stroke(`M${n(side?w-close:close)} ${h*.21}V${floor}`,accent,.85,2*u);}
  contact=[Math.min(w*.73,w-w*.24*smooth(c.q)),y-290*u];
 }else if(act==='erase'){
  const width=w*.34*smooth((age-.1)/.5),bx=x-width*.7;
  out+=`<rect x="${n(bx)}" y="${n(y-300*u)}" width="${n(width)}" height="${272*u}" fill="#0a090b" stroke="${fg}" stroke-opacity=".25"/>`;
  contact=[x-30*u,y-244*u];
 }else if(act==='call'){
  const reach=smooth((age-.15)/.75);contact=[x-40*u,y-370*u];
  out+=stroke(`M${w*.18} ${h*.32}C${w*.13} ${h*.55} ${x-180*u} ${y-390*u} ${n(mix(x-150*u,contact[0],reach))} ${n(contact[1])}`,accent,.65,1.6*u);
 }else if(act==='release'){
  const fade=1-smooth((c.local-.2)/Math.max(1,s.end-s.start-1));
  out+=stroke(`M${x} ${h*.23}Q${x+80*u} ${h*.45} ${x} ${y-195*u}`,accent,.4*fade);
 }
 if(contact){base.rightHand=[(contact[0]-x)/scale,(contact[1]-y)/scale];}
 out+=`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${characterSVG(base,p.character,accent,c.beat)}</g>`;
 // Trace marker is the consequence of a word, not a free-running decoration.
 const last=nearestBefore(current.map(word=>word.start),t),cursor=current.filter(word=>word.start<=t).length;
 out+=text(`${String(cursor).padStart(2,'0')}  ${s.code}`,w*.1,h*.807,Math.min(17*u,w*.78/Math.max(1,textWidth(s.code)+5)),fg,'opacity=".38"');
 if(Number.isFinite(last)&&t-last<.2)out+=`<circle cx="${w*.085}" cy="${h*.801}" r="${3*u}" fill="${accent}" opacity="${n(1-(t-last)/.2)}"/>`;
 return out+'</g>';
}
