// SPDX-License-Identifier: Apache-2.0
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Project} from '../src/engine/model';
export async function native3DRenderer(project:Project,width:number,height:number){
 const {createServer}=await import('vite'),{default:puppeteer}=await import('puppeteer-core');
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
 let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
 try{
  const local=resolve('.cache/chrome/chrome-headless-shell-linux64/chrome-headless-shell');
  let executablePath=process.env.NOCTURNE_BROWSER??(existsSync(local)?local:undefined);
  if(!executablePath){const {ensureBrowser}=await import('@remotion/renderer'),result=await ensureBrowser({logLevel:'error'});if(!('path'in result))throw Error('Instale o Chrome com npx remotion browser ensure ou defina NOCTURNE_BROWSER.');executablePath=result.path;}
  browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
  const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1});
  const port=(server.httpServer!.address() as {port:number}).port;
  await page.goto(`http://127.0.0.1:${port}/src/three-host.html`,{waitUntil:'networkidle0',timeout:60000});
  await page.waitForFunction('window.nocturne3DReady===true',{timeout:60000});
  await page.evaluate(async(project,width,height)=>{await (window as any).nocturne3DInit(project,width,height);},project,width,height);
  return {async frame(frame:number){await page.evaluate(f=>(window as any).nocturne3DFrame(f),frame);return Buffer.from(await page.screenshot({type:'png',optimizeForSpeed:true}));},async close(){await browser!.close();await server.close();}};
 }catch(e){await browser?.close();await server.close();throw e;}
}
