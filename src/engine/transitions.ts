// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Analysis,Scene}from'./model';
import{clamp,smooth,easeOut,mix,n,rand,pt}from'./math';
type Transition=Scene['transition'];
export const transitionLabels:Record<Transition,string>={cut:'Corte',shutter:'Obturador',dissolve:'Dissolução',ink:'Tinta',channel:'Troca de canal',iris:'Íris',whip:'Whip pan',burn:'Queima de filme',zoom:'Mergulho',split:'Planos divididos',mosaic:'Fragmentação',filmstrip:'Película vertical',ripple:'Onda circular',raster:'Varredura CRT',aperture:'Diafragma',typewriter:'Reescrita de terminal',crosszoom:'Travessia de profundidade',exposure:'Dupla exposição',portal:'Passagem de luz',parallax:'Passagem entre planos','light-sweep':'Feixe de varredura'};
export function transitionDuration(kind:Transition,bpm:number){
 if(kind==='cut')return 0;
 const beat=60/Math.max(40,bpm||120);
 return clamp(beat*(kind==='dissolve'||kind==='ripple'?1.8:kind==='whip'||kind==='shutter'?.7:1.1),.26,.85);
}
export function directTransitions(scenes:Scene[],analysis:Analysis):Scene[]{
 const families:Partial<Record<Scene['kind'],Transition[]>>={
  constellation:['aperture','iris','ripple'],heart:['ripple','split','iris'],orbit:['iris','crosszoom','aperture'],
  corridor:['whip','filmstrip','crosszoom'],tunnel3d:['crosszoom','zoom'],television:['channel','raster'],
  denial:['shutter','typewriter','burn','split'],fall:['mosaic','filmstrip'],rest:['dissolve','ripple'],
  terminal:['typewriter','raster','split'],soul:['ink','aperture'],hide:['split','ink'],echo:['ripple','crosszoom'],mirror:['split','mosaic'],storm:['raster','whip'],clock:['aperture','filmstrip']
 };
 const counts=new Map<string,number>();
 return scenes.map((s,i)=>{
  const count=counts.get(s.kind)??0;counts.set(s.kind,count+1);
  if(!i)return{...s,transition:'dissolve'};
  const candidates=families[s.kind]??(['cut','whip','ink']as Transition[]),nearImpact=analysis.impacts.some(t=>Math.abs(t-s.start)<.09);
  // A clean cut still matters: reserve it between related shots on attacks.
  const transition:Transition=nearImpact&&i%3===0?'cut':candidates[count%candidates.length];
  return{...s,transition};
 });
}
export function composeTransition(input:{kind:Transition;progress:number;incoming:string;outgoing:string;width:number;height:number;background:string;accent:string;foreground:string;seed:number;time:number}){
 const{kind,incoming,outgoing,width:w,height:h,background:bg,accent,foreground:fg,seed,time}=input,q=clamp(input.progress),e=smooth(q),u=Math.min(w,h)/1080;
 const layer=(svg:string,transform='',opacity=1)=>`<g opacity="${n(opacity)}" transform="${transform}"><rect width="${w}" height="${h}" fill="${bg}"/>${svg}</g>`;
 const clip=(shapes:string,under=outgoing,over=incoming)=>`<defs><clipPath id="scene-reveal">${shapes}</clipPath></defs>${layer(under)}<g clip-path="url(#scene-reveal)">${layer(over)}</g>`;
 const rect=(x:number,y:number,width:number,height:number)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(0,width))}" height="${n(Math.max(0,height))}"/>`;
 const scale=(z:number)=>`translate(${w/2} ${h/2}) scale(${n(z)}) translate(${-w/2} ${-h/2})`;
 if(q>=1||kind==='cut')return layer(incoming);
 if(kind==='dissolve')return layer(outgoing)+layer(incoming,'',e);
 if(kind==='exposure'){
  const afterimage=Math.sin(q*Math.PI)*.16;
  return layer(outgoing,'',1-e)+layer(outgoing,`translate(${n(e*w*.045)} ${n(-e*h*.018)})`,afterimage)+layer(incoming,scale(mix(1.045,1,e)),e);
 }
 if(kind==='portal'){
  const radius=Math.hypot(w,h)*.55*easeOut(q),center: [number,number]=[w*.52,h*.42];
  return clip(`<ellipse cx="${center[0]}" cy="${center[1]}" rx="${n(radius)}" ry="${n(radius*.8)}"/>`,outgoing,incoming)+`<ellipse cx="${center[0]}" cy="${center[1]}" rx="${n(radius)}" ry="${n(radius*.8)}" fill="none" stroke="#ffc181" stroke-width="${n((1-q)*13*u+u)}" opacity="${n(Math.sin(q*Math.PI)*.7)}"/>`;
 }
 if(kind==='parallax')return layer(outgoing,`translate(${n(-e*w*.2)} ${n(e*h*.02)}) ${scale(1-e*.12)}`,1-e)+layer(incoming,`translate(${n((1-e)*w*.34)} ${n((1-e)*-h*.025)}) ${scale(mix(.82,1,e))}`,e);
 if(kind==='light-sweep'){
  const center=mix(-w*.25,w*1.25,e),band=w*.13;
  return clip(`<path d="M0 0H${n(center)}L${n(center-w*.15)} ${h}H0Z"/>`)+`<path d="M${n(center-band)} 0H${n(center)}L${n(center-w*.15)} ${h}H${n(center-w*.15-band)}Z" fill="${fg}" opacity="${n(Math.sin(q*Math.PI)*.18)}"/>`;
 }
 if(kind==='zoom'||kind==='crosszoom')return layer(outgoing,scale(1+e*.9))+layer(incoming,scale(mix(1.65,1,e)),e);
 if(kind==='whip')return layer(outgoing,`translate(${n(-w*easeOut(q))} 0)`)+layer(incoming,`translate(${n(w*(1-easeOut(q)))} 0)`);
 if(kind==='filmstrip')return layer(outgoing,`translate(0 ${n(-h*e)})`)+layer(incoming,`translate(0 ${n(h*(1-e))})`)+`<path d="M0 ${n(h*(1-e))}H${w}" stroke="${accent}" stroke-width="${3*u}" opacity="${n(Math.sin(q*Math.PI))}"/>`;
 if(kind==='shutter')return clip(rect(0,0,w*e*.5,h)+rect(w*(1-e*.5),0,w*e*.5,h));
 if(kind==='split')return clip(rect(0,0,w*.5,h*e)+rect(w*.5,h*(1-e),w*.5,h));
 if(kind==='mosaic'){
  let shapes='';const cols=w>h?12:7,rows=w>h?7:12;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const v=smooth((q-rand(seed+x*97+y*17)*.52)/.48),ww=w/cols,hh=h/rows;shapes+=rect((x+(1-v)*.5)*ww,(y+(1-v)*.5)*hh,ww*v+.05,hh*v+.05);}
  return clip(shapes);
 }
 if(kind==='raster'||kind==='typewriter'){
  let shapes='';const rows=kind==='raster'?28:13;
  for(let row=0;row<rows;row++){const y=row*h/rows,progress=kind==='raster'?clamp(q*1.45-row/rows*.45):clamp(q*(rows+1)-row),offset=kind==='raster'?Math.sin(row*1.3)*w*.02*(1-progress):0;shapes+=rect(offset,y,w*progress,h/rows+.4);}
  const y=h*e;
  return clip(shapes)+`<path d="M0 ${n(y)}H${w}" stroke="${accent}" opacity="${n(Math.sin(q*Math.PI)*.65)}" stroke-width="${2*u}"/>`;
 }
 if(kind==='iris'||kind==='ripple'||kind==='aperture'){
  const radius=Math.hypot(w,h)*.52*easeOut(q),x=w*.5,y=h*.5;
  const shape=kind==='aperture'?`<polygon points="${Array.from({length:8},(_,i)=>pt([x+Math.cos(i*Math.PI/4+e*.25)*radius*1.2,y+Math.sin(i*Math.PI/4+e*.25)*radius*1.2]).replace(' ', ',')).join(' ')}"/>`:`<circle cx="${x}" cy="${y}" r="${n(radius)}"/>`;
  return clip(shape)+(kind==='ripple'?`<circle cx="${x}" cy="${y}" r="${n(radius)}" stroke="${accent}" fill="none" stroke-width="${n(1.5*u)}" opacity="${n(Math.sin(q*Math.PI)*.5)}"/>`:'');
 }
 if(kind==='ink'){
  const edge=w*(e*1.3-.15),points=Array.from({length:25},(_,i)=>[edge+Math.sin(i*1.83+seed)*w*.06*(1-e),h*i/24]as[number,number]);
  return clip(`<path d="M0 0L${points.map(pt).join('L')}L0 ${h}Z"/>`);
 }
 if(kind==='channel'){
  const noise=1-smooth(q);let out=layer(q<.22?outgoing:incoming);
  for(let i=0;i<34;i++){const y=rand(seed+i*73+Math.floor(time*30)*23)*h,hh=(2+rand(i+seed)*14)*u;out+=`<rect x="0" y="${n(y)}" width="${w}" height="${n(hh)}" fill="${i%6?fg:accent}" opacity="${n(noise*(.03+rand(i)*.25))}"/>`;}
  return out+`<path d="M0 ${n(h*(.3+q*.5))}H${w}" stroke="${fg}" opacity="${n(noise*.5)}" stroke-width="${n(noise*6*u)}"/>`;
 }
 // Film burn is tied to a deliberately chosen cut, never a periodic strobe.
 if(kind==='burn')return layer(q<.12?outgoing:incoming)+`<rect width="${w}" height="${h}" fill="${accent}" opacity="${n(Math.sin(q*Math.PI)*.32)}"/>`;
 return layer(incoming);
}
