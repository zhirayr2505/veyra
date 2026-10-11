const base='/veyra-approved/';
const essential=['00_brand/veyra_logo_primary.svg','01_icons/active/heart.svg','01_icons/active/cards.svg','01_icons/inactive/search.svg','01_icons/inactive/chats.svg','01_icons/inactive/profile.svg','02_interest_icons/svg/normal/music.svg','04_empty_states/svg/no_matches_yet.svg','04_empty_states/svg/no_messages_yet.svg'];
export function preloadBrandAssets(onProgress=()=>{}){
 let completed=0;const load=essential.map(async path=>{try{const r=await fetch(base+path,{cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));}catch{}finally{completed++;onProgress(Math.round(100*completed/essential.length))}});
 return Promise.allSettled(load).then(()=>true);
}
