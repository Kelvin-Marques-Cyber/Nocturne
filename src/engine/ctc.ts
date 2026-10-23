// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Transcript} from './alignment';
import {lexical,tokenizeLyrics,type Language} from './language';
const alphabet="-aienoutsrmkldghybpwcvjzf'qx";
const characters=(text:string)=>lexical(text).replace(/[^a-z]/g,'').replace(/([aeiou])\1{2,}/g,'$1');
export function acousticLyricTokens(lyrics:string,language:Language='auto',title?:string){
 const tokens=tokenizeLyrics(lyrics,language,title);
 return tokens.length&&tokens.every(w=>characters(w.text)&&!/[\p{L}\p{N}]/u.test(lexical(w.text).replace(/[a-z]/g,'')))?tokens:undefined;
}
// CTC Viterbi alignment uses the supplied lyric as its target. It does not
// distribute missing words by their spelling length or invent a transcription.
// Checkpoints keep traceback memory bounded for long recordings.
export async function alignCTC(emissions:Float32Array,times:ArrayLike<number>,tokens:{text:string;line:number}[],progress:(percent:number)=>void=()=>{}):Promise<Transcript>{
 const frames=times.length,columns=29,encoded=tokens.map(w=>[...characters(w.text)].map(c=>alphabet.indexOf(c))),target=encoded.flat();
 if(!frames||emissions.length!==frames*columns||!target.length||target.some(id=>id<1)||frames<target.length)throw Error('Áudio ou letra insuficientes para o alinhamento acústico.');
 const states=target.length*2+1,labels=new Int32Array(states),skips=new Uint8Array(states),block=256;
 target.forEach((id,i)=>{labels[i*2+1]=id;});
 for(let s=2;s<states;s++)skips[s]=Number(labels[s]!==0&&labels[s]!==labels[s-2]);
 let current=new Float32Array(states).fill(-Infinity),next=new Float32Array(states);current[0]=0;
 const checkpoints:Float32Array[]=[];
 const advance=(frame:number,trace?:Uint8Array,offset=0)=>{
  const row=frame*columns;
  for(let s=0;s<states;s++){
   let best=current[s],move=0;
   if(s&&current[s-1]>best){best=current[s-1];move=1;}
   if(skips[s]&&current[s-2]>best){best=current[s-2];move=2;}
   next[s]=best+emissions[row+labels[s]];
   if(trace)trace[offset+s]=move;
  }
  [current,next]=[next,current];
 };
 for(let frame=0;frame<frames;frame++){
  if(frame%block===0){checkpoints.push(current.slice());progress(frame/frames*50);}
  advance(frame);
 }
 let state=current[states-1]>current[states-2]?states-1:states-2;
 if(!Number.isFinite(current[state]))throw Error('Não foi possível alinhar toda a letra à gravação.');
 const starts=new Int32Array(target.length).fill(frames),ends=new Int32Array(target.length),scores=new Float64Array(target.length),counts=new Uint32Array(target.length);
 for(let section=checkpoints.length-1;section>=0;section--){
  const from=section*block,to=Math.min(frames,from+block),trace=new Uint8Array((to-from)*states);
  current=checkpoints[section].slice();next=new Float32Array(states);
  for(let frame=from;frame<to;frame++)advance(frame,trace,(frame-from)*states);
  for(let frame=to-1;frame>=from;frame--){
   if(state%2){const char=(state-1)/2;starts[char]=frame;ends[char]=Math.max(ends[char],frame);scores[char]+=emissions[frame*columns+labels[state]];counts[char]++;}
   state-=trace[(frame-from)*states+state];
  }
  progress(50+(checkpoints.length-section)/checkpoints.length*50);
 }
 let character=0;
 const words=tokens.map((word,index)=>{
  const count=encoded[index].length,first=character,last=character+count-1;character+=count;
  let score=0;for(let c=first;c<=last;c++)score+=scores[c]/Math.max(1,counts[c]);
  let onset=first,offset=last;
  // A faint consonant can be matched to noise seconds before its vowel.
  // Discard only isolated, weak edge phonemes; retain sustained strong sounds.
  const confidence=(c:number)=>Math.exp(scores[c]/Math.max(1,counts[c]));
  while(onset<offset&&times[starts[onset+1]]-times[ends[onset]]>.5&&confidence(onset)<.15)onset++;
  while(offset>onset&&times[starts[offset]]-times[ends[offset-1]]>.5&&confidence(offset)<.15)offset--;
  const start=Math.max(0,times[starts[onset]]-(onset>first?.1:.04)),end=times[ends[offset]]+.04;
  return{text:word.text,start,end:Math.max(start+.008,end),confidence:Math.max(0,Math.min(1,Math.exp(score/count)))};
 });
 for(let i=0;i<words.length-1;i++)words[i].end=Math.max(words[i].start+.008,Math.min(words[i].end,words[i+1].start));
 return{method:'mms-ctc-forced-alignment-v1',segments:[{start:words[0].start,end:words.at(-1)!.end,text:words.map(w=>w.text).join(' '),words}]};
}
