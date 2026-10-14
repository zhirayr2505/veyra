import sharp from 'sharp';

const DEFAULT_COLOR='#e9def5';
export const photoPlaceholderMeta=(rows=[])=>Object.fromEntries(rows.filter(row=>row?.id).map(row=>[String(row.id),{
 lqip:row.lqip||null,dominant:row.dominant_color||DEFAULT_COLOR
}]));

// One-time 24px blurred preview, never generated during a scroll or GET request.
export async function createPhotoPlaceholder(buffer){
 try{
  const img=sharp(buffer,{limitInputPixels:20000000,animated:false}).rotate();
  const {data,info}=await img.clone().resize(1,1,{fit:'cover'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const rgb=[0,1,2].map(i=>data[i]??208);
  const dominant='#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');
  // Avoid oversized data URIs in discovery payloads.
  const preview=await img.resize({width:28,height:28,fit:'inside',withoutEnlargement:true})
   .webp({quality:38,effort:4}).toBuffer();
  const lqip=preview.length<=1600?'data:image/webp;base64,'+preview.toString('base64'):null;
  return {lqip,dominant:info.channels===3?dominant:DEFAULT_COLOR};
 }catch{return {lqip:null,dominant:DEFAULT_COLOR};}
}
export async function backfillPhotoPlaceholders({db,storage,limit=12}){
 const rows=(await db.query('SELECT id,object_key FROM photos WHERE lqip IS NULL ORDER BY created_at LIMIT $1',[limit])).rows;
 let filled=0;
 for(const row of rows){
  try{
   const bytes=await storage.get(row.object_key);
   const meta=await createPhotoPlaceholder(bytes);
   if(!meta.lqip)continue;
   await db.query('UPDATE photos SET lqip=$2,dominant_color=$3 WHERE id=$1 AND lqip IS NULL',[row.id,meta.lqip,meta.dominant]);
   filled++;
  }catch{/* Old missing photos stay available; backfill resumes next batch. */}
 }
 return {scanned:rows.length,filled};
}
