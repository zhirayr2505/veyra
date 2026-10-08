import {useEffect,useRef} from 'react';
import {uploadMedia} from './api';
import {saveMediaDraft,listMediaDrafts,loadMediaDraft,dropMediaDraft} from './chat-outbox';
export function useMediaQueue({scope,base,setItems,merge,onError}){
 const options=useRef({setItems,merge,onError});options.current={setItems,merge,onError};const active=useRef(new Map()),urls=useRef(new Set()),alive=useRef(true);
 const url=blob=>{const value=URL.createObjectURL(blob);urls.current.add(value);return value;};
 const patch=(id,values)=>{if(alive.current)options.current.setItems(old=>old.map(m=>m.client_id===id?{...m,...values}:m));};
 const forgetSession=id=>{try{const key=scope+':outbox',rows=JSON.parse(sessionStorage.getItem(key)||'[]');sessionStorage.setItem(key,JSON.stringify(rows.filter(m=>m.client_id!==id)));}catch{}};
 useEffect(()=>{alive.current=true;listMediaDrafts(scope).then(rows=>{if(!alive.current)return;for(const row of rows){const message={...row.message,local:'failed',local_url:url(row.blob)};options.current.setItems(old=>{if(old.some(m=>!m.local&&m.client_id===message.client_id)){dropMediaDraft(scope,message.client_id).catch(()=>{});return old;}return [...old.filter(m=>m.client_id!==message.client_id),message].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));});}}).catch(()=>{});return()=>{alive.current=false;for(const controller of active.current.values())controller.abort();for(const value of urls.current)URL.revokeObjectURL(value);};},[scope]);
 async function deliver(message,blob){if(active.current.has(message.client_id))return;const controller=new AbortController();active.current.set(message.client_id,controller);patch(message.client_id,{local:'uploading',progress:0,error_code:null});
  try{if(!blob)blob=(await loadMediaDraft(scope,message.client_id))?.blob;const form=new FormData();form.set('kind',message.kind);form.set('client_id',message.client_id);form.set('body',message.body||'');if(message.reply_to)form.set('reply_to',message.reply_to);if(blob)form.set('file',blob,message.kind==='image'?'photo.webp':'voice');
   const row=await uploadMedia(base+'/media',form,progress=>patch(message.client_id,{local:progress>=100?'sending':'uploading',progress}),controller.signal);
   if(alive.current){options.current.setItems(old=>old.filter(m=>!m.local||m.client_id!==message.client_id));options.current.merge([{...row,...(!row.deleted&&message.local_url?{local_url:message.local_url}:{})}]);}forgetSession(message.client_id);await dropMediaDraft(scope,message.client_id).catch(()=>{});
  }catch(error){patch(message.client_id,{local:'failed',error_code:error.message});if(error.message!=='NETWORK_ERROR'&&error.message!=='UPLOAD_ABORTED')options.current.onError(error);}
  finally{active.current.delete(message.client_id);}
 }
 async function queue(message,blob){const pending={...message,local:'preparing',local_url:url(blob)};options.current.setItems(old=>[...old,pending]);try{await saveMediaDraft(scope,pending,blob);}catch{patch(message.client_id,{local:'failed',error_code:'OUTBOX_UNAVAILABLE'});options.current.onError(Error('OUTBOX_UNAVAILABLE'));return false;}if(alive.current)deliver(pending,blob);return true;}
 async function discard(message){active.current.get(message.client_id)?.abort();await dropMediaDraft(scope,message.client_id).catch(()=>{});forgetSession(message.client_id);options.current.setItems(old=>old.filter(m=>m.client_id!==message.client_id));}
 return {queue,retry:message=>deliver(message),discard};
}
