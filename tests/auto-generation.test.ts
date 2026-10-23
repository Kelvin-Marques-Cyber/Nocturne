// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tokenizeLyrics} from '../src/engine/language';
import {alignLyrics} from '../src/engine/alignment';
import {createStoryboard} from '../src/engine/storyboard';
import type {Project} from '../src/engine/model';

test('song titles and section directions never become sung words or empty scenes',async()=>{
 const p=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')) as Project;
 const lyrics='UMA NOVA CANÇÃO\n\n[Intro — sussurrado]\n\nToco a guitarra\n\n[Refrão — Ambos]\n\nAtravesso a ponte\n\n[Feminina]\n\nYou remain';
 const tokens=tokenizeLyrics(lyrics);
 assert.deepEqual(tokens.map(w=>w.text),['Toco','a','guitarra','Atravesso','a','ponte','You','remain']);
 assert.equal(tokens[0].line,4,'keep original textarea line ownership');
 const aligned=alignLyrics(lyrics,p.analysis),scenes=createStoryboard(lyrics,aligned.words,p.analysis);
 assert.equal(scenes.length,3);assert.deepEqual(scenes.map(s=>s.kind),['guitar','bridge','lift']);
 assert.deepEqual(scenes.flatMap(s=>s.wordIds),aligned.words.map(w=>w.id));
 assert.ok(scenes.every(s=>s.wordIds.length&&s.end>s.start));
});
