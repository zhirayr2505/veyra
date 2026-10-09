let session='';
export function setSession(s){session=s;}
export async function api(path,options={}){const body=options.body;const form=body instanceof FormData;const r=await fetch('/api'+path,{...options,signal:options.signal||AbortSignal.timeout(30000),headers:{...(!form?{'content-type':'application/json'}:{}),...(session?{Authorization:'Bearer '+session}:{}),...options.headers},body:body?(form?body:JSON.stringify(body)):undefined});if(!r.ok){let j;try{j=await r.json();}catch{}throw Error(j?.error||'NETWORK_ERROR');}return options.raw?r:r.json();}
export const post=(path,body={})=>api(path,{method:'POST',body});
export async function download(path,name){const r=await api(path,{raw:true});const b=await r.blob();const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

// XHR supplies real upload progress while retaining the existing bearer session.
export function uploadMedia(path,form,onProgress,signal){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('POST','/api'+path);xhr.timeout=90000;xhr.setRequestHeader('Authorization','Bearer '+session);
 xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(Math.round(e.loaded/e.total*100));};
 const abort=()=>xhr.abort();signal?.addEventListener('abort',abort,{once:true});
 const done=()=>signal?.removeEventListener('abort',abort);
 xhr.onload=()=>{done();let data;try{data=JSON.parse(xhr.responseText);}catch{}if(xhr.status>=200&&xhr.status<300&&data)resolve(data);else reject(Error(data?.error||'NETWORK_ERROR'));};
 xhr.onerror=xhr.ontimeout=()=>{done();reject(Error('NETWORK_ERROR'));};xhr.onabort=()=>{done();reject(Error('UPLOAD_ABORTED'));};
 if(signal?.aborted){done();reject(Error('UPLOAD_ABORTED'));return;}xhr.send(form);
});}
