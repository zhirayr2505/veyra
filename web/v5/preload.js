const base='/veyra-approved/';
const essential=['01_icons/active/heart.svg','01_icons/active/cards.svg','01_icons/inactive/search.svg','01_icons/inactive/chats.svg','01_icons/inactive/profile.svg','02_interest_icons/svg/normal/music.svg'];
export function preloadBrandAssets(onProgress=()=>{}){
 let complete=0;
 const jobs=essential.map(async file=>{try{const r=await fetch(base+file,{cache:'force-cache'});if(!r.ok)throw Error(String(r.status));}catch{}finally{complete++;onProgress(Math.round(100*complete/essential.length))}});
 return Promise.allSettled(jobs).then(()=>true);
}
