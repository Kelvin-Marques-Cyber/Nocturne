// Nocturne PWA. The Pages builder injects a content-versioned shell manifest.
const VERSION='f0657847f69c2f70',CACHE='nocturne-'+VERSION,SHELL=["/Nocturne/DejaVuSans-Bold.ttf","/Nocturne/DejaVuSansMono-Bold.ttf","/Nocturne/DejaVuSansMono-Oblique.ttf","/Nocturne/DejaVuSansMono.ttf","/Nocturne/DejaVuSerif.ttf","/Nocturne/assets/__vite-browser-external-BIHI7g3E.js","/Nocturne/assets/analysis-worker-uNHDmfT7.js","/Nocturne/assets/fonts-DUCd8Zfm.js","/Nocturne/assets/index-Bl8hVzXi.css","/Nocturne/assets/index-L95Aiv3r.js","/Nocturne/assets/render-14wM37iQ.js","/Nocturne/demo.json","/Nocturne/font.css","/Nocturne/icon-192.png","/Nocturne/icon-512.png","/Nocturne/icon.svg","/Nocturne/index.html","/Nocturne/licenses/AAC-MPL.txt","/Nocturne/licenses/Apache-2.0.txt","/Nocturne/licenses/DejaVu.txt","/Nocturne/licenses/Mediabunny-MPL.txt","/Nocturne/licenses/NOTICE.txt","/Nocturne/licenses/NotoCJK-OFL.txt","/Nocturne/licenses/OpenType-MIT.txt","/Nocturne/manifest.webmanifest"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('nocturne-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.includes('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match(new URL('index.html',scope).href)));return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));
});
