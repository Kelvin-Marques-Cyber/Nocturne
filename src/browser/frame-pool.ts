// SPDX-License-Identifier: Apache-2.0
import type {Project} from '../engine/model';
export class FramePool {
 private workers:Worker[]=[];
 private pending=new Map<number,{resolve:(value:string)=>void;reject:(error:Error)=>void}>();
 private sequence=0;
 private next=0;
 constructor(count=1){
  for(let i=0;i<count;i++){
   const worker=new Worker(new URL('./frame-worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=event=>{const{id,error,svg}=event.data,task=this.pending.get(id);if(!task)return;this.pending.delete(id);if(error)task.reject(Error(error));else task.resolve(svg??'');};
   worker.onerror=event=>this.close(Error(event.message||'Falha no processador de quadros.'));
   this.workers.push(worker);
  }
 }
 private request(worker:Worker,data:Record<string,unknown>){
  return new Promise<string>((resolve,reject)=>{const id=++this.sequence;this.pending.set(id,{resolve,reject});worker.postMessage({...data,id});});
 }
 async init(project:Project,outline=false){await Promise.all(this.workers.map(worker=>this.request(worker,{type:'init',project,outline})));}
 frame(frame:number,width?:number,height?:number){
  if(!this.workers.length)return Promise.reject(Error('Processador encerrado.'));
  return this.request(this.workers[this.next++%this.workers.length],{type:'frame',frame,width,height});
 }
 close(reason=Error('Processador encerrado.')){for(const worker of this.workers)worker.terminate();this.workers=[];for(const task of this.pending.values())task.reject(reason);this.pending.clear();}
}
