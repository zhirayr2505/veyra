// Public brand assets only: never cache private /api, photos, message media or auth.
export const ICON_NAMES=['back','camera','cards','chat','chat_filled','check','close','crown','filters','gift','heart','heart_filled','more','pin','plus','search','send','settings','shield_check','sparkle','star','undo','user','user_filled','verified'];
export const BRAND_ASSETS=[
 '/assets/veyra/00_brand/veyra_logo.svg',
 ...['dark','pink','white'].flatMap(tone=>ICON_NAMES.map(name=>'/assets/veyra/01_icons/svg/'+tone+'/'+name+'.svg'))
];
let inflight;
export function preloadBrandAssets(){
 if(inflight)return inflight;
 // Cache API is optional inside Telegram WebView; ordinary browser HTTP cache remains a fallback.
 inflight=(async()=>{
  const assets=BRAND_ASSETS.slice();
  const cache=typeof caches!=='undefined'?await caches.open('veyra-brand-v6').catch(()=>null):null;
  let failed=0;
  async function worker(){
   while(assets.length){
    const url=assets.shift();
    try{
     if(cache&&await cache.match(url))continue;
     const response=await fetch(url,{cache:'force-cache',credentials:'same-origin'});
     if(!response.ok)throw Error('RESOURCE_'+response.status);
     if(cache)await cache.put(url,response.clone());
    }catch{failed++}
   }
  }
  await Promise.all(Array.from({length:8},worker));
  return {failed};
 })();
 return inflight;
}
export function registerBrandWorker(){
 if('serviceWorker' in navigator && location.protocol==='https:'){
  navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
 }
}
