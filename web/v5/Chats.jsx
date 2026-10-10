import React,{useState,useEffect,useRef} from 'react';
import {get,post,patch,request,getBearer} from './api.js';
import {Header,Icon,Photo,Empty,Button,Spinner,Tabs,InlineAlert,Sheet} from './UI.jsx';
export function Chats({onOpen,onProfile,refreshTick=0,active=true}){
 const [list,setList]=useState([]),[tab,setTab]=useState('all'),[q,setQ]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const load=()=>get('/matches').then(rows=>{setList([...rows].sort((a,b)=>new Date(b.last?.created_at||b.created_at)-new Date(a.last?.created_at||a.created_at)));setError('')}).catch(e=>setError('Не удалось обновить чаты: '+e.message)).finally(()=>setBusy(false));
 useEffect(()=>{if(active)load();const t=setInterval(()=>{if(active&&!document.hidden)load()},12000);const visible=()=>{if(active&&!document.hidden)load()};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',visible)}},[refreshTick,active]);
 const filtered=list.filter(m=>(tab==='unread'?m.unread>0:tab==='matches'?!m.last:true)&&(!q||m.profile?.name?.toLowerCase().includes(q.toLowerCase())));
 return <div className="page chats"><div className="title-line"><h1>чаты</h1><Header/></div><Tabs items={[['all','все'],['matches','мэтчи'],['unread','непрочитанные']]} value={tab} onChange={setTab}/><label className="search-chat"><Icon name="search" size={19}/><input placeholder="поиск" value={q} onChange={e=>setQ(e.target.value)}/></label>
 {error&&<div className="alert" role="alert">{error} <button className="text-link" onClick={load}>повторить</button></div>}
 {busy&&list.length===0?<div className="center-loading"><Spinner/></div>:filtered.length===0&&!error?<Empty title={tab==='matches'?'новых мэтчей пока нет':tab==='unread'?'всё прочитано':'нет переписок'} body={tab==='matches'?'Здесь будут новые взаимные симпатии без переписки.':'Взаимный лайк открывает чат. Общение начинается здесь.'}/>:filtered.length>0?
 <div className="chat-list">{filtered.map(m=><button key={m.id} className="chat-tile" onClick={()=>onOpen(m.id,m.profile)}><Photo id={m.profile?.photos?.[0]} className="chat-avatar"/><div className="chat-preview"><div className="chat-preview-head"><b>{m.profile?.name}, {m.profile?.age}</b><small>{m.last?.created_at?new Date(m.last.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):''}</small></div><p>{m.last?.kind==='image'?'📷 Фото':m.last?.kind==='sticker'?'💜 Стикер':m.last?.body||'Вы понравились друг другу 💜'}</p></div>{m.unread>0&&<span className="unread">{m.unread}</span>}</button>)}</div>:null}
 </div>;
}
function MessagePhoto({matchId,messageId}){
 const[url,setUrl]=useState('');
 useEffect(()=>{let live=true;let obj=null;fetch('/api/matches/'+matchId+'/messages/'+messageId+'/media',{headers:{Authorization:'Bearer '+getBearer()}})
  .then(r=>{if(!r.ok)throw Error('IMAGE_UNAVAILABLE');return r.blob()}).then(b=>{obj=URL.createObjectURL(b);if(live)setUrl(obj);else URL.revokeObjectURL(obj)}).catch(()=>{});
 return()=>{live=false;if(obj)URL.revokeObjectURL(obj)}},[matchId,messageId]);
 return url?<img className="message-image" src={url} alt="Отправленное фото" loading="lazy" decoding="async"/>:<span className="message-image-placeholder">▧ фото</span>;
}
export function Conversation({matchId,partner,onBack,onProfile,onGift,myId}){
 const [messages,setMessages]=useState([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(false),[before,setBefore]=useState(null),[stickerMode,setStickerMode]=useState(false),[stickers,setStickers]=useState([]),[selected,setSelected]=useState(null),[reply,setReply]=useState(null),[typing,setTyping]=useState(false);
 const scroll=useRef(null),first=useRef(true),autoScroll=useRef(true),syncRef=useRef(''),touchRef=useRef(null),input=useRef(null),photoInput=useRef(null),typingAt=useRef(0);
 const merge=(existing,incoming)=>{const byId=new Map(existing.map(x=>[x.id,x]));for(const x of incoming){const old=byId.get(x.id);byId.set(x.id,x.deleted?{...old,...x}:({...old,...x}))}return [...byId.values()].sort((a,b)=>a.created_at===b.created_at?a.id.localeCompare(b.id):new Date(a.created_at)-new Date(b.created_at))};
 const fetchPage=async({older=false,initial=false}={})=>{
  const qs=older&&before?'?before='+encodeURIComponent(before):!initial&&syncRef.current?'?since='+encodeURIComponent(syncRef.current):'';
  const r=await get('/matches/'+matchId+'/messages'+qs);const rows=r.messages||[];
  if(!older){const node=scroll.current;if(initial||node&&node.scrollHeight-node.scrollTop-node.clientHeight<120)autoScroll.current=true;}
  if(older){setMessages(old=>merge(old,rows));setBefore(r.before);setMore(r.has_more)}
  else {setMessages(old=>initial?rows:merge(old,rows));if(!syncRef.current||initial){setBefore(r.before);setMore(r.has_more)}if(r.sync_version)syncRef.current=String(r.sync_version);setTyping(!!r.typing)}
  const unread=rows.filter(m=>String(m.sender)!==String(myId)&&!m.read_at&&!m.deleted).map(m=>m.id);
  if(unread.length)post('/matches/'+matchId+'/read',{ids:unread.slice(0,100)}).catch(()=>{});
 };
 useEffect(()=>{let live=true;syncRef.current='';first.current=true;setMessages([]);setBefore(null);setMore(false);
 fetchPage({initial:true}).catch(e=>{if(live)setError(e.message)});
 get('/chat/stickers').then(r=>{if(live)setStickers(r.stickers||[])}).catch(()=>{});
 const poll=()=>{if(live&&!document.hidden)fetchPage().catch(e=>{if(live)setError('Не удалось обновить переписку: '+e.message)})};
 const timer=setInterval(poll,3500);const visible=()=>{if(!document.hidden)poll()};document.addEventListener('visibilitychange',visible);
 return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible)}},[matchId]);
 useEffect(()=>{if(!scroll.current)return;if(first.current||autoScroll.current){scroll.current.scrollTop=scroll.current.scrollHeight;first.current=false;autoScroll.current=false}},[messages.length,messages.at(-1)?.id]);
 const send=async e=>{e.preventDefault();if(!body.trim()||busy)return;const txt=body.trim();autoScroll.current=true;setBody('');setBusy(true);setError('');
 try{await post('/matches/'+matchId+'/messages',{kind:'text',body:txt,client_id:crypto.randomUUID(),...(reply?{reply_to:reply.id}:{})});setReply(null);await fetchPage()}catch(e){setBody(txt);setError(e.message)}finally{setBusy(false)}};
 const sendSticker=async st=>{if(busy)return;autoScroll.current=true;setBusy(true);try{await post('/matches/'+matchId+'/messages',{kind:'sticker',sticker_id:st.id,client_id:crypto.randomUUID(),...(reply?{reply_to:reply.id}:{})});setStickerMode(false);setReply(null);await fetchPage()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const sendPhoto=e=>{autoScroll.current=true;const file=e.target.files?.[0];e.target.value='';if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){setError('Фото должно быть JPG, PNG или WEBP до 12 МБ');return;}setBusy(true);setError('');const fd=new FormData();fd.append('kind','image');fd.append('client_id',crypto.randomUUID());fd.append('body','');if(reply)fd.append('reply_to',reply.id);fd.append('file',file);post('/matches/'+matchId+'/media',fd).then(async()=>{setReply(null);await fetchPage()}).catch(e=>setError(e.message)).finally(()=>setBusy(false));};
 const onTyping=e=>{setBody(e.target.value);const time=Date.now();if(e.target.value&&time-typingAt.current>4500){typingAt.current=time;post('/matches/'+matchId+'/typing',{typing:true}).catch(()=>{})}};
 const menu=(m)=>setSelected(m);
 const edit=async()=>{const text=window.prompt('Редактировать сообщение',selected.body)||'';if(!text.trim())return;try{await patch('/matches/'+matchId+'/messages/'+selected.id,{body:text});await fetchPage()}catch(e){setError(e.message)}setSelected(null)};
 const del=async(scope)=>{if(scope==='everyone'&&!window.confirm('Удалить сообщение у обоих?'))return;try{await request('/matches/'+matchId+'/messages/'+selected.id,{method:'DELETE',body:{scope}});await fetchPage()}catch(e){setError(e.message)}setSelected(null)};
 const older=async()=>{if(!more||!before)return;const node=scroll.current,h=node?.scrollHeight;try{await fetchPage({older:true});requestAnimationFrame(()=>{if(node)node.scrollTop=node.scrollHeight-h})}catch(e){setError(e.message)}};
 return <div className="conversation"><div className="conversation-head"><button onClick={onBack} aria-label="Назад" className="quiet"><Icon name="back"/></button><button className="chat-user" onClick={()=>onProfile(partner?.id,matchId)}><Photo id={partner?.photos?.[0]} className="mini-avatar"/><span><b>{partner?.name||'мэтч'}</b><small>{typing?'печатает...':partner?.online?'в сети':'общайтесь с уважением'}</small></span></button><button className="quiet" title="Подарок" onClick={()=>onGift(partner)}><Icon name="gift" tone="pink"/></button></div>
 <div className="message-stream" ref={scroll}>{more&&<button className="history-more" onClick={older}>загрузить предыдущие сообщения</button>}{messages.map(m=><div key={m.id} className={'bubble '+(String(m.sender)===String(myId)?'mine':'theirs')} onContextMenu={e=>{e.preventDefault();menu(m)}} onTouchStart={()=>{touchRef.current=setTimeout(()=>menu(m),600)}} onTouchEnd={()=>clearTimeout(touchRef.current)} onTouchMove={()=>clearTimeout(touchRef.current)}>
 {m.deleted?<em>сообщение удалено</em>:<>{m.reply&&<div className="quoted-msg">↪ {m.reply.body||'фото или стикер'}</div>}{m.kind==='image'&&<MessagePhoto matchId={matchId} messageId={m.id}/>}
 {m.kind==='sticker'&&<img className="message-sticker" alt="Стикер" src={stickers.find(s=>s.id===m.sticker_id)?.src||''}/>}
 {m.body&&<span>{m.body}</span>}
 {m.edited_at&&<small>изменено</small>}</>}
 <small>{new Date(m.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}{String(m.sender)===String(myId)&&(m.read_at?' · ✓✓':m.delivered_at?' · ✓✓':' · ✓')}</small></div>)}</div>
 <InlineAlert>{error}</InlineAlert>{reply&&<div className="reply-composer"><span>↪ {reply.body||'фото/стикер'}</span><button onClick={()=>setReply(null)}>×</button></div>}
 {stickerMode&&<div className="sticker-tray">{stickers.map(st=><button key={st.id} title={st.label} disabled={busy} onClick={()=>sendSticker(st)}><img loading="lazy" src={st.src} alt={st.label}/></button>)}</div>}
 <form className="message-composer" onSubmit={send}><button className="quiet" type="button" title="Отправить фото" onClick={()=>photoInput.current?.click()}><Icon name="camera" tone="pink"/></button><button className="quiet" type="button" title="Стикеры" onClick={()=>setStickerMode(v=>!v)}><Icon name="sparkle" tone="pink"/></button><input ref={input} maxLength={2000} placeholder="написать сообщение..." value={body} onChange={onTyping} aria-label="Сообщение"/><button disabled={!body.trim()||busy} title="Отправить" type="submit"><Icon name="send" tone="white"/></button><input type="file" hidden ref={photoInput} onChange={sendPhoto} accept="image/jpeg,image/png,image/webp"/></form>
 {selected&&<Sheet title="сообщение" onClose={()=>setSelected(null)}><button className="menu-item" onClick={()=>{setReply(selected);setSelected(null);input.current?.focus()}}>ответить</button>{selected.body&&<button className="menu-item" onClick={()=>{navigator.clipboard?.writeText(selected.body).catch(()=>{});setSelected(null)}}>копировать</button>}{String(selected.sender)===String(myId)&&selected.kind==='text'&&<button className="menu-item" onClick={edit}>редактировать</button>}<button className="menu-item" onClick={()=>del('me')}>удалить у меня</button>{String(selected.sender)===String(myId)&&<button className="menu-item danger" onClick={()=>del('everyone')}>удалить у всех</button>}</Sheet>}
 </div>;
}