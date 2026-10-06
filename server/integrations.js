import {fail} from './core.js';
import sharp from 'sharp';
export async function telegram(botToken,method,body){const r=await fetch(`https://api.telegram.org/bot${botToken}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});const j=await r.json();if(!j.ok)throw Error('TELEGRAM_'+method+'_FAILED');return j.result;}
async function storageError(response,prefix){let category='';if(response.status===400){try{const body=await response.clone().json();const detail=JSON.stringify([body.code,body.error,body.message,body.statusCode]).toLowerCase();category=/jwt|signature|authorization|unauthor|api.?key|token/.test(detail)?'_AUTH':/permission|row.level|rls/.test(detail)?'_PERMISSION':'_REQUEST';}catch{category='_UNKNOWN';}}throw Error(prefix+response.status+category);}
export function storage(env){const base=env.SUPABASE_URL+'/storage/v1';const key=env.SUPABASE_SECRET_KEY;const headers={apikey:key,Authorization:`Bearer ${key}`};const newSecret=key.startsWith('sb_secret_');const legacyJwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);if(!newSecret&&!legacyJwt)throw Error('SUPABASE_SECRET_KEY_INVALID_FORMAT');const bucket='veyra-media';return {
 async ensure(){
  const endpoint=base+'/bucket/'+bucket;
  const read=async()=>{const response=await fetch(endpoint,{headers});if(response.status!==404&&!response.ok)await storageError(response,'STORAGE_BUCKET_READ_FAILED_');return response;};
  let response=await read();
  if(response.status===404){
   response=await fetch(base+'/bucket',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:5242880,allowed_mime_types:['image/webp']})});
   // Another startup may have created the bucket between GET and POST.
   if(response.status===409)response=await read();
   else if(!response.ok)throw Error('STORAGE_BUCKET_CREATE_FAILED_'+response.status);
  }
  let info=await response.json();
  if(info.public===true){
   const updated=await fetch(endpoint,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({public:false})});
   if(!updated.ok)throw Error('STORAGE_BUCKET_PRIVACY_UPDATE_FAILED_'+updated.status);
   response=await read();
   if(!response.ok)throw Error('STORAGE_BUCKET_VERIFY_FAILED_'+response.status);
   info=await response.json();
  }
  if(info.public!==false)throw Error('STORAGE_BUCKET_PRIVACY_UNCONFIRMED');
 },
 async put(key,buffer){const clean=await sharp(buffer,{limitInputPixels:20000000,animated:false}).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();const r=await fetch(base+'/object/'+bucket+'/'+key,{method:'POST',headers:{...headers,'content-type':'image/webp'},body:clean,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('UPLOAD_FAILED');},
 async get(key){const r=await fetch(base+'/object/authenticated/'+bucket+'/'+key,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)fail(404,'PHOTO_NOT_FOUND');return Buffer.from(await r.arrayBuffer());},
 async remove(key){const r=await fetch(base+'/object/'+bucket,{method:'DELETE',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({prefixes:[key]})});if(!r.ok)throw Error('STORAGE_DELETE_FAILED');}
 };}
export async function geo(env,params){const u=new URL('https://api.geoapify.com/v1/geocode/'+(params.text?'search':'reverse'));for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);u.searchParams.set('apiKey',env.GEOAPIFY_API_KEY);u.searchParams.set('format','json');u.searchParams.set('limit','6');const r=await fetch(u,{signal:AbortSignal.timeout(10000)});if(!r.ok)fail(503,'GEO_UNAVAILABLE');return (await r.json()).results.map(x=>({city:x.city||x.town||x.village||x.name||x.county,country:x.country,lat:x.lat,lon:x.lon,label:x.formatted})).filter(x=>x.city&&x.country);}
