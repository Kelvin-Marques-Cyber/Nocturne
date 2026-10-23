// SPDX-License-Identifier: Apache-2.0
// Original procedural staging informed by the supplied reels. No reference
// footage, third-party models or prerecorded animation is embedded in a film.
import type {Project,Scene,Word,Point,Action} from './model';
import {clamp,mix,smooth,rand,n,pt,esc,sample,nearestBefore} from './math';
import {filmFont,textWidth} from './language';
import {poseAt,characterSVG,solveRig,type Pose} from './rig';
import {expressivePose} from './expression';
import {projector} from './space3d';
import {typeWidth,typographyFor} from './typography';
import type {EditProfile} from './edit-presets';
import {crabHUD} from './crab-hud';

export interface EditContext {p:Project;s:Scene;t:number;local:number;q:number;w:number;h:number;u:number;beat:number;energy:number;accent:string;fg:string;words:Word[];}
type V3=[number,number,number];
type Projection=(v:V3)=>Point;
const cached=new WeakMap<Scene,{words:Word[];lines:Word[][]}>();
function linesOf(c:EditContext){let entry=cached.get(c.s);if(!entry||entry.words!==c.p.words){entry={words:c.p.words,lines:[...new Set(c.words.map(w=>w.line))].map(line=>c.words.filter(w=>w.line===line))};cached.set(c.s,entry);}return entry.lines;}
function lineAt(c:EditContext){const lines=linesOf(c);return[...lines].reverse().find(line=>line[0].start<=c.t&&c.t-line.at(-1)!.end<.8)??[];}
export function resolvedEditProfile(p:Project,s:Scene):Exclude<EditProfile,'auto'>{
 const requested=s.editProfile??p.editProfile??'classic';if(requested!=='auto')return requested;
 const i=p.scenes.indexOf(s);
 // Related shots share a grammar. Keep the original reel as the recurring
 // visual anchor, especially for its television and physical prop sequences.
 if(i%4===0||['television','guitar','piano','drums','door'].includes(s.kind))return'classic';
 if(['ocean','abyss','valley','mountain','sunrise','eclipse','storm','snow','wind','desert','tunnel3d'].includes(s.kind))return'solar-drift';
 if(['rest','home','soul','hide','photograph','station','candle'].includes(s.kind))return'sketch-room';
 if(s.kind==='heart')return'crab-lab';
 if(['mirror','hands','roots','thread','constellation','prism','orbit'].includes(s.kind))return'wireframe-lab';
 if(['denial','scales','clock','book','terminal'].includes(s.kind))return'type-archive';
 return'gallery-flight';
}
// Applying a direction never rebuilds words, changes scene boundaries, touches
// the audio or discards manually placed focus/gesture events.
export function adoptReferenceEdits(p:Project,profile:EditProfile='auto'):Project{
 const next={...p,direction:'reel' as const,editProfile:profile};
 return{...next,scenes:p.scenes.map((s,i)=>{
  const mode=resolvedEditProfile(next,s),transition:Scene['transition']=!i?s.transition:mode==='sketch-room'?'exposure':mode==='solar-drift'?'portal':mode==='gallery-flight'?'parallax':mode==='wireframe-lab'?'light-sweep':mode==='type-archive'?'cut':s.transition;
  return{...s,transition};
 })};
}
function pen(d:string,color:string,opacity=.4,width=1){return`<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" opacity="${n(opacity)}" stroke-linecap="round" stroke-linejoin="round"/>`;}
function text(value:string,x:number,y:number,size:number,color:string,extra=''){return`<text x="${n(x)}" y="${n(y)}" font-family="${filmFont}" font-size="${n(size)}" fill="${color}" ${extra}>${esc(value)}</text>`;}
function plane(project:Projection,at:V3,body:string){const o=project(at),x=project([at[0]+1,at[1],at[2]]),y=project([at[0],at[1]+1,at[2]]);return`<g transform="matrix(${n(x[0]-o[0])} ${n(x[1]-o[1])} ${n(y[0]-o[0])} ${n(y[1]-o[1])} ${pt(o)})">${body}</g>`;}
function polygon(project:Projection,points:V3[],fill:string,stroke:string,opacity=1){return`<polygon points="${points.map(v=>pt(project(v)).replace(' ', ',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="${n(opacity)}"/>`;}
function performance(c:EditContext,action?:Action){const motions=action?[{action,start:c.s.start,end:c.s.end}]:c.s.motions;return expressivePose(poseAt(motions,c.t,c.p.analysis.bpm),c.p,{...c.s,motions},c.t).pose;}
function figure(c:EditContext,x:number,y:number,scale:number,pose:Pose,ghost=false){return`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale*c.u*c.p.character.scale)})">${characterSVG(pose,c.p.character,c.accent,0,ghost)}</g>`;}
function caption(c:EditContext,x:number,y:number,maxWidth:number,maxSize:number,project?:Projection,z=0){
 if(!c.p.style.captions)return'';const line=lineAt(c);if(!line.length)return'';
 const type=typographyFor(c.s.performance?.typography),space=typeWidth(' ',type),width=line.reduce((sum,w)=>sum+typeWidth(w.text,type),0)+Math.max(0,line.length-1)*space;
 const size=Math.min(maxSize,maxWidth/Math.max(1,width));let xx=x-width*size/2,out='';
 for(const word of line){const advance=typeWidth(word.text,type)*size;
  if(c.t>=word.start){const hit=c.t<word.end,enter=smooth((c.t-word.start)/.13),body=`<text data-lyric-word="${esc(word.id)}" font-family="${type.face.family}" font-weight="${type.face.weight}" font-style="${type.face.italic?'italic':'normal'}" font-size="${n(size)}" letter-spacing="${n(type.tracking*size)}" transform="scale(${type.width} 1)" fill="${hit?c.accent:c.fg}" opacity="${n(enter)}">${esc(word.text)}</text>`;
   out+=project?plane(project,[xx,y+(1-enter)*6,z],body):`<g transform="translate(${n(xx)} ${n(y+(1-enter)*6*c.u)})">${body}</g>`;
  }xx+=advance+space*size;
 }
 return`<g data-reference-caption="${esc(line[0].id)}">${out}</g>`;
}
function sketchRoom(c:EditContext,id:string){
 const{w,h,u,q,accent,fg}=c,horizon=h*.56,van:Point=[w*.52,horizon],lamp:Point=[w*.2,h*.55];
 const zoom=1+smooth(q)*.055,drift=(smooth(q)-.5)*w*.025;
 let out=`<defs><radialGradient id="${id}-lamp"><stop stop-color="#ffd184" stop-opacity=".6"/><stop offset=".45" stop-color="#eeb76d" stop-opacity=".18"/><stop offset="1" stop-color="#eeb76d" stop-opacity="0"/></radialGradient><linearGradient id="${id}-room" x2="0" y2="1"><stop stop-color="#19273d"/><stop offset="1" stop-color="#080c16"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id}-room)"/>`;
 out+=`<g transform="translate(${n(w/2+drift)} ${h*.52}) scale(${n(zoom)}) translate(${-w/2} ${-h*.52})">`;
 const wallX=w*.14,wallRight=w*.87,top=h*.2;
 out+=pen(`M0 ${h*.15}L${wallX} ${top}H${wallRight}L${w} ${h*.14}M${wallX} ${top}V${horizon}H${wallRight}V${top}M0 ${h*.85}L${wallX} ${horizon}M${w} ${h*.85}L${wallRight} ${horizon}`,fg,.27,1.3*u);
 // Perspective floor marks share one vanishing point; their tiny irregularity
 // is fixed by seed, never alternating still images or random frame jitter.
 for(let i=0;i<25;i++){const x=rand(c.p.seed+i*83)*w,y=mix(horizon+20*u,h*.92,rand(i*43+c.p.seed));out+=pen(`M${n(x)} ${n(y)}l${n((x-van[0])*.025)} ${n((y-van[1])*.018)}`,fg,.12,.85*u);}
 const wx=w*.46,wy=h*.28,ww=w*.2,wh=h*.18;
 out+=`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#070c16" stroke="${fg}" stroke-opacity=".34"/>`;
 out+=pen(`M${wx+ww*.5} ${wy}V${wy+wh}M${wx} ${wy+wh*.56}H${wx+ww}`,fg,.35,u);
 for(let i=0;i<5;i++)out+=pen(`M${n(wx+ww*i/4)} ${wy}Q${n(wx+ww*(i/4+.06))} ${wy+wh*.5} ${n(wx+ww*i/4)} ${wy+wh}`,fg,.12,u);
 out+=`<ellipse cx="${lamp[0]}" cy="${lamp[1]+55*u}" rx="${w*.38}" ry="${h*.27}" fill="url(#${id}-lamp)"/>`;
 out+=pen(`M${lamp[0]} ${lamp[1]+20*u}V${lamp[1]+155*u}m${-28*u} 0q${28*u} ${-8*u} ${56*u} 0`,fg,.75,1.7*u);
 out+=`<path d="M${lamp[0]-26*u} ${lamp[1]-25*u}h${52*u}l${19*u} ${47*u}h${-90*u}Z" fill="#e3b76e" fill-opacity=".6" stroke="#f2d59f" stroke-width="${u}"/>`;
 for(let i=0;i<5;i++){const x=w*(.27+i*.12),y=h*(.77+i%2*.035),a=(i-2)*9;out+=`<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y}l${56*u} ${-12*u} ${35*u} ${23*u} ${-56*u} ${12*u}Z" fill="#1d293c" stroke="${fg}" stroke-opacity=".35"/></g>`;}
 const pose=performance(c,['fall','abyss','ocean'].includes(c.s.kind)?'fall':['rest','soul','home'].includes(c.s.kind)?'rest':'kneel');
 out+=figure(c,w*.57,h*.81,1.3,pose);
 // A second exposure grows out of the sung sentence. It is drawn from the
 // current skeleton, so the apparition follows rather than looping a clip.
 const line=lineAt(c),ghost=line.length?smooth((q-.38)/.3)*.13:0;
 if(ghost>0)out+=`<g opacity="${n(ghost)}" transform="translate(${w*.13} ${h*.13})">${figure(c,w*.48,h*.8,3.3,performance(c,'reach'))}</g>`;
 out+='</g>';
 out+=caption(c,w*.53,h*.57,w*.76,63*u);
 return out;
}
function wireframeLab(c:EditContext,id:string){
 const{w,h,u,t,q,fg,accent}=c,project=projector(w,h,.28+(smooth(q)-.5)*.4,-.08,1100,1050),pose=performance(c),rig=solveRig(pose);
 const mesh:V3[]=[[pose.head[0],pose.head[1],0],[pose.neck[0],pose.neck[1],0],[pose.hip[0],pose.hip[1],0],...rig.leftArm.map(v=>[...v,-15] as V3),...rig.rightArm.map(v=>[...v,15] as V3),...rig.leftLeg.map(v=>[...v,-18] as V3),...rig.rightLeg.map(v=>[...v,18] as V3)].map(([x,y,z])=>[x*1.8,y*1.8+230,z*1.8]);
 let out=`<defs><radialGradient id="${id}-metal"><stop stop-color="#71868a" stop-opacity=".15"/><stop offset="1" stop-color="#0b1116" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#090e13"/><ellipse cx="${w*.52}" cy="${h*.5}" rx="${w*.48}" ry="${h*.32}" fill="url(#${id}-metal)"/>`;
 for(let i=-4;i<=4;i++){const a=project([i*145,240,-600]),b=project([i*145,240,500]);out+=pen(`M${pt(a)}L${pt(b)}`,fg,.08,u);}
 const tube=(a:V3,b:V3,r:number)=>{
  const rings:V3[][]=[a,b].map(([x,y,z])=>Array.from({length:6},(_,i)=>[x+Math.cos(i*Math.PI/3)*r,y,z+Math.sin(i*Math.PI/3)*r]as V3));let result='';
  for(let i=0;i<6;i++){const j=(i+1)%6;result+=polygon(project,[rings[0][i],rings[0][j],rings[1][j],rings[1][i]],i%2?'#273b42':'#49646b',fg,.25);result+=pen(`M${pt(project(rings[0][i]))}L${pt(project(rings[1][j]))}`,accent,.27,u*.8);}
  return result;
 };
 const edges=[[1,2],[1,3],[3,4],[1,5],[5,6],[2,7],[7,8],[2,9],[9,10]];
 for(const[a,b]of edges)out+=tube(mesh[a],mesh[b],a===1&&b===2?20:9);
 // A spherical head is a real rotated mesh with depth, not a flat circle.
 for(let ring=0;ring<4;ring++){
  const points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2,lat=(ring-1.5)*.4;return project([mesh[0][0]+Math.cos(a)*33*Math.cos(lat),mesh[0][1]+Math.sin(lat)*33,mesh[0][2]+Math.sin(a)*33*Math.cos(lat)]);});
  out+=pen('M'+points.map(pt).join('L'),fg,.45,u);
 }
 for(let ring=0;ring<3;ring++){
  const angle=ring*Math.PI/3,points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return project([mesh[0][0]+Math.sin(a)*33*Math.cos(angle),mesh[0][1]+Math.cos(a)*33,mesh[0][2]+Math.sin(a)*33*Math.sin(angle)]);});
  out+=pen('M'+points.map(pt).join('L'),fg,.4,u);
 }
 for(let i=0;i<mesh.length;i++){const at=project(mesh[i]);out+=`<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${2.6*u}" fill="${accent}"/>`;if(i%3===0){out+=pen(`M${pt(at)}l${(i%2?1:-1)*85*u} ${-35*u}h${(i%2?1:-1)*45*u}`,fg,.27,u)+text(String(i).padStart(2,'0'),at[0]+(i%2?90:-130)*u,at[1]-41*u,11*u,fg,'opacity=".5"');}}
 const signal=(values:number[],y:number)=>{const pts=Array.from({length:48},(_,i)=>`${i?'L':'M'}${n(w*.09+i*w*.007)} ${n(y-sample(values,c.p.analysis.hopSeconds,Math.max(0,t-1+i/47))*h*.045)}`).join('');return pen(pts,accent,.65,u);};
 out+=signal(c.p.analysis.low,h*.78)+signal(c.p.analysis.high,h*.84);
 for(let i=0;i<22;i++){const level=sample(i%2?c.p.analysis.high:c.p.analysis.low,c.p.analysis.hopSeconds,Math.max(0,t-i*.025));out+=`<rect x="${n(w*.68+i*5*u)}" y="${n(h*.82-level*65*u)}" width="${2*u}" height="${n(2*u+level*65*u)}" fill="${fg}" opacity=".45"/>`;}
 out+=text('MESH / '+String(mesh.length).padStart(3,'0'),w*.075,h*.145,13*u,fg,'opacity=".6"')+text(c.p.analysis.tempoConfidence?`${c.p.analysis.bpm} BPM`:'SIGNAL',w*.7,h*.145,13*u,accent);
 out+=caption(c,0,245,850,71,project,70);
 return out;
}
function solarDrift(c:EditContext,id:string){
 const{w,h,u,t,q,accent}=c,cx=w*.52,cy=h*.36,breath=smooth(q),impact=nearestBefore(c.p.analysis.impacts.filter((v,i,x)=>!i||v-x[i-1]>1.4),t),age=t-impact,ring=Number.isFinite(age)?clamp(age/1.4):1;
 let out=`<defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#070c1d"/><stop offset=".6" stop-color="#333052"/><stop offset="1" stop-color="#121521"/></linearGradient><radialGradient id="${id}-sun"><stop stop-color="#ffe8ae"/><stop offset=".26" stop-color="#f9bd67"/><stop offset=".56" stop-color="#e9803b" stop-opacity=".7"/><stop offset="1" stop-color="#d96641" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${id}-sky)"/>`;
 const sun=w*(.12+breath*.08);out+=`<ellipse cx="${cx}" cy="${cy}" rx="${n(sun*1.8)}" ry="${n(sun*.9)}" fill="url(#${id}-sun)"/>`;
 if(ring<1){const radius=w*(.07+ring*.85);out+=`<ellipse cx="${cx}" cy="${cy}" rx="${n(radius)}" ry="${n(radius*.28)}" fill="none" stroke="#f6be79" stroke-width="${n((1-ring)*13*u+u)}" opacity="${n((1-ring)*.6)}"/>`;}
 // Three terrain planes travel at different speeds around a fixed horizon.
 for(let layer=0;layer<3;layer++){
  const base=h*(.45+layer*.11),offset=breath*(layer+1)*18*u;
  const ridge=Array.from({length:25},(_,i)=>{const x=w*i/24,y=base+Math.sin(i*.64+layer)*h*.025+(rand(c.p.seed+layer*29+i*47)-.5)*h*.07+offset;return`${i?'L':'M'}${n(x)} ${n(y)}`;}).join('');
  out+=`<path d="${ridge}L${w} ${h}H0Z" fill="${['#333e64','#212d4d','#0d162a'][layer]}" stroke="${['#69779c','#445778','#263f5c'][layer]}" stroke-width="${1.2*u}"/>`;
 }
 const left=Array.from({length:29},(_,i)=>{const z=i/28,yy=mix(cy+h*.055,h,z*z),xx=mix(cx,w*.10,z)+Math.sin(i*.63+q*.6)*z*w*.035;return`${i?'L':'M'}${n(xx)} ${n(yy)}`;}).join('');
 const right=Array.from({length:29},(_,i)=>{const z=i/28,yy=mix(cy+h*.055,h,z*z),xx=mix(cx,w*.94,z)+Math.sin(i*.59+q*.6)*z*w*.03;return`${i?'L':'M'}${n(xx)} ${n(yy)}`;}).join('');
 out+=pen(left,'#7a87af',.43,2*u)+pen(right,'#657ba2',.36,2*u);
 out+=figure(c,w*.49,h*.79,1.15,performance(c,['rest','sunrise'].includes(c.s.kind)?'rise':'brace'));
 const reflect=clamp(c.energy*.15+.06);out+=`<path d="M${cx} ${cy+15*u}L${w*.78} ${h}H${w*.27}Z" fill="${accent}" opacity="${n(reflect)}"/>`;
 out+=caption(c,w*.5,h*.58,w*.82,73*u);
 return out;
}
function typeArchive(c:EditContext,id:string){
 const{w,h,u,fg,accent}=c,spoken=c.p.words.filter(word=>word.end<=c.t&&word.start>=c.s.start-22).slice(-72),archive=Array.from({length:Math.min(72,spoken.length*3)},(_,i)=>spoken[i%spoken.length]),line=lineAt(c),anchor=line[0]?.start??c.s.start;
 const emphasis=c.s.events.some(e=>e.type==='impact'&&Math.abs(c.t-e.at)<.16),turn=smooth((c.t-anchor-.4)/.18),roll=(c.s.variant%2?-1:1)*turn*1.8;
 let out=`<rect width="${w}" height="${h}" fill="#060708"/><g transform="rotate(${n(roll)} ${w*.5} ${h*.5})">`;
 // Past words occupy a pair of bowed columns; active lyrics are a separate
 // foreground plane. Never seed this archive with words not yet sung.
 archive.forEach((word,i)=>{
  const row=Math.floor(i/2),side=i%2,yy=h*.19+row*h*.018,curve=Math.sin(row/35*Math.PI)*w*.12,xx=side?w*.81-curve:w*.08+curve,size=(9+rand(c.p.seed+i*7)*7)*u;
  out+=text(word.text,xx,yy,size,fg,`opacity="${n(.13+rand(i*13)*.14)}" text-anchor="${side?'end':'start'}"`);
 });
 out+='</g>';
 out+=`<path d="M${w*.13} ${h*.42}H${w*.87}V${h*.62}H${w*.13}Z" fill="#08090d" opacity=".95"/>`;
 out+=caption(c,w*.5,h*.535,w*.8,99*u);
 if(emphasis)out+=pen(`M${w*.18} ${h*.57}H${w*.82}`,accent,.6,2*u);
 out+=figure(c,w*.76,h*.83,1.02,performance(c));
 return out;
}
function galleryFlight(c:EditContext,id:string){
 const{w,h,u,t,q,fg,accent}=c,lines=linesOf(c),active=Math.max(0,lines.reduce((n,line,i)=>line[0].start<=t?i:n,0)),line=lines[active]??[],age=t-(line[0]?.start??c.s.start);
 const project=projector(w,h,.12+smooth((age-.3)/.3)*.16,-.06,1150-smooth(q)*80,1120);
 let out=`<rect width="${w}" height="${h}" fill="#060a10"/>`;
 for(let i=5;i>=0;i--){
  const col=i%3,row=Math.floor(i/3),x=(col-1)*445-185,y=(row-.5)*310-70,z=-130-Math.abs(col-1)*135;
  const points:V3[]=[[x,y,z],[x+370,y,z],[x+370,y+245,z],[x,y+245,z]],tone=['#193142','#3b2332','#183d3b','#252944','#443225','#172b44'][i];
  out+=polygon(project,points,tone,fg,.66);
  const draw=(points:Point[],color=accent,alpha=.5)=>pen('M'+points.map(([xx,yy])=>pt(project([x+xx,y+yy,z+2]))).join('L'),color,alpha,u);
  if(i===0){out+=draw([[15,160],[75,75],[140,140],[210,43],[315,160],[355,160]],fg,.55);const pts=Array.from({length:25},(_,j)=>[280+Math.cos(j/24*Math.PI*2)*22,62+Math.sin(j/24*Math.PI*2)*22]as Point);out+=draw(pts,accent,.7);}
  if(i===1){const dots=Array.from({length:9},(_,j)=>[35+rand(c.p.seed+j*71)*300,35+rand(c.p.seed+j*43)*125]as Point);out+=draw(dots);for(const dot of dots){const at=project([x+dot[0],y+dot[1],z+3]);out+=`<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${1.8*u}" fill="${fg}"/>`;}}
  if(i===2){const body=`<g transform="translate(180 180) scale(.5)">${characterSVG(performance(c),c.p.character,accent,0)}</g>`;out+=plane(project,[x,y,z+3],body);}
  if(i===3){const pts=Array.from({length:40},(_,j)=>[15+j*8.5,115-sample(c.p.analysis.energy,c.p.analysis.hopSeconds,Math.max(0,t-1+j/39))*65]as Point);out+=draw(pts);out+=draw([[15,150],[355,150]],fg,.2);}
  if(i===4){out+=draw([[45,170],[45,30],[325,30],[325,170]],fg,.5)+draw([[130,170],[130,65],[235,65],[235,170]],accent,.8)+draw([[15,170],[355,170]],fg,.35);}
  if(i===5){for(let j=0;j<20;j++){const height=12+sample(j%2?c.p.analysis.low:c.p.analysis.high,c.p.analysis.hopSeconds,Math.max(0,t-j*.02))*95;out+=draw([[25+j*16,155],[25+j*16,155-height]],j%3?fg:accent,.55);}}
  const fragment=lines[i]?.filter(word=>word.start<=t).map(word=>word.text).join(' ')??'';
  if(fragment)out+=plane(project,[x+17,y+213,z+3],text(fragment,0,0,Math.min(17,330/Math.max(1,textWidth(fragment))),fg,'opacity=".55"'));
 }
 // The current phrase floats in front of the archive, rather than borrowing
 // screenshot assets or copying the showcased UI libraries.
 const show=smooth(age/.22);out+=`<g opacity="${n(show)}">`+caption(c,0,70,815,82,project,210)+`</g>`;
 out+=figure(c,w*.83,h*.86,1.05,performance(c,'turn'));
 return out;
}
export function renderReferenceEdit(c:EditContext):string|undefined{
 const profile=resolvedEditProfile(c.p,c.s);if(profile==='classic')return;
 if(profile==='crab-lab')return crabHUD(c.p,c.s,c.t,c.w,c.h);
 const id='reference-'+c.p.scenes.indexOf(c.s),renderers={'sketch-room':sketchRoom,'wireframe-lab':wireframeLab,'solar-drift':solarDrift,'type-archive':typeArchive,'gallery-flight':galleryFlight};
 return`<g data-reference-edit="${profile}">${renderers[profile](c,id)}</g>`;
}
