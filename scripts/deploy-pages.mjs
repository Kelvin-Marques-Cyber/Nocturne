// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{spawnSync}from'node:child_process';
import{mkdtemp,cp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
const run=(cmd,args,cwd=process.cwd(),capture=false)=>{const p=spawnSync(cmd,args,{cwd,encoding:'utf8',stdio:capture?'pipe':'inherit'});if(p.error)throw p.error;if(p.status!==0)throw Error([p.stderr,p.stdout].filter(Boolean).join('\n').trim()||cmd+' falhou.');return p.stdout?.trim();};
run(process.execPath,['scripts/build-pages.mjs']);
const remote=run('git',['remote','get-url','origin'],undefined,true),head=run('git',['ls-remote','origin','refs/heads/gh-pages'],undefined,true)?.split(/\s/)[0];
const dir=await mkdtemp(join(tmpdir(),'nocturne-pages-'));
try{
 await cp(resolve('dist'),dir,{recursive:true});run('git',['init','-b','gh-pages'],dir);run('git',['remote','add','origin',remote],dir);if(head){run('git',['fetch','--depth=1','origin','gh-pages'],dir);run('git',['reset','--mixed','FETCH_HEAD'],dir);}for(const key of ['user.name','user.email']){const value=run('git',['config','--get',key],undefined,true);if(value)run('git',['config',key,value],dir);}run('git',['add','--all'],dir);const changedFiles=run('git',['diff','--cached','--name-only'],dir,true);if(!changedFiles){console.log('PWA já publicado em gh-pages: nenhuma alteração para enviar.');}else{run('git',['commit','-m','Deploy Nocturne PWA'],dir);
 // Fast-forward publication preserves deployment history and rejects races.
 run('git',['push','origin','HEAD:gh-pages'],dir);console.log('PWA publicado em gh-pages com sucesso.');}
}finally{await rm(dir,{recursive:true,force:true});}
