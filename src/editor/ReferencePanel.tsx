// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import type {Project,Scene} from '../engine/model';
import {editProfiles,editProfileLabels,editProfileDescriptions,type EditProfile} from '../engine/edit-presets';
import {adoptReferenceEdits,resolvedEditProfile} from '../engine/reference-edits';
export function ReferencePanel({project,scene,edit,editScene}:{project:Project;scene:Scene;edit:(fn:(p:Project)=>Project)=>void;editScene:(change:Partial<Scene>)=>void}){
 const mode=resolvedEditProfile(project,scene),global=project.editProfile??'classic';
 return <section className="reference-panel"><h3>Estilos das referências</h3>
  <label className="field">Linguagem da música<select value={global} onChange={e=>edit(p=>adoptReferenceEdits(p,e.target.value as EditProfile))}>{editProfiles.map(id=><option key={id} value={id}>{editProfileLabels[id]}</option>)}</select></label>
  <div className="reference-presets">{editProfiles.filter(id=>!['auto','classic'].includes(id)).map(id=><button key={id} className={global===id?'selected':''} aria-pressed={global===id} onClick={()=>edit(p=>adoptReferenceEdits(p,id))}><span className={'reference-swatch swatch-'+id}/><span>{editProfileLabels[id]}</span></button>)}</div>
  <button className="secondary wide" onClick={()=>edit(p=>adoptReferenceEdits(p))}>Aplicar montagem das referências</button>
  <label className="field">Exceção para esta cena<select value={scene.editProfile??'inherit'} onChange={e=>{const profile=e.target.value==='inherit'?undefined:e.target.value as EditProfile;edit(p=>({...p,direction:'reel',scenes:p.scenes.map(s=>s.id===scene.id?{...s,editProfile:profile}:s)}));}}><option value="inherit">Seguir a música</option>{editProfiles.map(id=><option key={id} value={id}>{editProfileLabels[id]}</option>)}</select></label>
  <p className="note"><b>{editProfileLabels[mode]}</b> · {editProfileDescriptions[mode]}</p>
 </section>;
}
