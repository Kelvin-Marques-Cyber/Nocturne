// SPDX-License-Identifier: Apache-2.0
// Use a recorded performance when it intentionally differs from a lyric draft.
import {parseArgs} from 'node:util';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {basename,extname,resolve} from 'node:path';
import {makeProject} from '../src/engine/storyboard';
import {validateProject,type Word,type Analysis} from '../src/engine/model';
import type {Transcript} from '../src/engine/alignment';
const {values:v}=parseArgs({options:{audio:{type:'string'},transcript:{type:'string'},analysis:{type:'string'},reference:{type:'string'},corrections:{type:'string'},title:{type:'string',default:'Pobre alma'},out:{type:'string',default:'projects/pobre-alma.json'}}});
if(!v.audio||!v.transcript||!v.analysis)throw Error('Use --audio, --transcript e --analysis.');
const transcript=JSON.parse(await readFile(v.transcript,'utf8')) as Transcript,analysis=JSON.parse(await readFile(v.analysis,'utf8')) as Analysis;
const corrections:Record<string,string>=v.corrections?JSON.parse(await readFile(v.corrections,'utf8')):{};
const slug=v.title!.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),audio=`media/${slug}${extname(v.audio).toLowerCase()}`;
await mkdir('public/media',{recursive:true});await copyFile(v.audio,'public/'+audio);
const words:Word[]=[],rows:string[][]=[];let row=0,groupStart=0,count=0,last=0,corrected=0;
for(const [segmentIndex,segment] of transcript.segments.entries()){
 if(!segment.words?.length)continue;
 const gap=segment.start-last,section=analysis.sections.some(s=>s.start>=last&&s.start<=segment.start);
 if(count&&(gap>1.5||section||segment.start-groupStart>7.5||count>30)){row++;count=0;}
 if(!count)groupStart=segment.start;
 let lineWords=0;
 for(const [wordIndex,observed] of segment.words.entries()){
  const replacement=corrections[`${segmentIndex}:${wordIndex}`],text=(replacement??observed.text).trim();if(!text)continue;
  if(lineWords>=9||lineWords>=5&&/^[A-ZÉÉÀ]/.test(text)&&/[,.!?]$/.test(words.at(-1)?.text??'')){row++;lineWords=0;}
  const start=Math.max(0,observed.start,words.at(-1)?.end??0),end=Math.min(analysis.duration,Math.max(start+.008,observed.end));if(end<=start)continue;
  words.push({id:`w${words.length}`,text,start,end,line:row,confidence:replacement?Math.min(.55,observed.confidence??.5):observed.confidence??.5,source:'asr'});
  rows[row]??=[];rows[row].push(text);lineWords++;count++;if(replacement)corrected++;
 }
 row++;last=segment.end;
}
const lyrics=Array.from({length:row},(_,i)=>rows[i]?.join(' ')??'').join('\n');
analysis.vocalRegions=transcript.segments.map(s=>({start:s.start,end:s.end,confidence:.8}));
const p=makeProject({title:v.title!,artist:'Kelvin',audio,lyrics,language:'auto',analysis,words,alignment:{method:transcript.method??'ASR da gravação',coverage:words.length?words.filter(w=>w.confidence>=.6).length/words.length:0,reviewRequired:true,notes:['Versão cantada selecionada pelo autor; a letra de referência contém versos diferentes.','Texto e tempos reconhecidos automaticamente; confiança por palavra preservada.',`${corrected} correções editoriais de grafia, mantidas com confiança limitada.`]}});
p.character={...p.character,design:'ink',thickness:1.65,head:.9,heart:false};p.style.grain=.18;p.style.glitch=.18;p.style.chromatic=.18;p.style.vhs=.15;
// Preserve quiet passages, then tighten shots when the delivery accelerates.
for(const scene of p.scenes){
 const ws=words.filter(w=>scene.wordIds.includes(w.id)),rate=ws.length/(scene.end-scene.start);
 if(rate>2.8){scene.transition=Number(scene.id.slice(1))%4?'cut':'whip';scene.camera.zoomTo=1.12;}
 if(scene.performance){scene.performance.beatSync=.25;scene.performance.intensity=rate>2.8?.8:.55;}
 // A low-confidence recognition must not become a giant full-screen assertion.
 scene.events=scene.events.filter(e=>e.type!=='focus'||ws.filter(w=>w.line===words.find(x=>x.id===e.wordId)?.line).every(w=>w.confidence>=.6));
}
validateProject(p);
const reference=v.reference?await readFile(v.reference,'utf8'):undefined;
await mkdir(resolve(v.out!,'..'),{recursive:true});await writeFile(v.out!,JSON.stringify({...p,...(reference?{referenceLyrics:reference}:{})},null,2));
await writeFile(v.out!.replace(/\.json$/,'.sung.txt'),lyrics);
console.log(JSON.stringify({file:v.out,duration:p.duration,scenes:p.scenes.length,words:words.length,highConfidence:p.alignment.coverage,reference:!!reference}));
