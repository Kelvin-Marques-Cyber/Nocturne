// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{parseArgs}from'node:util';import{readFile,writeFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{join}from'node:path';import{renderFrame}from'../src/engine/frame';import{validateProject,dimensions,type Project}from'../src/engine/model';
const{values:v}=parseArgs({options:{project:{type:'string',default:'projects/deus-nos-ve.json'},video:{type:'string',default:'output/deus-nos-ve-vertical.mp4'},out:{type:'string',default:'output/verification.json'}}});
const p=JSON.parse(await readFile(v.project!,'utf8'))as Project;validateProject(p);
const meta=JSON.parse(execFileSync('ffprobe',['-v','quiet','-print_format','json','-show_format','-show_streams',v.video!],{encoding:'utf8'}));
const stream=meta.streams.find((s:{codec_type:string})=>s.codec_type==='video'),audio=meta.streams.find((s:{codec_type:string})=>s.codec_type==='audio');
// An exact audio endpoint usually falls between video frames. FFmpeg's -t
// rounds to the encoder time base; permit that single frame of quantization.
const checks={storyboardCoverage:Math.abs(p.scenes.at(-1)!.end-p.duration)<.001,h264:stream.codec_name==='h264',aac:audio.codec_name==='aac',dimensions:stream.width===dimensions(p.format).width&&stream.height===dimensions(p.format).height,fps:stream.r_frame_rate===`${p.fps}/1`,duration:Math.abs(Number(meta.format.duration)-p.duration)<1/p.fps+.03,avStart:Math.abs(Number(stream.start_time)-Number(audio.start_time))<1/p.fps,frameCount:Math.abs(Number(stream.nb_frames)/p.fps-p.duration)<1/p.fps&&Math.abs(Number(stream.nb_frames)-Number(stream.duration)*p.fps)<.02};
const audioContent=JSON.parse(execFileSync(process.env.PYTHON??'python3',['scripts/check_audio.py',join('public',p.audio),v.video!],{encoding:'utf8'}));
const report={passed:Object.values(checks).every(Boolean)&&audioContent.passed,checks,audioContent,video:v.video,audioDuration:p.duration,renderDuration:Number(meta.format.duration),encodedFrames:Number(stream.nb_frames),alignment:p.alignment,sampledFrameHashes:p.scenes.map(s=>({scene:s.id,frame:Math.ceil((s.start+.1)*p.fps),sha256:createHash('sha256').update(renderFrame(p,Math.ceil((s.start+.1)*p.fps))).digest('hex')}))};
await writeFile(v.out!,JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks,null,2));if(!report.passed)process.exitCode=1;
