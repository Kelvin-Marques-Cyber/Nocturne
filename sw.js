// Nocturne PWA. The Pages builder injects a content-versioned shell manifest.
const VERSION='c46e29e73fb2994a',CACHE='nocturne-'+VERSION,SHELL=["/Nocturne/DejaVuSans-Bold.ttf","/Nocturne/DejaVuSans.ttf","/Nocturne/DejaVuSansMono-Bold.ttf","/Nocturne/DejaVuSansMono-Oblique.ttf","/Nocturne/DejaVuSansMono.ttf","/Nocturne/DejaVuSerif-Bold.ttf","/Nocturne/DejaVuSerif.ttf","/Nocturne/assets/__vite-browser-external-BIHI7g3E.js","/Nocturne/assets/analysis-worker-uNHDmfT7.js","/Nocturne/assets/fonts-BA2tadhU.js","/Nocturne/assets/index-CODcr9V9.js","/Nocturne/assets/index-D7gxSPGe.css","/Nocturne/assets/render-B0m5yvDS.js","/Nocturne/demo.json","/Nocturne/font.css","/Nocturne/icon-192.png","/Nocturne/icon-512.png","/Nocturne/icon.svg","/Nocturne/index.html","/Nocturne/licenses/AAC-MPL.txt","/Nocturne/licenses/Apache-2.0.txt","/Nocturne/licenses/DejaVu.txt","/Nocturne/licenses/LPPL-1.3c.tex","/Nocturne/licenses/Latin-Modern-GUST.txt","/Nocturne/licenses/Latin-Modern-MANIFEST.txt","/Nocturne/licenses/Latin-Modern-README.txt","/Nocturne/licenses/Mediabunny-MPL.txt","/Nocturne/licenses/NOTICE.txt","/Nocturne/licenses/NotoCJK-OFL.txt","/Nocturne/licenses/OpenType-MIT.txt","/Nocturne/lmmonolt10-regular.otf","/Nocturne/lmroman10-italic.otf","/Nocturne/lmroman10-regular.otf","/Nocturne/lmsans10-bold.otf","/Nocturne/lmsans10-regular.otf","/Nocturne/lmsansdemicond10-regular.otf","/Nocturne/manifest.webmanifest"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
// Keep the preceding shell so another open tab can finish its current work.
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('nocturne-')&&k!==CACHE).slice(0,-1).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='NOCTURNE_ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.includes('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL('index.html',scope).href))));return;
 }
 // Current unversioned assets must win; only hashed chunks may fall back to
 // the previous shell for a tab that was already open during the update.
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const current=await cache.match(request);if(current)return current;
  if(url.pathname.startsWith(scope.pathname+'assets/')){const previous=await caches.match(request);if(previous)return previous;}
  const response=await fetch(request);if(response.ok){const copy=response.clone();void cache.put(request,copy);}return response;
 }));
});
