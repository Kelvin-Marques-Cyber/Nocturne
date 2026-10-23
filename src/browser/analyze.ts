// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{Analysis}from'../engine/model';
import{clamp}from'../engine/math';
function fft(re:Float32Array,im:Float32Array){
 const N=re.length;for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
 for(let len=2;len<=N;len<<=1){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let start=0;start<N;start+=len){let ur=1,ui=0;for(let j=0;j<len/2;j++){const a=start+j,b=a+len/2,vr=re[b]*ur-im[b]*ui,vi=re[b]*ui+im[b]*ur;re[b]=re[a]-vr;im[b]=im[a]-vi;re[a]+=vr;im[a]+=vi;const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;}}}
}
const normalize=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b),top=sorted[Math.floor(sorted.length*.97)]||1;return values.map(v=>Number(clamp(v/top).toFixed(4)));};
export function analyzeSamples(samples:Float32Array,sampleRate:number):Analysis{
 const hop=Math.round(sampleRate*.02),size=1024,dt=hop/sampleRate,N=Math.ceil(samples.length/hop),energy:number[]=[],low:number[]=[],high:number[]=[],flux:number[]=[],re=new Float32Array(size),im=new Float32Array(size),last=new Float32Array(size/2);
 for(let f=0;f<N;f++){
  let rms=0;for(let i=0;i<size;i++){const v=samples[f*hop+i]??0;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));im[i]=0;rms+=v*v;}energy.push(Math.sqrt(rms/size));fft(re,im);
  let bass=0,treble=0,novelty=0,mass=0;for(let i=2;i<size/2;i++){const hz=i*sampleRate/size,value=Math.log1p(Math.hypot(re[i],im[i]));mass+=value;novelty+=Math.max(0,value-last[i]);last[i]=value;if(hz<250)bass+=value;if(hz>2200&&hz<8000)treble+=value;}low.push(bass);high.push(treble);flux.push(novelty/Math.max(1e-9,mass));
 }
 const env=normalize(energy),onset=normalize(flux),lo=normalize(low),hi=normalize(high),onsets:number[]=[];
 for(let i=2;i<N-2;i++){const from=Math.max(0,i-18),to=Math.min(N,i+19),mean=onset.slice(from,to).reduce((n,x)=>n+x,0)/(to-from);if(flux[i]>.012&&onset[i]>Math.max(.16,mean*1.5)&&onset[i]>=onset[i-1]&&onset[i]>onset[i+1]&&i*dt-(onsets.at(-1)??-1)>.1)onsets.push(Number((i*dt).toFixed(4)));}
 let bestLag=25,best=0,second=0;for(let lag=Math.round(.3/dt);lag<=Math.round(1/dt);lag++){let score=0;for(let i=lag;i<N;i++)score+=onset[i]*onset[i-lag];score/=Math.max(1,N-lag);if(score>best){second=best;best=score;bestLag=lag;}}
 const rhythmic=onsets.length>=4,bpm=rhythmic?Number((60/(bestLag*dt)).toFixed(2)):120,period=60/bpm,duration=samples.length/sampleRate;
 let phase=0,phaseScore=-1;for(let offset=0;offset<bestLag;offset++){let score=0;for(let j=offset;j<N;j+=bestLag)score+=onset[j];if(score>phaseScore){phaseScore=score;phase=offset*dt;}}
 const beats:number[]=[];for(let t=phase;rhythmic&&t<duration;t+=period){const candidates=onsets.filter(v=>Math.abs(t-v)<.065);beats.push(Number((candidates.sort((a,b)=>Math.abs(a-t)-Math.abs(b-t))[0]??t).toFixed(4)));}
 const ranges=(predicate:(i:number)=>boolean,min:number)=>{const out:{start:number;end:number}[]=[];let start=-1;for(let i=0;i<=N;i++){if(i<N&&predicate(i)){if(start<0)start=i;}else if(start>=0){if((i-start)*dt>=min)out.push({start:start*dt,end:Math.min(duration,i*dt)});start=-1;}}return out;};
 const silences=ranges(i=>energy[i]<.0035,.18),vocalRegions=ranges(i=>env[i]>.16&&hi[i]>.14,.3).map(s=>({...s,confidence:.25}));
 const boundaries=[0];for(let i=Math.round(3/dt);i<N-Math.round(2/dt);i+=Math.round(.5/dt)){const span=Math.round(1.5/dt),left=env.slice(i-span,i).reduce((a,b)=>a+b,0)/span,right=env.slice(i,i+span).reduce((a,b)=>a+b,0)/span;if(Math.abs(right-left)>.22&&i*dt-boundaries.at(-1)!>4)boundaries.push(i*dt);}boundaries.push(duration);
 return{duration,sampleRate,hopSeconds:dt,bpm,tempoConfidence:rhythmic?clamp(best>.005?.4+(best-second)/best:0,0,.85):0,beats,onsets,impacts:onsets.filter(t=>onset[Math.round(t/dt)]>.7),energy:env,low:lo,high:hi,silences,vocalRegions,sections:boundaries.slice(0,-1).map((start,i)=>{const end=boundaries[i+1],slice=env.slice(Math.floor(start/dt),Math.ceil(end/dt));return{start,end,energy:slice.reduce((a,b)=>a+b,0)/Math.max(1,slice.length)};}),method:'browser STFT + spectral flux + autocorrelation (no speech recognition)',warnings:['BPM pode ter ambiguidade de metade/dobro.','Regiões vocais são candidatos espectrais, não detecção de voz separada.','Tempos da letra exigem ASR importado ou ajuste manual.']};
}
