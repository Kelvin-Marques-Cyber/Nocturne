// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {parseArgs} from 'node:util';
import {readFile} from 'node:fs/promises';
import {renderVideo} from './renderer';
import type {Project} from '../src/engine/model';
const {values:v}=parseArgs({options:{project:{type:'string',default:'projects/deus-nos-ve.json'},out:{type:'string',default:'output/deus-nos-ve-vertical.mp4'},from:{type:'string'},duration:{type:'string'},format:{type:'string'},fps:{type:'string'},width:{type:'string'},height:{type:'string'},preset:{type:'string',default:'fast'}}});
const p=JSON.parse(await readFile(v.project!,'utf8'))as Project;
if(v.format){if(!['vertical','horizontal'].includes(v.format))throw Error('--format: vertical ou horizontal');p.format=v.format as Project['format'];}
if(v.fps){if(!['30','60'].includes(v.fps))throw Error('--fps: 30 ou 60');p.fps=Number(v.fps)as 30|60;}
const report=await renderVideo(p,{output:v.out!,from:v.from===undefined?undefined:Number(v.from),duration:v.duration===undefined?undefined:Number(v.duration),width:v.width?Number(v.width):undefined,height:v.height?Number(v.height):undefined,preset:v.preset,onProgress:x=>console.log(JSON.stringify({type:'progress',...x}))});
console.log(JSON.stringify({type:'complete',...report}));
