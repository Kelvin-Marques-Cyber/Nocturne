// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project} from '../engine/model';
type DraftStorage=Pick<Storage,'getItem'|'setItem'>;
export function saveEditorDraft(project:Project,lyrics:string,storage:DraftStorage=localStorage){
 storage.setItem('nocturne-lyrics-draft',JSON.stringify({projectId:project.id,sourceLyrics:project.lyrics,lyrics}));
 storage.setItem('nocturne-project',JSON.stringify(project));
}
export function restoreDraftLyrics(project:Project,storage:DraftStorage=localStorage){
 try{const draft=JSON.parse(storage.getItem('nocturne-lyrics-draft')??'null');if(draft?.projectId===project.id&&draft.sourceLyrics===project.lyrics&&typeof draft.lyrics==='string')return draft.lyrics as string;}catch{}
 return project.lyrics;
}
