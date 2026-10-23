// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import React from 'react';
import type {Project,Scene,Word,SceneEvent} from '../engine/model';
import {cameraRecipes,typographyRecipes,gestureRecipes,textureRecipes,rhythmRecipes,catalogStats,type Performance} from '../engine/catalog';
import {directPerformance} from '../engine/director';
import {deliveryLabels,deliveries,vocalDelivery,type Delivery} from '../engine/voice';

export function PerformancePanel({project,scene,word,edit,editScene,seek}:{project:Project;scene:Scene;word?:Word;edit:(fn:(p:Project)=>Project)=>void;editScene:(change:Partial<Scene>)=>void;seek:(t:number)=>void}){
 const perf=scene.performance,line=word?project.words.filter(w=>scene.wordIds.includes(w.id)&&w.line===word.line):[];
 const event=scene.events.find(e=>e.type==='focus'&&line.some(w=>w.id===e.wordId)),delivery=vocalDelivery(project.analysis,line,event?.delivery);
 function patch(value:Partial<Performance>){const base=perf??directPerformance(project,0,false).scenes.find(s=>s.id===scene.id)!.performance!;editScene({performance:{...base,...value}});}
 function focus(override:Delivery=event?.delivery??'auto'){
  const first=line[0];if(!first)return;
  const cue:SceneEvent={type:'focus',wordId:first.id,at:first.start,duration:Math.min(12,line.at(-1)!.end-first.start+.5),strength:1,focusMode:'phrase',delivery:override};
  editScene({camera:{...scene.camera,lyricFocus:1},events:[...scene.events.filter(e=>e.type!=='focus'||!line.some(w=>w.id===e.wordId)),cue]});seek(Math.min(scene.end-.03,first.start+.3));
 }
 const options=(key:'camera'|'typography'|'gesture'|'texture'|'rhythm',label:string,items:{id:string;label:string}[])=><label className="field">{label}<select value={perf?.[key]??''} onChange={e=>patch({[key]:e.target.value,...(key==='gesture'?{followLyrics:false}:{})})}><option value="" disabled>Planejar automaticamente</option>{items.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>;
 return <section className="performance-panel"><h3>Direção expressiva</h3><div className="catalog-count"><b>{catalogStats.combinations.toLocaleString('pt-BR')}</b><span>combinações de câmera, tipografia, gestos, textura e ritmo</span></div>
  <button className="secondary wide" onClick={()=>edit(p=>directPerformance(p))}>Automatizar direção da música</button>
  <button className="secondary wide" onClick={()=>edit(p=>directPerformance(p,Math.max(0,...p.scenes.map(s=>s.performance?.variation??0))+1,false))}>Nova combinação</button>
  <label className="check"><input type="checkbox" checked={perf?.enabled??false} onChange={e=>patch({enabled:e.target.checked})}/> Animação expressiva nesta cena</label>
  {options('camera','Movimento da frase em 3D',cameraRecipes)}{options('typography','Fonte e tratamento',typographyRecipes)}
  {options('gesture','Gesto do personagem',gestureRecipes)}
  <label className="check"><input type="checkbox" checked={perf?.followLyrics??true} onChange={e=>patch({followLyrics:e.target.checked})}/> Adaptar o gesto ao sentido da letra</label>
  {options('texture','Textura da cena',textureRecipes)}{options('rhythm','Ritmo do movimento',rhythmRecipes)}
  <label className="field">Acento visual das batidas<select value={perf?.beatStyle??'pulse'} onChange={e=>patch({beatStyle:e.target.value as Performance['beatStyle']})}><option value="pulse">Pulso do quadro</option><option value="ripple">Ondas</option><option value="rays">Raios</option><option value="bars">Barras de frequência</option></select></label>
  <label className="slider"><span>Reação às batidas<b>{(perf?.beatSync??.65).toFixed(2)}</b></span><input type="range" min="0" max="1" step=".01" value={perf?.beatSync??.65} onChange={e=>patch({beatSync:Number(e.target.value)})}/></label>
  <label className="slider"><span>Intensidade da direção<b>{(perf?.intensity??.72).toFixed(2)}</b></span><input type="range" min="0" max="1" step=".01" value={perf?.intensity??.72} onChange={e=>patch({intensity:Number(e.target.value)})}/></label>
  <h3>Expressão da frase selecionada</h3><p className="selected-phrase">{line.map(w=>w.text).join(' ')||'Selecione uma palavra na letra.'}</p>
  <label className="field">Entonação / interpretação<select disabled={!line.length} value={event?.delivery??'auto'} onChange={e=>focus(e.target.value as Delivery)}>{deliveries.map(d=><option key={d} value={d}>{deliveryLabels[d]}</option>)}</select></label>
  <button className="secondary wide" disabled={!line.length} onClick={()=>focus()}>Focar frase selecionada</button>
  <div className="note">{delivery.source==='unavailable'?'Reimporte o áudio para analisar a expressão vocal. Você também pode escolher a interpretação da frase.':delivery.source==='manual'?'Interpretação manual: '+deliveryLabels[delivery.kind]:`Estimativa: ${deliveryLabels[delivery.kind]} · ${Math.round(delivery.confidence*100)}% de confiança. Instrumentos podem interferir na análise da voz.`}</div>
 </section>;
}
