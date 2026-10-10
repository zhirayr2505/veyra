let bearer='';
const photos=new Map(),inflight=new Map();
export function setBearer(token){bearer=token||'';}
export async function request(path,{method='GET',body,signal}={}){
 const form=body instanceof FormData;
 const res=await fetch('/api'+path,{method,signal,headers:{...(bearer?{Authorization:'Bearer '+bearer}:{}),...(!form&&body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:form?body:JSON.stringify(body)});
 if(!res.ok){const j=await res.json().catch(()=>({}));throw Error(j.error||('HTTP_'+res.status));}
 return res.status===204?null:res.json();
}
export const get=path=>request(path);
export const post=(path,body)=>request(path,{method:'POST',body});
export const put=(path,body)=>request(path,{method:'PUT',body});
export const patch=(path,body)=>request(path,{method:'PATCH',body});
export async function photoUrl(id){
 if(!id)return '';
 if(photos.has(id)){const url=photos.get(id);photos.delete(id);photos.set(id,url);while(photos.size>64){const oldest=photos.keys().next().value;URL.revokeObjectURL(photos.get(oldest));photos.delete(oldest)}return url;}
 if(inflight.has(id))return inflight.get(id);
 const promise=fetch('/api/photos/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+bearer}})
  .then(r=>{if(!r.ok)throw Error('PHOTO_UNAVAILABLE');return r.blob()})
  .then(blob=>{const url=URL.createObjectURL(blob);photos.set(id,url);return url})
  .finally(()=>inflight.delete(id));
 inflight.set(id,promise);return promise;
}
export function cachedPhoto(id){return photos.get(id)||'';}
export function clearPhotoCache(){for(const url of photos.values())URL.revokeObjectURL(url);photos.clear();inflight.clear();}
export function photoOrder(ids){return request('/photos/order',{method:'PUT',body:{ids}});}

export async function download(path,filename){
 const r=await fetch('/api'+path,{headers:{Authorization:'Bearer '+bearer}});
 if(!r.ok)throw Error('DOWNLOAD_FAILED');
 const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
