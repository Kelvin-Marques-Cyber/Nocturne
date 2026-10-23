// SPDX-License-Identifier: Apache-2.0
import type {Project,Scene} from './model';
import {esc,n,sample,smooth} from './math';
import {real3DState} from './real3d-plan';
import {filmFont,textWidth} from './language';
export function crabHUD(p:Project,s:Scene,t:number,w:number,h:number){
 const u=Math.min(w,h)/1080,state=real3DState(p,s,t),words=p.words.filter(word=>s.wordIds.includes(word.id)),current=[...words].reverse().find(word=>word.start<=t),line=current?words.filter(word=>word.line===current.line):[];
 const text=(value:string,x:number,y:number,size:number,alpha=1)=>`<text x="${n(x)}" y="${n(y)}" fill="#f0f1e9" font-family="${filmFont}" font-size="${n(size)}" opacity="${n(alpha)}">${esc(value)}</text>`;
 let out=text('FILTER 1',w*.055,h*.075,18*u)+text('LFO RATE '+Math.round(p.analysis.bpm/24),w*.055,h*.105,18*u)+text('DS KICK',w*.78,h*.075,18*u)+text('DS HHC',w*.78,h*.105,18*u)+text('WAVETABLE',w*.78,h*.135,18*u);
 const signal=(values:number[],x:number,y:number,width:number,height:number)=>`<path d="${Array.from({length:70},(_,i)=>`${i?'L':'M'}${n(x+i/69*width)} ${n(y-sample(values,p.analysis.hopSeconds,Math.max(0,t-1.3+i/69*1.3))*height)}`).join('')}" stroke="#e5ede7" stroke-width="${u}" fill="none" opacity=".6"/>`;
 out+=signal(p.analysis.high,w*.17,h*.09,w*.21,h*.025)+signal(p.analysis.low,w*.055,h*.86,w*.26,h*.07);
 out+=`<path d="M${w*.055} ${h*.18}L${w*.26} ${h*.2}L${w*.39} ${h*.36}V${h*.46} M${w*.65} ${h*.48}L${w*.8} ${h*.35}H${w*.94}" fill="none" stroke="#e0e9e3" stroke-width="${u}" opacity=".35"/>`;
 for(let i=0;i<9;i++){const level=sample(i%2?p.analysis.low:p.analysis.high,p.analysis.hopSeconds,Math.max(0,t-i*.035));for(let j=0;j<Math.round(level*11)+1;j++)out+=`<path d="M${n(w*.73+i*24*u)} ${n(h*.86-j*9*u)}h${15*u}" stroke="#e5e9e1" stroke-width="${2*u}" opacity=".7"/>`;}
 out+=text('63 125 250 500 1K 2K 4K 8K',w*.71,h*.895,9*u,.5)+text('OSC 1 POS',w*.055,h*.9,16*u)+text('DRY/WET  '+Math.round(state.energy*100)+' %',w*.055,h*.925,16*u);
 out+=text(state.wire>.5?'RIG / IK / 8 LEGS':'CARAPACE / LIVE',w*.055,h*.96,11*u,.5);
 if(line.length&&p.style.captions){const phrase=line.map(word=>word.text).join(' '),size=Math.min(96*u,w*.86/Math.max(1,textWidth(phrase))),advance=textWidth(' ')*size;let x=(w-textWidth(phrase)*size)/2;
  out+='<g data-reference-caption="crab-lab">';for(const word of line){if(t>=word.start)out+=`<text data-lyric-word="${esc(word.id)}" x="${n(x)}" y="${n(h*.25)}" font-family="${filmFont}" font-size="${n(size)}" fill="#f2f0e8" opacity="${n(smooth((t-word.start)/.1))}">${esc(word.text)}</text>`;x+=textWidth(word.text)*size+advance;}out+='</g>';
 }
 return `<g data-reference-edit="crab-lab">${out}</g>`;
}
