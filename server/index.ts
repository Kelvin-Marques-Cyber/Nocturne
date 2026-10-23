// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join,resolve,extname,basename} from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {validateProject,type Project} from '../src/engine/model';
import {alignLyrics,type Transcript} from '../src/engine/alignment';
import {makeProject,createStoryboard} from '../src/engine/storyboard';
import {directPerformance} from '../src/engine/director';
import {ensureProjectFonts} from '../scripts/font-support';
const port=Number(process.env.PORT??4173),root=process.cwd();
for(const dir of ['projects','public/media','output'])await mkdir(dir,{recursive:true});
const production=process.argv.includes('--production');
const vite=production?undefined:await(await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'});
const jobs=new Map<string,{id:string;status:'rendering'|'complete'|'failed'|'cancelled';percent:number;output:string;error?:string;pid?:ReturnType<typeof spawn>}>();
function json(res:ServerResponse,obj:unknown,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
async function body(req:IncomingMessage,max=8*1024*1024){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Arquivo acima do limite permitido.');chunks.push(chunk);}return Buffer.concat(chunks);}
const parse=async(req:IncomingMessage)=>JSON.parse((await body(req)).toString('utf8'));
const runPython=(args:string[])=>new Promise<void>((done,fail)=>{const p=spawn(process.env.PYTHON??'python3',args);let err='';p.stderr.on('data',d=>{err+=d;});p.on('error',fail);p.on('exit',code=>code===0?done():fail(Error(err.slice(-1500)||'Análise falhou. Instale as dependências Python.')));});
async function file(req:IncomingMessage,res:ServerResponse,path:string,type:string,download=false){
 const s=await stat(path),range=req.headers.range;let start=0,end=s.size-1;
 if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(match){start=Number(match[1]);end=match[2]?Number(match[2]):end;}if(start>=s.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});res.end();return;}end=Math.min(end,s.size-1);}
 res.writeHead(range?206:200,{'Content-Type':type,'Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${s.size}`}:{'Cache-Control':'no-cache'}),...(download?{'Content-Disposition':`attachment; filename="${basename(path)}"`}:{})});createReadStream(path,{start,end}).pipe(res);
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url??'/','http://localhost'),pathname=url.pathname;
  if(req.method!=='GET'&&req.headers.origin){const o=new URL(req.headers.origin);if(o.host!==req.headers.host){json(res,{error:'Origem não permitida.'},403);return;}}
  if(pathname==='/api/demo'&&req.method==='GET'){json(res,JSON.parse(await readFile('projects/deus-nos-ve.json','utf8')));return;}
  if(pathname==='/api/audio'&&req.method==='POST'){
   const name=url.searchParams.get('name')??'',ext=extname(name).toLowerCase();if(!['.mp3','.wav','.flac'].includes(ext))throw Error('Importe MP3, WAV ou FLAC.');
   const id=randomUUID().slice(0,8),audio=`media/import-${id}${ext}`,path=join('public',audio),analysisPath=`projects/import-${id}-analysis.json`;
   await writeFile(path,await body(req,256*1024*1024));
   // Preserve uploads when Python, NumPy, SciPy or FFmpeg is unavailable.
   // The editor can analyze the same local File with its browser worker.
   let analysis:unknown=null;
   try{await runPython(['scripts/analyze.py',path,'--out',analysisPath]);analysis=JSON.parse(await readFile(analysisPath,'utf8'));}
   catch(error){console.warn('Análise Python indisponível; utilizando fallback no navegador:',error);}
   json(res,{audio,title:basename(name,ext),analysis});return;
  }
  if(pathname==='/api/storyboard'&&req.method==='POST'){
   const {project,lyrics,transcript}=await parse(req)as {project:Project;lyrics:string;transcript?:Transcript};validateProject(project);
   if(typeof lyrics!=='string'||lyrics.length>100000)throw Error('Letra inválida.');
   if(transcript&&(!Array.isArray(transcript.segments)||transcript.segments.some(s=>!Array.isArray(s.words))))throw Error('Transcrição deve conter segments[].words[].');

   const a=alignLyrics(lyrics,project.analysis,transcript,project.language,project.words,project.title),next={...project,lyrics,words:a.words,alignment:{method:a.method,coverage:a.coverage,notes:a.notes,reviewRequired:true}};
   next.scenes=createStoryboard(lyrics,a.words,project.analysis,project.language,project.title);next.scenes=directPerformance(next,0,false).scenes;validateProject(next);await ensureProjectFonts(next);json(res,next);return;

  }
  if(pathname==='/api/fonts'&&req.method==='POST'){const p=await parse(req);if(typeof p.lyrics!=='string')throw Error('Letra inválida.');await ensureProjectFonts(p);json(res,{ready:true});return;}
  if(pathname==='/api/project'&&req.method==='POST'){
   const p=await parse(req)as Project;validateProject(p);const name=(p.id??'edited').replace(/[^a-z0-9-]/gi,'').slice(0,80)||'edited';
   await writeFile(`projects/${name}.json`,JSON.stringify(p,null,2));json(res,{saved:true});return;
  }
  if(pathname==='/api/render'&&req.method==='POST'){
   const {project,from,duration}=await parse(req)as {project:Project;from?:number;duration?:number};validateProject(project);
   if([...jobs.values()].some(j=>j.status==='rendering'))throw Error('Uma renderização está em andamento. Aguarde ou cancele.');
   const id=randomUUID().slice(0,12),projectPath=`projects/render-${id}.json`,output=`output/nocturne-${id}.mp4`;
   await writeFile(projectPath,JSON.stringify(project));
   const args=['--import','tsx','scripts/render.ts','--project',projectPath,'--out',output];
   if(from!==undefined){if(!Number.isFinite(from)||from<0||from>=project.duration)throw Error('Início inválido.');args.push('--from',String(from));}
   if(duration!==undefined){if(!Number.isFinite(duration)||duration<=0)throw Error('Duração inválida.');args.push('--duration',String(duration));}
   const cp=spawn(process.execPath,args,{cwd:root,stdio:['ignore','pipe','pipe']});
   const job:NonNullable<ReturnType<typeof jobs.get>>={id,status:'rendering',percent:0,output,pid:cp};jobs.set(id,job);
   let buffer='',error='';cp.stdout!.on('data',chunk=>{buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop()!;for(const l of lines)try{const v=JSON.parse(l);if(v.type==='progress')job.percent=v.percent;if(v.type==='complete'){job.percent=100;job.status='complete';}}catch{}});
   cp.stderr!.on('data',chunk=>{error=(error+chunk).slice(-3000);});cp.on('error',err=>{job.status='failed';job.error=err.message;});cp.on('exit',code=>{if(job.status==='cancelled')return;if(code!==0){job.status='failed';job.error=error||'FFmpeg falhou.';}else{job.status='complete';job.percent=100;}});
   json(res,{id,status:job.status});return;
  }
  const match=/^\/api\/render\/([a-z0-9-]+)(\/download)?$/.exec(pathname);
  if(match){const job=jobs.get(match[1]);if(!job){json(res,{error:'Renderização não encontrada.'},404);return;}
   if(req.method==='DELETE'){job.status='cancelled';job.pid?.kill('SIGTERM');json(res,{status:'cancelled'});return;}
   if(match[2]){if(job.status!=='complete')throw Error('Renderização ainda não terminou.');await file(req,res,resolve(job.output),'video/mp4',true);return;}
   json(res,{id:job.id,status:job.status,percent:job.percent,error:job.error,download:job.status==='complete'?`/api/render/${job.id}/download`:undefined});return;
  }
  if(pathname.startsWith('/api/')){json(res,{error:'Rota não encontrada.'},404);return;}
  if(vite){vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});return;}
  if(pathname==='/'){await file(req,res,resolve('dist/index.html'),'text/html');return;}
  if(pathname==='/NotoSansCJKjp-Regular.otf'){await file(req,res,resolve('public/NotoSansCJKjp-Regular.otf'),'font/otf');return;}
  const relative=decodeURIComponent(pathname).replace(/^\/+/,''),base=relative.startsWith('media/')?'public':'dist',path=resolve(base,relative);
  if(!path.startsWith(resolve(base)+'/'))throw Error('Caminho inválido.');
  const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.ttf':'font/ttf'};
  try{await file(req,res,path,mime[extname(path)]??'application/octet-stream');}catch{await file(req,res,resolve('dist/index.html'),'text/html');}
 }catch(error){if(!res.headersSent)json(res,{error:error instanceof Error?error.message:String(error)},400);else res.end();}
});
server.listen(port,'0.0.0.0',()=>console.log(`Nocturne local editor: http://localhost:${port}`));
