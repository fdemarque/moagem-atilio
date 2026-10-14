const CACHE_NAME = '__CACHE_NAME__';
const STATIC_ASSETS = __STATIC_ASSETS__;
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))));
self.addEventListener('message',event => {if(event.data === 'ACTIVATE_UPDATE') self.skipWaiting();});
self.addEventListener('activate',event => event.waitUntil((async () => {
 const keys=await caches.keys();
 await Promise.all(keys.filter(k => k.startsWith('moagem-assets-') && k !== CACHE_NAME).map(k => caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event => {
 if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
 event.respondWith((async () => {
  const cache=await caches.open(CACHE_NAME);
  if(event.request.mode === 'navigate') return (await cache.match('/index.html')) || fetch(event.request);
  // Vite may send Vary: Origin. Precache requests and module requests differ,
  // but these versioned static files are identical within this same origin.
  const cached=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});
  if(cached) return cached;
  return fetch(event.request);
 })());
});
