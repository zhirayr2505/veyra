/* VEYRA asset-only Service Worker — never intercept /api or private media. */
const VERSION='veyra-static-v6';
const BRAND='veyra-brand-v6';
const ICONS=['back','camera','cards','chat','chat_filled','check','close','crown','filters','gift','heart','heart_filled','more','pin','plus','search','send','settings','shield_check','sparkle','star','undo','user','user_filled','verified'];
const STATIC=['/assets/veyra/00_brand/veyra_logo.svg',...['dark','pink','white'].flatMap(t=>ICONS.map(n=>'/assets/veyra/01_icons/svg/'+t+'/'+n+'.svg'))];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(BRAND);await Promise.allSettled(STATIC.map(async u=>{const r=await fetch(u,{cache:'reload'});if(r.ok)await cache.put(u,r)}));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('veyra-')&&key!==VERSION&&key!==BRAND)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/webhooks/'))return;
 const brand=url.pathname.startsWith('/assets/veyra/')||url.pathname.startsWith('/graphics/brand/');
 const built=/^\/assets\/[^/]+\.(?:js|css|woff2?|png|svg|webp)$/.test(url.pathname);
 if(!brand&&!built)return;
 event.respondWith((async()=>{
  const cache=await caches.open(brand?BRAND:VERSION),saved=await cache.match(req);
  if(saved)return saved;
  try{const response=await fetch(req);if(response.ok)cache.put(req,response.clone()).catch(()=>{});return response;}
  catch(e){return Response.error()}
 })());
});
