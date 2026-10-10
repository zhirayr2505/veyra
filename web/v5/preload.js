// Warm tiny public brand resources before first interactive render.
// Do not cache or preload private images, messages or personalized responses.
const names=['back','camera','cards','chat','chat_filled','check','close','crown','filters','gift','heart','heart_filled','more','pin','plus','search','send','settings','shield_check','sparkle','star','undo','user','user_filled','verified'];
const tones=['dark','pink','white'];
const critical=['/assets/veyra/00_brand/veyra_logo.svg',...['dark','pink'].flatMap(t=>['back','heart','heart_filled','chat','user','cards','close','filters','star','gift','settings'].map(n=>'/assets/veyra/01_icons/svg/'+t+'/'+n+'.svg'))];
const remaining=tones.flatMap(t=>names.map(n=>'/assets/veyra/01_icons/svg/'+t+'/'+n+'.svg')).filter(x=>!critical.includes(x));
let pending;
async function warm(paths,concurrency=6){let next=0;await Promise.all(Array.from({length:Math.min(concurrency,paths.length)},async()=>{while(next<paths.length){const file=paths[next++];try{const r=await fetch(file,{cache:'force-cache'});if(!r.ok)throw Error('RESOURCE_'+r.status)}catch{/* Browser renders a fallback if offline. */}}}));}
export function preloadBrandAssets(){
 if(pending)return pending;
 const primary=warm(critical);
 // Do not queue all 75 requests alongside Telegram login; prefetch rest in background.
 pending=Promise.race([primary,new Promise(resolve=>setTimeout(resolve,1800))]).then(()=>{primary.finally(()=>warm(remaining,5)).catch(()=>{});return true});
 return pending;
}
