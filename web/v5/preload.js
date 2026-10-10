// Fetch the approved VEYRA UI kit while signed Telegram auth is running.
// HTTP cache holds public immutable brand graphics; no private user media is written here.
const names=['back','camera','cards','chat','chat_filled','check','close','crown','filters','gift','heart','heart_filled','more','pin','plus','search','send','settings','shield_check','sparkle','star','undo','user','user_filled','verified'];
const tones=['dark','pink','white'];
let pending;
export function preloadBrandAssets(){
 if(pending)return pending;
 const paths=['/assets/veyra/00_brand/veyra_logo.svg',...tones.flatMap(t=>names.map(n=>'/assets/veyra/01_icons/svg/'+t+'/'+n+'.svg'))];
 const warm=async()=>{await Promise.allSettled(paths.map(path=>fetch(path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('ASSET_'+r.status)})))};
 // Warm every icon, but never strand first launch on a slow connection.
 pending=Promise.race([warm(),new Promise(resolve=>setTimeout(resolve,1800))]).then(()=>true);
 return pending;
}
