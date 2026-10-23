// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{readFile,readdir,stat}from'node:fs/promises';
import assert from'node:assert/strict';
const build=JSON.parse(await readFile('dist/build.json','utf8')),manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8')),html=await readFile('dist/index.html','utf8'),worker=await readFile('dist/sw.js','utf8');
assert.equal(build.mode,'browser');assert.equal(build.privateAudioIncluded,false);assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
assert.ok(!worker.includes('__PRECACHE__')&&!worker.includes('__BUILD_VERSION__'));
const shell=JSON.parse(worker.match(/SHELL=(\[.*?\]);/)[1]);
for(const url of shell){assert.ok(url.startsWith(build.base));assert.ok((await stat('dist/'+url.slice(build.base.length))).isFile());}
for(const url of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1])){assert.ok(url.startsWith(build.base),url);assert.ok((await stat('dist/'+url.slice(build.base.length))).isFile());}
for(const name of await readdir('dist',{recursive:true}))assert.ok(!/\.(mp3|wav|flac|mp4|mov|webm)$/i.test(name),'Áudio/vídeo privado no build: '+name);
for(const size of [192,512]){const png=await readFile('dist/icon-'+size+'.png');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
const fontCss=await readFile('dist/font.css','utf8');for(const match of fontCss.matchAll(/url\('\.\/([^']+)'\)/g)){if(match[1]==='NotoSansCJKjp-Regular.otf')continue;assert.ok(shell.includes(build.base+match[1]),'Offline font missing: '+match[1]);}
assert.ok(shell.includes(build.base+'demo.json'));assert.ok(shell.includes(build.base+'DejaVuSansMono.ttf'));assert.ok(shell.includes(build.base+'licenses/NOTICE.txt'));
console.log(JSON.stringify({passed:true,base:build.base,precacheFiles:shell.length,privateMedia:0,manifest:true,icons:true,relativeAssets:true,licenses:true}));
