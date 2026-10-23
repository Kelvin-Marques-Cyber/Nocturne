// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project} from './model';
import {cameraRecipes,typographyRecipes,gestureRecipes,textureRecipes,rhythmRecipes,beatStyles,type GestureKind} from './catalog';
import {analyzeMeaning} from './semantics';
import {vocalDelivery,lineDelivery} from './voice';
import {planLyricFocus} from './focus';
import {rand} from './math';

const gestureCache=new Map<string,GestureKind>();
export function semanticGesture(text:string,fallback:GestureKind='explain'):GestureKind {
 const key=fallback+'|'+text,cached=gestureCache.get(key);if(cached)return cached;
 const concept=analyzeMeaning(text).hits[0]?.concept;
 const result=({choice:'question',refusal:'refuse',heart:'protect',soul:'appeal','known-soul':'protect',voice:'listen',escape:'search',rest:'release',fall:'resolve',stars:'point',scale:'search',mirror:'question',storm:'protect',ocean:'grieve',threshold:'appeal',time:'listen',sight:'welcome',emotion:'explain',bridge:'reachout',forest:'search',city:'remember',desert:'carry',staircase:'promise',cage:'shield',eclipse:'doubt',prism:'offer',farewell:'farewell',abyss:'reachout',valley:'resolve',mountain:'resolve',lighthouse:'search',river:'release',waterfall:'release',lake:'listen',island:'search',cave:'shield',canyon:'doubt',home:'welcome',sanctuary:'appeal',table:'offer',garden:'offer',roots:'protect',seed:'promise',flower:'offer',wings:'release',broken:'grieve',thread:'reachout',compass:'search',map:'point',train:'farewell',station:'listen',boat:'resolve',anchor:'promise',hourglass:'remember',book:'explain',letter:'offer',photograph:'remember',fire:'resolve',candle:'protect',snow:'shield',wind:'shield',sunrise:'welcome',moon:'point',cross:'appeal',crown:'offer',scales:'doubt',hands:'reachout'} as Record<string,GestureKind>)[concept??'']??fallback;
 if(gestureCache.size>2048)gestureCache.clear();gestureCache.set(key,result);return result;
}
export function directPerformance(project:Project,variation=0,replan=true):Project {
 if(!Number.isSafeInteger(variation)||variation<0)throw Error('Variação inválida.');
 let previousCamera='',previousType='',previousTexture='';
 const scenes=(replan?planLyricFocus(project.scenes,project.words,project.language,project.analysis):project.scenes).map((scene,index)=>{
  const words=project.words.filter(w=>scene.wordIds.includes(w.id)),text=words.map(w=>w.text).join(' '),hash=[...text].reduce((a,c)=>Math.imul(a^c.codePointAt(0)!,16777619),2166136261),seed=project.seed+hash+index*173+variation*8191;
  const phrases=[...new Set(words.map(w=>w.line))].map(line=>lineDelivery(project.analysis,words.filter(w=>w.line===line),scene.events)),delivery=phrases.find(d=>d.kind==='shout')??phrases.find(d=>d.kind!=='neutral')??vocalDelivery(project.analysis,words);
  const gentle=delivery.kind==='whisper'||scene.kind==='rest',shout=delivery.kind==='shout';
  const allowed=shout?['snap','recoil','depth']:gentle?['dolly','float','crane']:cameraRecipes.map(c=>c.id.split('-')[0]);
  const cameraPool=cameraRecipes.filter(c=>allowed.includes(c.id.split('-')[0]));
  const pick=<T extends{id:string}>(pool:T[],salt:number,last='')=>{let i=Math.floor(rand(seed+salt)*pool.length);if(pool.length>1&&pool[i].id===last)i=(i+1)%pool.length;return pool[i];};
  const camera=pick(cameraPool,13,previousCamera),typePool=shout?typographyRecipes.filter(t=>t.face.weight===700&&!t.outline):typographyRecipes;
  const reelFaces=shout?['sans','mono-bold','lm-sans-bold']:gentle?['mono','lm-light','lm-sans','sans-book']:['mono','mono-bold','sans','lm-sans-bold','lm-condensed'];
  const type=pick(project.direction==='reel'?typePool.filter(type=>reelFaces.includes(type.face.id)&&!type.outline):typePool,29,previousType),gesturePool=gestureRecipes.filter(g=>g.kind===semanticGesture(text));
  const gesture=pick(gentle?gesturePool.slice(0,2):shout?gesturePool.slice(2):gesturePool,47);
  const texturePool=textureRecipes.filter(t=>gentle?['clean','vignette-0','bloom-0','monochrome-0','sepia-0','lightleak-0','dust-0'].includes(t.id):!['invert','hazard','hud','letterbox','thermal','solarize','ink','emboss'].includes(t.type));
  const texture=pick(project.direction==='reel'?texturePool.filter(t=>['clean','scanlines-0','chromatic-0','dust-0','softfocus-0'].includes(t.id)):texturePool,83,previousTexture),rhythm=rhythmRecipes.find(r=>r.id===(shout?'accent':delivery.kind==='rising'?'swelling':delivery.kind==='sustained'?'suspended':gentle?'breath':index%2?'legato':'accent'))!;
  previousCamera=camera.id;previousType=type.id;previousTexture=texture.id;
  return{...scene,...(project.direction==='reel'&&replan?{camera:{...scene.camera,zoomFrom:1,zoomTo:1.07,focusX:.5,focusY:.52,roll:scene.kind==='corridor'?-1.8:0}}:{}),performance:{enabled:true,camera:camera.id,typography:type.id,gesture:gesture.id,texture:texture.id,rhythm:rhythm.id,intensity:gentle?.45:shout?1:.72,variation,beatSync:gentle?.3:.7,beatStyle:beatStyles[index%beatStyles.length]}};
 });
 return{...project,...(replan?{lyricFocusPolicy:'balanced-v1' as const}:{}),scenes};
}
