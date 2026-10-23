// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{spawnSync}from'node:child_process';
import{readFile,writeFile,readdir,copyFile,rm,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{join}from'node:path';
const base=process.env.NOCTURNE_BASE??'/Nocturne/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw Error('NOCTURNE_BASE deve ser / ou /nome/.');
await rm('dist',{recursive:true,force:true});
for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build','--base',base]]){
 const r=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,VITE_STATIC:'true'}});if(r.status!==0)process.exit(r.status??1);
}
// Only these authored/public assets may enter a deployment. Imported recordings,
// reference videos, local drafts and the optional large CJK font stay local.
for(const name of ['demo.json','font.css','DejaVuSansMono.ttf','DejaVuSansMono-Bold.ttf','DejaVuSansMono-Oblique.ttf','DejaVuSans-Bold.ttf','DejaVuSerif.ttf','DejaVuSans.ttf','DejaVuSerif-Bold.ttf','lmsans10-regular.otf','lmsans10-bold.otf','lmroman10-regular.otf','lmroman10-italic.otf','lmsansdemicond10-regular.otf','lmmonolt10-regular.otf','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'])await copyFile(join('public',name),join('dist',name));
await mkdir('dist/licenses',{recursive:true});
for(const [source,target]of [['LICENSE','Apache-2.0.txt'],['THIRD_PARTY_NOTICES.md','NOTICE.txt'],['fonts/LICENSE-DejaVu.txt','DejaVu.txt'],['fonts/GUST-FONT-LICENSE.TXT','Latin-Modern-GUST.txt'],['fonts/README-Latin-Modern.TXT','Latin-Modern-README.txt'],['fonts/MANIFEST-Latin-Modern.TXT','Latin-Modern-MANIFEST.txt'],['fonts/LPPL-1.3c.tex','LPPL-1.3c.tex'],['fonts/LICENSE-NotoCJK.txt','NotoCJK-OFL.txt'],['node_modules/mediabunny/LICENSE','Mediabunny-MPL.txt'],['node_modules/@mediabunny/aac-encoder/LICENSE','AAC-MPL.txt'],['node_modules/opentype.js/LICENSE','OpenType-MIT.txt'],['node_modules/three/LICENSE','Three-MIT.txt']])await copyFile(source,'dist/licenses/'+target);
const files=await readdir('dist',{recursive:true,withFileTypes:true}),shell=files.filter(f=>f.isFile()).map(f=>join(f.parentPath,f.name).replace(/^dist\//,'')).sort();
const hash=createHash('sha256');for(const name of shell)hash.update(await readFile(join('dist',name)));
const version=hash.digest('hex').slice(0,16),worker=(await readFile('public/sw.js','utf8')).replace('__BUILD_VERSION__',version).replace('__PRECACHE__',JSON.stringify(shell.map(name=>base+name)));
await writeFile('dist/sw.js',worker);await writeFile('dist/.nojekyll','');await writeFile('dist/404.html',await readFile('dist/index.html'));await writeFile('dist/build.json',JSON.stringify({version,base,mode:'browser',privateAudioIncluded:false}));
console.log(JSON.stringify({directory:'dist',base,version,files:shell.length,privateAudioIncluded:false}));
