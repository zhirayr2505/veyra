const ALLOWED=/^image\/(jpeg|png|webp)$/;
export const MAX_UPLOAD_BYTES=5*1024*1024;

/** Normalize phone camera originals before enforcing the server's upload limit.
 * The canvas dimensions are bounded even for 12–50MP camera files. */
export async function compressPortrait(file,{maxSide=2048,quality=.86}={}){
 if(!file||!ALLOWED.test(file.type))throw Error('Поддерживаются JPG, PNG и WEBP');
 if(file.size>40*1024*1024)throw Error('Исходная фотография слишком большая (максимум 40 МБ)');
 let source,url;
 try{
  if(typeof createImageBitmap==='function'){
   try{source=await createImageBitmap(file,{imageOrientation:'from-image'})}catch{/* Android fallback below */}
  }
  if(!source){
   url=URL.createObjectURL(file);
   const img=new Image();img.src=url;
   if(img.decode)await img.decode();
   else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
   source=img;
  }
  const w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;
  if(!w||!h)throw Error('Невозможно прочитать изображение');
  const scale=Math.min(1,maxSide/Math.max(w,h));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w*scale));
  canvas.height=Math.max(1,Math.round(h*scale));
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Недоступно сжатие фотографий');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const asBlob=(type)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  let blob=await asBlob('image/webp');
  if(!blob||blob.type!=='image/webp')blob=await asBlob('image/jpeg');
  if(!blob)throw Error('Не удалось сжать фотографию');
  if(blob.size>MAX_UPLOAD_BYTES)throw Error('Фото после сжатия больше 5 МБ. Попробуй другой снимок.');
  const ext=blob.type==='image/webp'?'webp':'jpg';
  const name=(file.name||'portrait').replace(/\.[^.]+$/,'')+'.'+ext;
  return new File([blob],name,{type:blob.type,lastModified:Date.now()});
 }finally{
  if(url)URL.revokeObjectURL(url);
  source?.close?.();
 }
}
