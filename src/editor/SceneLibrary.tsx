// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import React,{useState} from 'react';
import {kinds,type Scene,type SceneKind} from '../engine/model';
import {metaphors} from '../engine/storyboard';
import {scenePresets,worldSpecs,newSceneKinds,applyScenePreset,type NewSceneKind} from '../engine/scene-catalog';
import {lexical} from '../engine/language';

export function SceneLibrary({scene,onChange}:{scene:Scene;onChange:(change:Partial<Scene>)=>void}){
 const [query,setQuery]=useState('');
 const legacy=kinds.filter(k=>!newSceneKinds.includes(k as NewSceneKind)),match=(value:string)=>lexical(value).includes(lexical(query.trim()));
 const old=legacy.filter(k=>match(metaphors[k].label+' '+k)),presets=scenePresets.filter(p=>match(p.label+' '+metaphors[p.kind].label+' '+p.kind));
 const selected=scene.preset??'kind:'+scene.kind,visible=presets.some(p=>p.id===selected)||old.some(k=>'kind:'+k===selected);
 function choose(value:string){
  const preset=scenePresets.find(p=>p.id===value);
  if(preset){onChange(applyScenePreset(scene,preset));return;}
  const kind=value.slice(5) as SceneKind,m=metaphors[kind];if(!m)return;
  onChange({kind,preset:undefined,title:m.label,intent:m.intent,code:m.code,accent:m.accent,variant:0,motions:[{start:scene.start,end:scene.end,action:m.action}]});
 }
 return <div className="scene-library"><label className="field">Buscar cena · {legacy.length+scenePresets.length} opções<input type="search" value={query} placeholder="Casa, chuva, farol, guitarra…" onChange={e=>setQuery(e.target.value)}/></label><label className="field">Cenário e composição<select value={selected} onChange={e=>choose(e.target.value)}>
  {!visible?<option value={selected}>{scene.title} · atual</option>:null}
  {old.length?<optgroup label="Cenas originais">{old.map(k=><option key={k} value={'kind:'+k}>{metaphors[k].label}</option>)}</optgroup>:null}
  {worldSpecs.map(w=>{const items=presets.filter(p=>p.kind===w.kind);return items.length?<optgroup key={w.kind} label={w.label}>{items.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>:null;})}
 </select></label>{query.trim()?<div className="note" role="status">{old.length+presets.length} opções encontradas.</div>:null}</div>;
}
