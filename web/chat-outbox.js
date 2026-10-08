// Private binary outbox. Blobs never go through JSON/Base64 or the application database.
const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('veyra-chat-outbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'key'}).createIndex('scope','scope');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function operation(mode,fn){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('media',mode),req=fn(tx.objectStore('media'));tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export const saveMediaDraft=(scope,message,blob)=>operation('readwrite',s=>s.put({key:scope+':'+message.client_id,scope,message:{...message,local_url:undefined},blob,updated:Date.now()}));
export const loadMediaDraft=(scope,id)=>operation('readonly',s=>s.get(scope+':'+id));
export const dropMediaDraft=(scope,id)=>operation('readwrite',s=>s.delete(scope+':'+id));
export const listMediaDrafts=async scope=>operation('readonly',s=>s.index('scope').getAll(scope));
