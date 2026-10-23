// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import{createServer}from'node:http';
import{readFile,stat}from'node:fs/promises';
import{resolve,extname}from'node:path';
const root=resolve(process.env.NOCTURNE_DIST??'dist'),config=JSON.parse(await readFile(resolve(root,'build.json'),'utf8'));
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(302,{Location:config.base});res.end();return;}
 if(!url.pathname.startsWith(config.base)){res.writeHead(404);res.end();return;}
 const path=resolve(root,decodeURIComponent(url.pathname.slice(config.base.length))||'index.html');if(!path.startsWith(root+'/'))throw Error('Caminho inválido.');
 const data=await readFile(path),type={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'}[extname(path)]??'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(data);
}catch{res.writeHead(404);res.end('Não encontrado.');}}).listen(Number(process.env.PORT??4173),'0.0.0.0',()=>console.log('Nocturne Pages '+config.base));
