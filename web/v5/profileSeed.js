// Shared, side-effect-free card → full profile hydration helpers.
export function normalizeProfileSeed(input,id){
 if(!input||typeof input!=='object')return null;
 if(input.id!=null&&id!=null&&String(input.id)!==String(id))return null;
 const photos=Array.isArray(input.photos)?input.photos.map(photo=>
  photo&&typeof photo==='object'?photo.id:photo).filter(Boolean):[];
 return {...input,id:input.id??id,photos};
}
export function mergeProfileSeed(previous,remote){
 if(!remote||typeof remote!=='object')return previous;
 const incoming=Object.fromEntries(Object.entries(remote).filter(([,value])=>value!==undefined));
 return normalizeProfileSeed({...previous,...incoming},incoming.id??previous?.id);
}
