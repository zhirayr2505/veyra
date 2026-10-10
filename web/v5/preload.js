// Cache only public branded vector assets. Personal photographs and messages are never cached.
const names=['back','camera','cards','chat','chat_filled','check','close','crown','filters','gift','heart','heart_filled','more','pin','plus','search','send','settings','shield_check','sparkle','star','undo','user','user_filled','verified'];
const tones=['dark','pink','white'];
const version='veyra.brand.cache.20261010.v6';
const paths=['/assets/veyra/00_brand/veyra_logo.svg',...tones.flatMap(t=>names.map(n=>'/assets/veyra/01_icons/svg/'+t+'/'+n+'.svg'))];
let inflight;
export function preloadBrandAssets(onProgress=()=>{}){
 if(inflight)return inflight;
 let complete=0,failures=0,next=0;const first=(()=>{try{return localStorage.getItem(version)!=='ready'}catch{return true}})();
 onProgress(first?0:100);
 if(!first){inflight=Promise.resolve(true);return inflight;}
 // Bounded concurrency keeps the first launch responsive even on mobile networks.
 const jobs=Array.from({length:Math.min(8,paths.length)},async()=>{
  while(next<paths.length){const file=paths[next++];
   try{const r=await fetch(file,{cache:'force-cache'});if(!r.ok)throw Error('ASSET_'+r.status)}catch{failures++}
   complete++;onProgress(Math.round(complete/paths.length*100));
  }
 });
 const all=Promise.allSettled(jobs).then(()=>{if(!failures){try{localStorage.setItem(version,'ready')}catch{}}return failures===0});
 // Fail open after eight seconds; assets continue warming after the splash.
 inflight=Promise.race([all,new Promise(resolve=>setTimeout(()=>resolve(false),8000))]);
 return inflight;
}
