// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {readFile,writeFile,mkdir}from'node:fs/promises';
import{rasterize}from'../src/engine/raster';
import{resolve}from'node:path';
import{renderFrame}from'../src/engine/frame';
import type{Project}from'../src/engine/model';
const p=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8'))as Project;
await mkdir('output/frames',{recursive:true});
for(const s of p.scenes){const frame=Math.floor((s.start+Math.min(2,(s.end-s.start)*.6))*p.fps),svg=renderFrame(p,frame,{width:360,height:640});await writeFile('output/frames/'+s.id+'.png',await rasterize(svg));}
