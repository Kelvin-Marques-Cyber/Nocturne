// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {lexical,languages,type Language} from './language';
import {textureKinds,validPerformance,type Performance} from './catalog';
import {deliveries,type Delivery} from './voice';
export const transitions=['cut','shutter','dissolve','ink','channel','iris','whip','burn','zoom','split','mosaic','filmstrip','ripple','raster','aperture','typewriter','crosszoom'] as const;
export const kinds = ['constellation','heart','corridor','choice','echo','hide','soul','fall','denial','orbit','rest','terminal','ocean','door','lift','television','tunnel3d','mirror','storm','clock','bridge','forest','city','desert','staircase','cage','eclipse','prism','guitar','piano','drums'] as const;
export type SceneKind=typeof kinds[number];
export const actions=['idle','walk','run','stumble','fall','kneel','rise','crawl','fear','hesitate','surprise','hold','push','drag','reach','rest','turn','brace','float','recoil'] as const;
export type Action=typeof actions[number];
export type Point=[number,number];
export interface Word {id:string; text:string;start:number;end:number;line:number;confidence:number;source:'asr'|'interpolated'|'manual'|'estimated'}
export interface VocalRegion {start:number;end:number;confidence:number}
export interface VoiceAnalysis {source:'mix'|'isolated';method:string;energy:number[];presence:number[];pitch:number[];confidence:number[]}
export interface Analysis {duration:number;sampleRate:number;hopSeconds:number;bpm:number;tempoConfidence:number;beats:number[];onsets:number[];impacts:number[];energy:number[];low:number[];high:number[];voice?:VoiceAnalysis;silences:{start:number;end:number}[];vocalRegions:VocalRegion[];sections:{start:number;end:number;energy:number}[];method:string;warnings:string[]}
export interface Character {name:string;stroke:string;thickness:number;scale:number;head:number;heart:boolean}
export interface Camera {zoomFrom:number;zoomTo:number;panX:number;panY:number;roll:number;shake:number;lyricFocus?:number;focusX?:number;focusY?:number}
export interface SceneEvent {at:number;duration:number;type:'impact'|'freeze'|'glitch'|'flash'|'word'|'focus';strength:number;wordId?:string;focusMode?:'phrase'|'word';delivery?:Delivery}
export interface Motion {action:Action;start:number;end:number;weight?:number}
export interface Scene {id:string;start:number;end:number;kind:SceneKind;title:string;intent:string;code:string;wordIds:string[];accent:string;variant:number;camera:Camera;motions:Motion[];events:SceneEvent[];transition:typeof transitions[number];performance?:Performance;meaning?:{language:Language;concepts:string[];keywords:string[]}}
export const filterTypes=textureKinds;
export type FilterType=typeof filterTypes[number];
export interface FilmFilter{id:string;type:FilterType;amount:number;enabled:boolean}
export interface Style {name:'terminal-noir'|'chalk'|'signal'|'datamosh'|'acid-industrial'|'emerald';filters?:FilmFilter[];background:string;foreground:string;accent:string;grain:number;glitch:number;chromatic:number;vhs:number;captions:boolean}
export interface Project {schemaVersion:1;id:string;title:string;artist:string;language?:Language;seed:number;duration:number;audio:string;lyrics:string;fps:30|60;format:'vertical'|'horizontal';analysis:Analysis;words:Word[];scenes:Scene[];character:Character;style:Style;alignment:{method:string;coverage:number;reviewRequired:boolean;notes:string[]}}
const fx=(type:FilterType,amount:number):FilmFilter=>({id:type,type,amount,enabled:true});
export const styles:Record<Style['name'],Style>={
 'terminal-noir':{name:'terminal-noir',background:'#08090b',foreground:'#e9e5dc',accent:'#ed3e43',grain:.22,glitch:.28,chromatic:.35,vhs:.16,captions:true},
 chalk:{name:'chalk',background:'#111311',foreground:'#f0e9d8',accent:'#ed7155',grain:.35,glitch:.06,chromatic:.08,vhs:.08,captions:true},
 signal:{name:'signal',background:'#02070b',foreground:'#d8ebf0',accent:'#ff344d',grain:.15,glitch:.5,chromatic:.6,vhs:.32,captions:true},
 datamosh:{name:'datamosh',background:'#050607',foreground:'#d8dddb',accent:'#f3f3ea',grain:.37,glitch:.42,chromatic:0,vhs:.3,captions:true,filters:[fx('monochrome',1),fx('contrast',.3),fx('datamosh',.7),fx('scanlines',.25)]},
 'acid-industrial':{name:'acid-industrial',background:'#080c07',foreground:'#e0e6d9',accent:'#c4f525',grain:.15,glitch:.23,chromatic:.2,vhs:.13,captions:true,filters:[fx('contrast',.2),fx('hazard',.75),fx('hud',.6),fx('chromatic',.35)]},
 emerald:{name:'emerald',background:'#03150e',foreground:'#d4f7de',accent:'#5beaa0',grain:.25,glitch:.1,chromatic:.08,vhs:.18,captions:true,filters:[fx('duotone',.8),fx('bloom',.45),fx('vignette',.45),fx('letterbox',.25)]}
};
export function dimensions(format:Project['format']) {return format==='vertical'?{width:1080,height:1920}:{width:1920,height:1080};}
export function normalize(s:string){return lexical(s).replace(/[^\p{L}\p{N}]/gu,'');}
export function retimeScene(scene:Scene,start:number,end:number):Scene{
 const old=scene.end-scene.start,scale=(end-start)/old;
 return{...scene,start,end,motions:scene.motions.map(m=>({...m,start:start+(m.start-scene.start)*scale,end:start+(m.end-scene.start)*scale}))};
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function validateProject(value:unknown): asserts value is Project {
 const p=value as Project;
 if(!p||p.schemaVersion!==1||!Array.isArray(p.scenes)||!p.scenes.length||!Array.isArray(p.words)||typeof p.audio!=='string'||typeof p.lyrics!=='string')throw Error('Projeto JSON inválido (schemaVersion = 1).');
 if(!finite(p.duration)||p.duration<=0||p.duration>7200||![30,60].includes(p.fps)||!['vertical','horizontal'].includes(p.format))throw Error('Duração, formato ou FPS inválidos.');
 if(p.language!==undefined&&!Object.hasOwn(languages,p.language))throw Error('Idioma inválido.');
 if(!p.analysis||!Array.isArray(p.analysis.beats)||!Array.isArray(p.analysis.energy)||!finite(p.analysis.hopSeconds)||p.analysis.hopSeconds<=0)throw Error('Análise de áudio inválida.');
 if(p.analysis.voice){const v=p.analysis.voice,length=v.energy?.length;if(!['mix','isolated'].includes(v.source)||typeof v.method!=='string'||!length||length>Math.ceil(p.duration/p.analysis.hopSeconds)+3||[v.energy,v.presence,v.confidence,v.pitch].some(xs=>!Array.isArray(xs)||xs.length!==length||xs.some(x=>!finite(x)||x<0))||[v.energy,v.presence,v.confidence].some(xs=>xs.some(x=>x>1))||v.pitch.some(x=>x>2000))throw Error('Contorno vocal inválido.');}
 if(!p.style||!p.character||!finite(p.seed)||!finite(p.character.scale)||p.character.scale<=0||!finite(p.character.head)||!finite(p.character.thickness))throw Error('Personagem ou estilo inválido.');
 if(!Object.hasOwn(styles,p.style.name))throw Error('Estilo inválido.');
 if(p.style.filters!==undefined&&(!Array.isArray(p.style.filters)||p.style.filters.length>12||new Set(p.style.filters.map(f=>f.id)).size!==p.style.filters.length||p.style.filters.some(f=>!filterTypes.includes(f.type)||!finite(f.amount)||f.amount<0||f.amount>1||typeof f.enabled!=='boolean'||!/^[a-zA-Z0-9_-]{1,80}$/.test(f.id))))throw Error('Pilha de filtros inválida.');
 for(const v of [p.style.grain,p.style.glitch,p.style.chromatic,p.style.vhs])if(!finite(v)||v<0||v>1)throw Error('A intensidade dos efeitos deve estar entre zero e um.');
 for(const c of [p.style.background,p.style.foreground,p.style.accent,p.character.stroke])if(!/^#[\da-f]{6}$/i.test(c))throw Error('Use cores hexadecimais com seis dígitos.');
 let previous=0;
 const ids=new Set(p.words.map(w=>w.id));
 if(ids.size!==p.words.length||new Set(p.scenes.map(s=>s.id)).size!==p.scenes.length)throw Error('IDs duplicados no projeto.');
 for(const [i,s]of p.scenes.entries()){
  if(!finite(s.start)||!finite(s.end)||s.start<0||s.end<=s.start||Math.abs(s.start-previous)>.002||s.end>p.duration+.002||!kinds.includes(s.kind))throw Error(`Cena ${i+1}: ordem, intervalo ou metáfora inválidos.`);
  if(!Array.isArray(s.wordIds)||s.wordIds.some(id=>!ids.has(id))||!Array.isArray(s.motions)||!Array.isArray(s.events))throw Error(`Cena ${i+1}: referências inválidas.`);
  if([s.title,s.intent,s.code,s.accent,s.id].some(v=>typeof v!=='string')||!transitions.includes(s.transition))throw Error(`Cena ${i+1}: texto ou transição inválidos.`);
  if(!s.camera||Object.values(s.camera).some(v=>!finite(v))||s.camera.zoomFrom<=0||s.camera.zoomTo<=0)throw Error('Câmera inválida.');
  if(s.performance!==undefined&&!validPerformance(s.performance))throw Error('Receita de direção inválida.');
  for(const v of [s.camera.focusX,s.camera.focusY])if(v!==undefined&&(v<0||v>1))throw Error('O ponto de interesse da câmera deve estar dentro do quadro.');
  if(s.camera.lyricFocus!==undefined&&(s.camera.lyricFocus<0||s.camera.lyricFocus>1))throw Error('O foco da letra deve estar entre zero e um.');
  for(const m of s.motions)if(!actions.includes(m.action)||!finite(m.start)||!finite(m.end)||m.end<=m.start)throw Error('Movimento inválido.');
  for(const e of s.events)if(!finite(e.at)||!finite(e.duration)||e.duration<=0||!finite(e.strength)||!['impact','freeze','glitch','flash','word','focus'].includes(e.type)||(e.wordId&&!ids.has(e.wordId))||(e.delivery!==undefined&&!deliveries.includes(e.delivery))||(e.type==='focus'&&(!e.wordId||!s.wordIds.includes(e.wordId)||e.duration>12||e.strength<0||e.strength>1||!['phrase','word'].includes(e.focusMode??'phrase'))))throw Error('Evento inválido.');
  previous=s.end;
 }
 if(Math.abs(previous-p.duration)>.002)throw Error('O storyboard deve cobrir a duração integral do áudio.');
 let last=-1;
 for(const w of p.words){if(typeof w.text!=='string'||!finite(w.start)||!finite(w.end)||w.start<0||w.end<=w.start||w.end>p.duration+.002||w.start<last-.001||!finite(w.confidence)||w.confidence<0||w.confidence>1||!['asr','manual','interpolated','estimated'].includes(w.source))throw Error(`Timestamp inválido: ${w.text}`);last=w.start;}
}
