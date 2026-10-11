const base='/veyra-v2/';
const essential=['brand/veyra-wordmark-purple.svg','icons/active/heart.svg','icons/outline/chat.svg','icons/outline/search.svg','icons/outline/encounters.svg','icons/outline/user.svg','illustrations/no-profiles.svg'];
export function preloadBrandAssets(onProgress=()=>{}){
 let complete=0;
 const jobs=essential.map(async file=>{try{const r=await fetch(base+file,{cache:'force-cache'});if(!r.ok)throw Error(String(r.status));}catch{}finally{complete++;onProgress(Math.round(100*complete/essential.length))}});
 return Promise.allSettled(jobs).then(()=>true);
}
