// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import * as ort from 'onnxruntime-web/wasm';
import {alignCTC} from '../engine/ctc';
const modelURL='https://huggingface.co/xycld/lyric-align-mms-fa/resolve/06e6cbfa5c257d23981c922f6406f5def958eb95/mms_fa_uint8.onnx';
const modelSize=316795521;
async function modelBytes(progress:(message:string)=>void){
 let cache:Cache|undefined;try{cache=await caches.open('nocturne-acoustic-model-v1');}catch{/* Recognition also works when persistent storage is unavailable. */}
 const saved=await cache?.match(modelURL);
 if(saved){progress('Carregando modelo acústico já baixado…');const bytes=new Uint8Array(await saved.arrayBuffer());if(bytes.length===modelSize)return bytes;await cache?.delete(modelURL);}
 const response=await fetch(modelURL);if(!response.ok||!response.body)throw Error('Não foi possível baixar o modelo acústico. Confira a conexão e tente novamente.');
 const caching=cache?.put(modelURL,response.clone()).catch(()=>{}),reader=response.body.getReader(),bytes=new Uint8Array(modelSize);let length=0,last=-1;
 for(;;){const {done,value}=await reader.read();if(done)break;if(length+value.length>bytes.length)throw Error('O modelo acústico recebido tem tamanho inválido.');bytes.set(value,length);length+=value.length;const percent=Math.floor(length/modelSize*100);if(percent!==last){last=percent;progress(`Baixando modelo acústico: ${percent}% (317 MB, apenas no primeiro uso).`);}}
 await caching;if(length!==modelSize)throw Error('O download do modelo ficou incompleto. Tente sincronizar novamente.');return bytes;
}
export async function alignAcoustically(samples:Float32Array,tokens:{text:string;line:number}[],progress:(message:string)=>void){
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
 let bytes:Uint8Array|undefined=await modelBytes(progress);progress('Preparando alinhamento acústico da letra…');
 const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 bytes=undefined;
 const duration=samples.length/16000,capacity=Math.ceil(duration*50)+100,emissions=new Float32Array(capacity*29),times=new Float64Array(capacity);let count=0;
 try{
  for(let from=0;from<duration;from+=20){
   const to=Math.min(duration,from+20),clipStart=Math.max(0,from-1),clipEnd=Math.min(duration,to+1),clip=samples.subarray(Math.round(clipStart*16000),Math.round(clipEnd*16000));
   progress(`Localizando a voz: ${Math.floor(from)} de ${Math.ceil(duration)} segundos (${Math.floor(from/duration*85)}%).`);
   const input=new ort.Tensor('float32',clip,[1,clip.length]);let output:ort.InferenceSession.ReturnType|undefined;
   try{
    output=await session.run({waveform:input});const result=output.log_probs,data=result.data as Float32Array,frames=result.dims[1];
    for(let frame=0;frame<frames;frame++){
     const time=clipStart+(frame*320+200)/16000;if(time<from||time>=to)continue;
     if(count>=capacity)throw Error('A duração retornada pelo modelo é inválida.');
     times[count]=time;emissions.set(data.subarray(frame*29,frame*29+29),count*29);count++;
    }
   }finally{input.dispose();if(output)for(const tensor of Object.values(output))tensor.dispose();}
  }
 }finally{await session.release();}
 progress('Alinhando cada palavra aos sons da voz…');
 return alignCTC(emissions.subarray(0,count*29),times.subarray(0,count),tokens,percent=>progress(`Alinhando cada palavra aos sons da voz: ${Math.floor(85+percent*.15)}%.`));
}
