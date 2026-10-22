// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import sharp from 'sharp';
import{readFile}from'node:fs/promises';
import{rasterize}from'../src/engine/raster';
import{renderFrame}from'../src/engine/frame';
import type{Project,SceneKind}from'../src/engine/model';
const p=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8'))as Project;
const kinds:SceneKind[]=['constellation','television','tunnel3d','denial'];
const shots=await Promise.all(kinds.map(async kind=>{const s=p.scenes.find(s=>s.kind===kind)!;return rasterize(renderFrame(p,(s.start+Math.min(2,s.end-s.start-.1))*p.fps,{width:270,height:480}));}));
await sharp({create:{width:1080,height:480,channels:3,background:'#08090b'}}).composite(shots.map((input,i)=>({input,left:i*270,top:0}))).png().toFile('docs/cenas.png');
