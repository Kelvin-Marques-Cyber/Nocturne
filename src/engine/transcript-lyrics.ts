// SPDX-License-Identifier: Apache-2.0
import type {Transcript} from './alignment';
import {joinWords} from './language';
// Line breaks are editorial; every word keeps the recognizer's own timestamp.
export function transcriptLyrics(transcript:Transcript):string{
 const words=transcript.segments.flatMap(s=>s.words??[]).filter(w=>w.text.trim()&&w.end>w.start).sort((a,b)=>a.start-b.start);
 if(!words.length)return transcript.segments.map(s=>s.text.trim()).filter(Boolean).join('\n\n');
 const lines:string[]=[],row:typeof words=[];let lineCount=0;
 const flush=()=>{if(!row.length)return;lines.push(joinWords(row));row.length=0;lineCount++;};
 words.forEach((word,i)=>{
  const previous=words[i-1],gap=previous?word.start-previous.end:0,length=joinWords([...row,word]).length;
  if(row.length&&(length>46||gap>.55||row.length>=9))flush();
  if(previous&&(gap>1.4||lineCount>=4&&/[.!?。！？]$/.test(previous.text))){flush();if(lines.at(-1)!=='')lines.push('');lineCount=0;}
  row.push({...word,text:word.text.trim()});
 });flush();return lines.join('\n').trim();
}
