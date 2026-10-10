// Warm only the critical first-screen VEYRA assets; noncritical art is lazy-loaded by the browser.
// Never cache profile photos or private chat data here.
const base='/assets/veyra/05_premium_icons/';
const paths=[
 '/assets/veyra/00_brand/veyra_logo.svg',
 ...['cards','heart','chat','user'].flatMap(name=>[base+'dark/'+name+'.svg',base+'pink/'+name+'_filled.svg']),
 base+'pink/filters.svg',base+'pink/refresh.svg',base+'dark/search.svg'
];
const version='veyra.brand.cache.20261011.premium';
let inflight;
export function preloadBrandAssets(onProgress=()=>{}){
 if(inflight)return inflight;
 let complete=0,failures=0,next=0;
 const first=(()=>{try{return localStorage.getItem(version)!=='ready'}catch{return true}})();
 onProgress(first?0:100);
 if(!first){inflight=Promise.resolve(true);return inflight;}
 const jobs=Array.from({length:Math.min(6,paths.length)},async()=>{
  while(next<paths.length){
   const file=paths[next++];
   try{const r=await fetch(file,{cache:'force-cache'});if(!r.ok)throw Error('ASSET_'+r.status)}catch{failures++}
   complete++;onProgress(Math.round(complete/paths.length*100));
  }
 });
 const all=Promise.allSettled(jobs).then(()=>{if(!failures){try{localStorage.setItem(version,'ready')}catch{}}return failures===0});
 inflight=Promise.race([all,new Promise(resolve=>setTimeout(()=>resolve(false),4500))]);
 return inflight;
}
