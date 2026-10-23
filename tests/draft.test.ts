// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import type {Project} from '../src/engine/model';
import {saveEditorDraft,restoreDraftLyrics} from '../src/editor/draft';
const project=JSON.parse(await readFile('public/demo.json','utf8')) as Project;
const memory=()=>{const values=new Map<string,string>();return{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};};
test('saving before a PWA update retains lyric edits that have not generated a storyboard yet',()=>{
 const storage=memory(),lyrics='Nova letra ainda em edição';saveEditorDraft(project,lyrics,storage);
 const loaded=JSON.parse(storage.getItem('nocturne-project')!);assert.equal(loaded.lyrics,project.lyrics);assert.equal(restoreDraftLyrics(loaded,storage),lyrics);
});
test('a draft from another project or older source lyrics never replaces the current lyrics',()=>{
 const storage=memory();saveEditorDraft(project,'Rascunho anterior',storage);
 assert.equal(restoreDraftLyrics({...project,id:'outro-projeto'},storage),project.lyrics);
 assert.equal(restoreDraftLyrics({...project,lyrics:'Fonte nova'},storage),'Fonte nova');
});
