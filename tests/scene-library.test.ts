// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseMetaphor,createStoryboard} from '../src/engine/storyboard';
import {alignLyrics} from '../src/engine/alignment';
import type {Project} from '../src/engine/model';
const demo=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')) as Project;

test('new visual worlds follow generic bilingual imagery rather than one example song',()=>{
 for(const [lyric,kind] of [['Desço ao abismo','abyss'],['Atravesso o vale','valley'],['I see the lighthouse','lighthouse'],['Volto para casa','home'],['Encontrei uma mesa','table'],['Lembra-me da cruz','cross'],['Open the book','book'],['A carta que escrevi','letter'],['Espero na estação','station'],['Nasce uma flor','flower'],['Though I walk through the valley','valley']] as const)assert.equal(chooseMetaphor(lyric),kind,lyric);
});

test('repeated refrains keep their meaning but receive distinct deterministic compositions',()=>{
 const lyrics=Array(9).fill('Volto para casa\nI am coming home').join('\n\n'),aligned=alignLyrics(lyrics,demo.analysis);
 const a=createStoryboard(lyrics,aligned.words,demo.analysis),b=createStoryboard(lyrics,aligned.words,demo.analysis);
 assert.ok(a.every(s=>s.kind==='home'));
 const presets=a.map(s=>(s as typeof s&{preset?:string}).preset);
 assert.equal(new Set(presets.slice(0,8)).size,8,'use all eight home compositions before repeating');
 assert.ok(presets.every(Boolean));assert.deepEqual(a,b);
});
