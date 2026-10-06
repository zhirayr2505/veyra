let session='';
export function setSession(s){session=s;}
export async function api(path,options={}){const body=options.body;const form=body instanceof FormData;const r=await fetch('/api'+path,{...options,headers:{...(!form?{'content-type':'application/json'}:{}),...(session?{Authorization:'Bearer '+session}:{}),...options.headers},body:body?(form?body:JSON.stringify(body)):undefined});if(!r.ok){let j;try{j=await r.json();}catch{}throw Error(j?.error||'NETWORK_ERROR');}return options.raw?r:r.json();}
export const post=(path,body={})=>api(path,{method:'POST',body});
export async function download(path,name){const r=await api(path,{raw:true});const b=await r.blob();const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
