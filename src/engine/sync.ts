// SPDX-License-Identifier: Apache-2.0
import type {Project} from './model';
import {clamp} from './math';
export const audioFrame=(seconds:number,fps:number)=>Math.floor(Math.max(0,seconds)*fps);
// Drop late worker frames instead of painting yesterday's lyric over today's vocal.
export const frameMatchesAudio=(frame:number,time:number,fps:number)=>Math.abs(frame-audioFrame(time,fps))<=2;

// Manual fallback for sung material that automated transcription cannot align.
export function markWordAtAudio(project:Project,wordId:string,audioSeconds:number):Project{
 if(!Number.isFinite(audioSeconds))return project;
 const index=project.words.findIndex(w=>w.id===wordId);if(index<0)return project;
 const words=project.words.map(w=>({...w})),word=words[index];
 const min=index?words[index-1].start+.008:0;
 const nextStart=index<words.length-1?words[index+1].start:project.duration;
 const max=Math.min(project.duration-.008,nextStart-.008);
 if(max<=min)return project;
 const start=clamp(audioSeconds-(project.visualSyncOffsetSeconds??0),min,max);
 const duration=word.end-word.start;
 word.start=start;word.end=clamp(start+duration,start+.008,Math.min(project.duration,nextStart));
 word.source='manual';word.confidence=1;
 return{...project,words,scenes:project.scenes.map(s=>({...s,events:s.events.map(e=>e.wordId===word.id?{...e,at:start}:e)}))};
}
