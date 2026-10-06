import {fail} from './core.js';
import sharp from 'sharp';
export async function telegram(botToken,method,body){
 let payload=JSON.stringify(body),headers={'content-type':'application/json'};
 if(Buffer.isBuffer(body.photo)){
  payload=new FormData();headers={};
  for(const[k,v]of Object.entries(body))payload.append(k,k==='photo'?new Blob([v],{type:'image/webp'}):typeof v==='object'?JSON.stringify(v):String(v));
 }
 const r=await fetch(`https://api.telegram.org/bot${botToken}/${method}`,{method:'POST',headers,body:payload,signal:AbortSignal.timeout(12000)});
 const j=await r.json();if(!j.ok)throw Error('TELEGRAM_'+method+'_FAILED');return j.result;
}
async function storageError(response,prefix){let category='';if(response.status===400){try{const body=await response.clone().json();const detail=JSON.stringify([body.code,body.error,body.message,body.statusCode]).toLowerCase();const markers=[['invalid jwt','INVALID_JWT'],['signature','SIGNATURE'],['unauthorized','UNAUTHORIZED'],['api key','API_KEY'],['invalid key','INVALID_KEY'],['permission denied','PERMISSION_DENIED'],['row level','ROW_LEVEL_SECURITY'],['invalid bucket','INVALID_BUCKET'],['bucket not found','BUCKET_NOT_FOUND'],['not found','NOT_FOUND'],['invalid request','INVALID_REQUEST'],['bad request','BAD_REQUEST']];const match=markers.find(([needle])=>detail.includes(needle));category=/jwt|signature|authorization|unauthor|api.?key|token|invalid key/.test(detail)?'_AUTH':/permission|row.level|rls/.test(detail)?'_PERMISSION':'_REQUEST';if(match)category+='_'+match[1];}catch{category='_UNKNOWN';}}throw Error(prefix+response.status+category);}
// Supabase's legacy Storage API can wrap a 404/409 error in HTTP 400.
// Match only bucket-specific errors: auth failures must still stop startup.
async function bucketCondition(response,condition){
 if(![400,404,409].includes(response.status))return false;
 let body;try{body=await response.clone().json();}catch{return response.status===(condition==='missing'?404:409);}
 const codes=condition==='missing'?['NoSuchBucket']:['BucketAlreadyExists','ResourceAlreadyExists','already_exists','Duplicate'];
 if(codes.includes(body.code)||codes.includes(body.error))return true;
 const expected=condition==='missing'?'bucket not found':'the resource already exists';
 if([body.message,body.error].some(x=>typeof x==='string'&&x.toLowerCase()===expected))return true;
 // Preserve status-only responses, but do not mistake TenantNotFound for a bucket.
 return response.status===(condition==='missing'?404:409)&&!body.code&&!body.error&&!body.message;
}
export function storage(env){const base=env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1';const key=env.SUPABASE_SECRET_KEY;const headers={apikey:key};const newSecret=key.startsWith('sb_secret_');const legacyJwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);if(!newSecret&&!legacyJwt)throw Error('SUPABASE_SECRET_KEY_INVALID_FORMAT');if(legacyJwt)headers.Authorization=`Bearer ${key}`;const bucket='veyra-media';return {
 async ensure(){
  const endpoint=base+'/bucket/'+bucket;
  const read=async()=>{
   const response=await fetch(endpoint,{headers,signal:AbortSignal.timeout(15000)});
   if(response.ok)return response.json();
   if(await bucketCondition(response,'missing'))return null;
   await storageError(response,'STORAGE_BUCKET_READ_FAILED_');
  };
  let info=await read();
  if(!info){
   const response=await fetch(base+'/bucket',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:5242880,allowed_mime_types:['image/webp']}),signal:AbortSignal.timeout(15000)});
   if(!response.ok&&!await bucketCondition(response,'exists'))await storageError(response,'STORAGE_BUCKET_CREATE_FAILED_');
   // Creation returns only {name}; GET metadata after creation or a racing startup.
   info=await read();
   if(!info)throw Error('STORAGE_BUCKET_VERIFY_FAILED_NOT_FOUND');
  }
  if(info.public===true){
   const updated=await fetch(endpoint,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({public:false}),signal:AbortSignal.timeout(15000)});
   if(!updated.ok)throw Error('STORAGE_BUCKET_PRIVACY_UPDATE_FAILED_'+updated.status);
   info=await read();
  }
  if(info?.public!==false)throw Error('STORAGE_BUCKET_PRIVACY_UNCONFIRMED');
 },
 async put(key,buffer){const clean=await sharp(buffer,{limitInputPixels:20000000,animated:false}).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();const r=await fetch(base+'/object/'+bucket+'/'+key,{method:'POST',headers:{...headers,'content-type':'image/webp'},body:clean,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('UPLOAD_FAILED');},
 async get(key){const r=await fetch(base+'/object/authenticated/'+bucket+'/'+key,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)fail(404,'PHOTO_NOT_FOUND');return Buffer.from(await r.arrayBuffer());},
 async remove(key){const r=await fetch(base+'/object/'+bucket,{method:'DELETE',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({prefixes:[key]})});if(!r.ok)throw Error('STORAGE_DELETE_FAILED');}
 };}
export async function geo(env,params){const u=new URL('https://api.geoapify.com/v1/geocode/'+(params.text?'search':'reverse'));for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);u.searchParams.set('apiKey',env.GEOAPIFY_API_KEY);u.searchParams.set('format','json');u.searchParams.set('limit','6');const r=await fetch(u,{signal:AbortSignal.timeout(10000)});if(!r.ok)fail(503,'GEO_UNAVAILABLE');return (await r.json()).results.map(x=>({city:x.city||x.town||x.village||x.name||x.county,country:x.country,lat:x.lat,lon:x.lon,label:x.formatted})).filter(x=>x.city&&x.country);}
