// SPDX-License-Identifier: Apache-2.0
import {Real3DRenderer} from './browser/real3d';
import {renderFrame} from './engine/frame';
import type {Project} from './engine/model';
const stage=new Real3DRenderer(document.getElementById('stage')as HTMLCanvasElement),overlay=document.getElementById('overlay')!;
let p:Project,w=1080,h=1920;
Object.assign(window,{
 nocturne3DReady:true,
 async nocturne3DInit(project:Project,width:number,height:number){p=project;w=width;h=height;await document.fonts.load('16px "DejaVu Sans Mono"');await document.fonts.ready;},
 nocturne3DFrame(frame:number){const t=Math.max(0,frame/p.fps-(p.visualSyncOffsetSeconds??0));stage.render(p,t,w,h);overlay.innerHTML=renderFrame(p,frame,{width:w,height:h});},
});
