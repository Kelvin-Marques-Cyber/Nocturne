// SPDX-License-Identifier: Apache-2.0
import type {Project} from '../engine/model';
import {renderFrame} from '../engine/frame';
import {loadFilmFonts,outlineText} from './fonts';
let project:Project,fonts:Awaited<ReturnType<typeof loadFilmFonts>>|undefined;
const cache=new Map<string,{d:string;width:number}>();
let queue=Promise.resolve();
self.onmessage=(event:MessageEvent)=>{
 const data=event.data;
 queue=queue.then(async()=>{
  try{
   if(data.type==='init'){
    project=data.project;cache.clear();fonts=data.outline?await loadFilmFonts(project.lyrics):undefined;
    self.postMessage({id:data.id,ready:true});return;
   }
   const svg=renderFrame(project,data.frame,{width:data.width,height:data.height});
   self.postMessage({id:data.id,svg:fonts?outlineText(svg,fonts,cache):svg});
  }catch(error){self.postMessage({id:data.id,error:String(error)});}
 });
};
