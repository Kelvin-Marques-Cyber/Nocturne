// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {alignLyrics,type Transcript} from './alignment';
import type {Language} from './language';
type TimedWord=NonNullable<Transcript['segments'][number]['words']>[number];
export function acousticRecoveryRegions(words:TimedWord[],duration:number){
 const regions:{start:number;end:number;text:string}[]=[];
 for(let i=0;i<words.length;){
  if((words[i].confidence??0)>=.15){i++;continue;}
  const first=i;while(i<words.length&&(words[i].confidence??0)<.15)i++;
  if(i-first<2)continue;
  const left=Math.max(0,first-1),right=Math.min(words.length-1,i),start=Math.max(0,words[left].start-.7),end=Math.min(duration,words[right].end+.7);
  const last=regions.at(-1),text=words.slice(left,right+1).map(w=>w.text).join(' ');
  if(last&&start<=last.end+1){last.end=Math.max(last.end,end);last.text+=' '+text;}
  else if(end>start+.3)regions.push({start,end,text});
 }
 return regions;
}
export function combineAcousticAndSpeech(lyrics:string,acoustic:Transcript,speech:Transcript,duration:number,language:Language='auto',title?:string):Transcript{
 const spoken=alignLyrics(lyrics,{duration,onsets:[],vocalRegions:[]},speech,language,[],title).words,forced=acoustic.segments.flatMap(s=>s.words??[]);
 const candidates:{index:number;word:TimedWord;weight:number}[]=[];
 for(let index=0;index<forced.length;index++){
  const word=forced[index],other=spoken[index],anchored=other?.source==='asr';
  const confirmed=anchored&&other.confidence>=.5&&(word.confidence??0)>=.003&&Math.abs(word.start-other.start)<=.75&&Math.abs((word.end-word.start)-(other.end-other.start))<=1;
  if(((word.confidence??0)>=.15||confirmed)&&(!anchored||Math.abs(word.start-other.start)<=3)){
   const end=anchored&&(word.end>other.end+1||other.end>word.end&&other.end-word.end<1.5)?Math.max(word.start+.008,other.end):word.end;
   candidates.push({index,word:{...word,end},weight:3+(word.confidence??0)});
  }
  if(anchored)candidates.push({index,word:other,weight:1.3+other.confidence*.4});
 }
 // Choose one consistent chain. A doubtful late anchor must not push every
 // subsequent word forward, and two methods must not duplicate the same lyric.
 const scores=new Float64Array(candidates.length),previous=new Int32Array(candidates.length).fill(-1);let best=-1;
 for(let i=0;i<candidates.length;i++){
  const current=candidates[i];scores[i]=current.weight;
  for(let j=0;j<i;j++){
   const before=candidates[j];
   if(before.index>=current.index||before.word.end>current.word.start+.04)continue;
   const score=scores[j]+current.weight;if(score>scores[i]){scores[i]=score;previous[i]=j;}
  }
  if(best<0||scores[i]>scores[best])best=i;
 }
 const words:TimedWord[]=[];for(let i=best;i>=0;i=previous[i])words.push(candidates[i].word);words.reverse();
 if(!words.length)throw Error('A voz não forneceu âncoras confiáveis para esta letra. Os tempos anteriores foram preservados.');
 return{method:'mms-ctc+whisper-small-word-anchors-v1',segments:[{start:words[0].start,end:words.at(-1)!.end,text:words.map(w=>w.text).join(' '),words}]};
}
