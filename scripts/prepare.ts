// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {ensureProjectFonts} from './font-support';
import {parseArgs} from 'node:util';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,basename,extname,join} from 'node:path';
import {spawn} from 'node:child_process';
import {alignLyrics,type Transcript} from '../src/engine/alignment';
import {makeProject} from '../src/engine/storyboard';
import {languages,type Language} from '../src/engine/language';
import {validateProject,type Analysis} from '../src/engine/model';
const {values:v}=parseArgs({options:{audio:{type:'string'},lyrics:{type:'string'},analysis:{type:'string'},reference:{type:'string'},transcript:{type:'string'},transcribe:{type:'boolean',default:false},language:{type:'string',default:'auto'},title:{type:'string',default:'Deus nos vê'},artist:{type:'string',default:'Kelvin'},out:{type:'string',default:'projects/deus-nos-ve.json'}}});
if(!v.audio||!v.lyrics){console.error('Uso: npm run project -- --audio música.mp3 --lyrics letra.txt [--transcript asr.json] [--transcribe] [--out projects/nova.json]');process.exit(1);}
if(!Object.hasOwn(languages,v.language!))throw Error('Idioma inválido. Use '+Object.keys(languages).join(', '));
const language=v.language as Language;
const run=(args:string[])=>new Promise<void>((res,rej)=>{const cp=spawn(process.env.PYTHON??'python3',args,{stdio:'inherit'});cp.on('error',rej);cp.on('exit',code=>code===0?res():rej(Error('Python saiu com código '+code)));});
await mkdir('projects',{recursive:true});await mkdir('public/media',{recursive:true});
const audio=resolve(v.audio),slug=v.title!.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'musica';
const mediaName=slug+extname(audio).toLowerCase();
if(resolve('public/media',mediaName)!==audio)await copyFile(audio,join('public/media',mediaName));
const analysisPath=v.analysis??`projects/${slug}-analysis.json`;
if(!v.analysis)await run(['scripts/analyze.py',audio,'--out',analysisPath]);
let transcriptPath=v.transcript;
if(v.transcribe){transcriptPath=`projects/${slug}-asr.json`;await run(['scripts/transcribe.py',audio,'--out',transcriptPath,'--language',language]);}
const analysis=JSON.parse(await readFile(analysisPath,'utf8'))as Analysis;
const lyrics=await readFile(v.lyrics,'utf8');
const transcript=transcriptPath?JSON.parse(await readFile(transcriptPath,'utf8'))as Transcript:undefined;
const aligned=alignLyrics(lyrics,analysis,transcript,language);
if(transcript){analysis.vocalRegions=transcript.segments.filter(s=>s.end>s.start).map(s=>({start:s.start,end:s.end,confidence:.8}));analysis.warnings=analysis.warnings.filter(s=>!s.startsWith('Vocal'));}
const project=makeProject({title:v.title!,artist:v.artist,language,audio:'media/'+mediaName,lyrics,analysis,words:aligned.words,alignment:{method:aligned.method,coverage:aligned.coverage,reviewRequired:true,notes:aligned.notes}});
// Keep provenance concise; words already live at project.words.
project.alignment={method:aligned.method,coverage:aligned.coverage,reviewRequired:true,notes:aligned.notes};
if(v.reference){const path=`projects/${slug}-reference.json`;await run(['scripts/reference.py',v.reference,'--out',path]);(project as typeof project&{reference:unknown}).reference=JSON.parse(await readFile(path,'utf8'));}
validateProject(project);await ensureProjectFonts(project);await mkdir(resolve(v.out!,'..'),{recursive:true});await writeFile(v.out!,JSON.stringify(project,null,2));
if(v.out==='projects/deus-nos-ve.json')await copyFile(v.out,'public/demo.json');
console.log(JSON.stringify({project:v.out,duration:project.duration,scenes:project.scenes.length,words:project.words.length,coverage:aligned.coverage,reviewRequired:true},null,2));
