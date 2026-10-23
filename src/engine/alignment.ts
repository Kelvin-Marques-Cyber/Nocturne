// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Analysis,Word} from './model';
import {normalize} from './model';
import {tokenizeLyrics,tokenizeLine,type Language} from './language';
import {clamp,mix} from './math';
export interface Transcript {method?:string;language?:string;segments:{start:number;end:number;text:string;words?:{text:string;start:number;end:number;confidence?:number}[]}[]}
function similarity(a:string,b:string){
 a=normalize(a);b=normalize(b);if(a===b)return 1;if(Math.min(a.length,b.length)<4)return 0;
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
 return 1-row[b.length]/Math.max(a.length,b.length);
}

function reusePriorTiming(tokens:ReturnType<typeof tokenizeLyrics>,prior:Word[],duration:number):Word[]|undefined{
 const N=tokens.length,M=prior.length;if(!N||!M||N*M>2_000_000)return;
 const current=tokens.map(t=>normalize(t.text)),older=prior.map(w=>normalize(w.text)),width=M+1,dp=new Uint16Array((N+1)*width);
 for(let i=N-1;i>=0;i--)for(let j=M-1;j>=0;j--){
  const k=i*width+j;dp[k]=current[i]&&current[i]===older[j]?1+dp[(i+1)*width+j+1]:Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
 }
 const anchors:[number,number][]=[];
 for(let i=0,j=0;i<N&&j<M;){
  if(current[i]&&current[i]===older[j]&&dp[i*width+j]===dp[(i+1)*width+j+1]+1){anchors.push([i,j]);i++;j++;}
  else if(dp[(i+1)*width+j]>=dp[i*width+j+1])i++;else j++;
 }
 if(anchors.length/Math.max(N,M)<.6)return; // Different song: do not inherit timestamps.
 const words:Word[]=tokens.map((t,k)=>({id:'w'+k,text:t.text,line:t.line,start:0,end:0,confidence:.2,source:'interpolated'}));
 for(const [i,j]of anchors){const w=prior[j];Object.assign(words[i],{start:w.start,end:w.end,confidence:w.confidence,source:w.source});}
 let previousIndex=-1;
 for(const [nextIndex]of [...anchors,[N,M] as [number,number]]){
  const missing=nextIndex-previousIndex-1;
  if(missing){
   const from=previousIndex<0?0:words[previousIndex].end,to=nextIndex===N?duration:words[nextIndex].start;
   const weights=words.slice(previousIndex+1,nextIndex).map(w=>Math.max(1,normalize(w.text).length**.6)),total=weights.reduce((sum,w)=>sum+w,0);
   let portion=0;
   for(let k=previousIndex+1;k<nextIndex;k++){
    const start=from+Math.max(0,to-from)*portion/total;portion+=weights[k-previousIndex-1];
    const end=from+Math.max(0,to-from)*portion/total;
    words[k].start=start;words[k].end=Math.max(start+.008,end);
   }
  }
  previousIndex=nextIndex;
 }
 let previousEnd=0;
 for(let k=0;k<N;k++){
  const w=words[k],remaining=(N-k)*.008;
  w.start=clamp(Math.max(previousEnd,w.start),0,duration-remaining);
  w.end=clamp(Math.max(w.end,w.start+.008),w.start+.008,duration-remaining+.008);
  previousEnd=w.end;
 }
 return words;
}

export function alignLyrics(lyrics:string,analysis:Analysis,transcript?:Transcript,language:Language='auto',priorWords:Word[]=[]){
 const tokens=tokenizeLyrics(lyrics,language);

 if(!tokens.length)return {words:[]as Word[],coverage:0,method:'no-lyrics',notes:['Sem letra. Cenas instrumentais.']};
 // Regenerating text without another transcript must preserve already-aligned words.
 if(!transcript?.segments?.some(s=>s.words?.length)&&priorWords.length){
  const words=reusePriorTiming(tokens,priorWords,analysis.duration);
  if(words){
   const recognized=words.filter(w=>w.source==='asr'||w.source==='manual').length;
   return{words,coverage:recognized/words.length,method:'retained timed lyrics after text edit',notes:[recognized+'/'+words.length+' palavras com tempos ASR ou manuais preservados.','Palavras inseridas interpoladas; revise os trechos editados.']};
  }
 }

 const observed=(transcript?.segments??[]).flatMap(s=>s.words??[]).flatMap(w=>{const pieces=tokenizeLine(w.text,language),total=Math.max(1,pieces.reduce((n,x)=>n+normalize(x).length,0));let cursor=w.start;return pieces.map(text=>{const start=cursor;cursor+=(w.end-w.start)*normalize(text).length/total;return{...w,text,start,end:cursor,segmented:pieces.length>1};});}).filter(w=>w.end>w.start&&w.start>=0&&w.end<=analysis.duration+.1);
 const N=tokens.length,M=observed.length,dp=new Float32Array((N+1)*(M+1)),prev=new Uint8Array((N+1)*(M+1));
 for(let i=1;i<=N;i++){dp[i*(M+1)]=i;prev[i*(M+1)]=1;}for(let j=1;j<=M;j++){dp[j]=j;prev[j]=2;}
 for(let i=1;i<=N;i++)for(let j=1;j<=M;j++){
  const sim=similarity(tokens[i-1].text,observed[j-1].text),idx=i*(M+1)+j;
  const choices=[dp[(i-1)*(M+1)+j-1]+(sim===1?0:sim>=.72?.45:1.7),dp[(i-1)*(M+1)+j]+1,dp[i*(M+1)+j-1]+1];
  const k=choices.indexOf(Math.min(...choices));dp[idx]=choices[k];prev[idx]=k;
 }
 const anchors=new Map<number,typeof observed[number]>();let i=N,j=M;
 while(i||j){const k=prev[i*(M+1)+j];if(k===0&&i&&j){const sim=similarity(tokens[i-1].text,observed[j-1].text);if(sim>=.72)anchors.set(i-1,{...observed[j-1],confidence:(observed[j-1].confidence??.8)*sim});i--;j--;}else if((k===1||!j)&&i)i--;else j--;}
 // Reject time-inverted anchors and duplicate zero-length words from ASR.
 let lastEnd=0;for(const k of [...anchors.keys()].sort((a,b)=>a-b)){const a=anchors.get(k)!;if(a.start<lastEnd-.04)anchors.delete(k);else lastEnd=a.end;}
 const words:Word[]=tokens.map((t,k)=>({id:`w${k}`,text:t.text,line:t.line,start:0,end:0,confidence:0,source:'estimated'}));
 const lead=observed.length?Math.max(0,observed[0].start):analysis.vocalRegions[0]?.start??1;
 const tail=observed.length?Math.min(analysis.duration,observed.at(-1)!.end):Math.max(lead+.1,analysis.duration-2);
 const keys=[-1,...[...anchors.keys()].sort((a,b)=>a-b),N];
 for(let z=0;z<keys.length-1;z++){
  const left=keys[z],right=keys[z+1];
  if(left>=0){const a=anchors.get(left)!;Object.assign(words[left],{start:a.start,end:Math.min(a.end,analysis.duration),confidence:a.segmented?Math.min(.45,a.confidence??.8):a.confidence??.8,source:a.segmented?'interpolated':'asr'});}
  const count=right-left-1;if(!count)continue;
  const from=left>=0?anchors.get(left)!.end:lead,to=right<N?anchors.get(right)!.start:tail;
  const weights=tokens.slice(left+1,right).map(t=>Math.max(1,normalize(t.text).length**.6)),total=weights.reduce((a,b)=>a+b,0);let offset=0;
  for(let k=left+1;k<right;k++){
   const duration=Math.max(.015,to-from),begin=from+duration*offset/total;offset+=weights[k-left-1];
   const end=from+duration*offset/total;
   const near=analysis.onsets.filter(v=>v>=begin-.055&&v<=begin+.055);
   const start=near.length?near.reduce((a,b)=>Math.abs(a-begin)<Math.abs(b-begin)?a:b):begin;
   Object.assign(words[k],{start:Math.max(from,start),end:Math.max(start+.015,end),confidence:anchors.size?.32:.12,source:anchors.size?'interpolated':'estimated'});
  }
 }
 // Keep all intervals monotonic, positive and within the original decoded audio.
 let end=0;for(let k=0;k<words.length;k++){
  const w=words[k],remaining=(words.length-k)*.008;
  w.start=clamp(Math.max(w.start,end),0,analysis.duration-remaining);w.end=clamp(Math.max(w.start+.008,w.end),w.start+.008,analysis.duration-remaining+.008);end=w.end;
 }
 const recognized=words.filter(w=>w.source==='asr').length,coverage=recognized/N;
 return {words,coverage,method:observed.length?'ASR word anchors + monotonic sequence alignment + onset interpolation':'spectral pacing estimate (NOT forced alignment)',notes:[`${recognized}/${N} palavras com âncoras reconhecidas.`,`Palavras ${observed.length?'interpoladas':'estimadas'} precisam de revisão; não são alinhamento fonético.`,...(coverage<.8?['Confiança limitada: revise na linha do tempo antes de publicar.']:[])]};
}
