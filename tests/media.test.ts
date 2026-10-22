// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{test}from'node:test';import assert from'node:assert/strict';import{readFile,mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join,basename}from'node:path';import{execFileSync}from'node:child_process';import{renderVideo}from'../scripts/renderer';import type{Project}from'../src/engine/model';import{rasterize}from'../src/engine/raster';import{renderFrame}from'../src/engine/frame';
const p=JSON.parse(await readFile('projects/deus-nos-ve.json','utf8'))as Project;
test('H.264 + AAC render works in portrait 30fps and landscape 60fps without duration drift',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nocturne-media-')),fixture='media/test-'+basename(dir)+'.wav';
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=220:sample_rate=22050:duration=26','public/'+fixture]);
 try{for(const [format,fps,width,height,seconds]of [['vertical',30,180,320,1.2],['horizontal',60,320,180,1.2],['vertical',30,180,320,1.21]]as const){const output=join(dir,`${format}.mp4`);const r=await renderVideo({...p,format,fps,audio:fixture},{output,from:23,duration:seconds,width,height,preset:'ultrafast'});const meta=JSON.parse(execFileSync('ffprobe',['-v','quiet','-print_format','json','-show_streams','-show_format',output],{encoding:'utf8'}));const v=meta.streams.find((s:{codec_type:string})=>s.codec_type==='video'),a=meta.streams.find((s:{codec_type:string})=>s.codec_type==='audio');assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');assert.equal(v.width,width);assert.equal(v.height,height);assert.equal(v.r_frame_rate,`${fps}/1`);assert.equal(r.frames,Number(v.nb_frames));assert.ok(Math.abs(Number(v.nb_frames)/fps-seconds)<1/fps+.001);assert.ok(Math.abs(Number(meta.format.duration)-seconds)<1/fps+.03);assert.ok(Math.abs(Number(v.start_time)-Number(a.start_time))<1/fps);assert.ok(r.elapsed>0);}}finally{await rm(dir,{recursive:true,force:true});await rm('public/'+fixture,{force:true});}
});
test('every shot rasterizes at entry, transition, middle and exit, including 3D CRT glyphs',async()=>{
 for(const s of p.scenes)for(const t of [s.start,s.start+Math.min(.3,(s.end-s.start)/2),(s.start+s.end)/2,s.end-1/p.fps]){
  const png=await rasterize(renderFrame(p,Math.max(0,t*p.fps),{width:108,height:192}));assert.ok(png.length>100);
 }
 // Regression: frame 884 previously aborted a native rasterizer.
 assert.ok((await rasterize(renderFrame(p,884))).length>100);
});
test('spectral beat detector finds a synthetic 120 BPM pulse train',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nocturne-audio-'));try{const wav=join(dir,'pulse.wav'),out=join(dir,'analysis.json');execFileSync('python3',['-c',`import numpy as np\nfrom scipy.io.wavfile import write\nsr=22050;y=np.zeros(sr*14,dtype=np.float32)\nfor t in np.arange(1,13,.5):\n n=np.arange(1800)/sr;y[int(t*sr):int(t*sr)+len(n)]+=np.sin(2*np.pi*180*n)*np.exp(-n*75)\nwrite(${JSON.stringify(wav)},sr,y)`]);execFileSync('python3',['scripts/analyze.py',wav,'--out',out]);const a=JSON.parse(await readFile(out,'utf8'));assert.ok(Math.abs(a.bpm-120)<2,`Detected ${a.bpm} BPM`);const errors=Array.from({length:20},(_,i)=>1+i*.5).map(t=>Math.min(...a.onsets.map((b:number)=>Math.abs(t-b))));assert.ok(errors.filter(e=>e<.06).length>=18);assert.ok(a.silences.length>0);}finally{await rm(dir,{recursive:true,force:true});}
});
