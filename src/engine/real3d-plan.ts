// SPDX-License-Identifier: Apache-2.0
import type {Project,Scene} from './model';
import {clamp,sample,smooth} from './math';
import {resolvedEditProfile} from './reference-edits';
export function real3DScene(p:Project,t:number):Scene|undefined{
 const s=p.scenes.find(s=>t>=s.start&&t<s.end)??p.scenes.at(-1);
 return p.direction==='reel'&&s&&resolvedEditProfile(p,s)==='crab-lab'?s:undefined;
}
export function hasReal3D(p:Project){return p.direction==='reel'&&p.scenes.some(s=>resolvedEditProfile(p,s)==='crab-lab');}
/** Absolute musical phase, with continuous interpolation between measured beats.
 * Seeking in either direction produces exactly the same gait and foot contacts. */
export function musicalPhase(p:Project,t:number){
 const beats=p.analysis.beats;let lo=0,hi=beats.length-1,index=-1;
 while(lo<=hi){const m=(lo+hi)>>>1;if(beats[m]<=t){index=m;lo=m+1;}else hi=m-1;}
 if(index<0)return t*p.analysis.bpm/60;
 return index+clamp((t-beats[index])/Math.max(.12,(beats[index+1]??beats[index]+60/p.analysis.bpm)-beats[index]));
}
export function real3DState(p:Project,s:Scene,t:number){
 const q=clamp((t-s.start)/(s.end-s.start)),energy=sample(p.analysis.energy,p.analysis.hopSeconds,t),phase=musicalPhase(p,t);
 return {q,energy,phase,travel:(phase-musicalPhase(p,s.start))*.25,yaw:-.15,wire:smooth((q-.34)/.035)*(1-smooth((q-.51)/.035)),close:smooth((q-.62)/.14)*.18};
}
