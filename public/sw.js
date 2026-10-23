// Nocturne PWA. The Pages builder injects a content-versioned shell manifest.
const VERSION='__BUILD_VERSION__',CACHE='nocturne-'+VERSION,SHELL=__PRECACHE__;
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
