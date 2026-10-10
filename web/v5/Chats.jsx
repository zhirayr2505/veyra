import React,{useState,useEffect,useRef,useLayoutEffect,useMemo,useCallback} from 'react';
import {get,post,patch,put,request,getBearer} from './api.js';
import {Logo,Icon,Photo,Empty,Spinner,InlineAlert,Sheet} from './UI.jsx';

const haptic=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{}};
const clock=value=>value?new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'';
const shortTime=value=>{
 if(!value)return '';
 const day=new Date(value),today=new Date();
 return day.toDateString()===today.toDateString()?clock(value):
  today.getTime()-day.getTime()<86400000&&day.getDate()!==today.getDate()?'Вчера':
  day.toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
};
const preview=m=>{
 if(!m.last)return 'Вы понравились друг другу 💗';
 if(m.last.kind==='image')return '📷 Фото'+(m.last.body?' · '+m.last.body:'');
 if(m.last.kind==='sticker')return '💜 Стикер';
 if(m.last.kind==='voice')return '🎤 Голосовое сообщение';
 return m.last.body||'Сообщение';
};

export function Chats({onOpen,refreshTick=0,active=true}){
 const [list,setList]=useState([]),[tab,setTab]=useState('all'),[q,setQ]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState('');
 const inFlight=useRef(false),activeRef=useRef(active);
 activeRef.current=active;
 const load=useCallback(async()=>{
  if(inFlight.current||!activeRef.current)return;
  inFlight.current=true;
  try{
   const rows=await get('/matches');
   setList(old=>JSON.stringify(old)===JSON.stringify(rows)?old:rows);
   setError('');
  }catch(e){setError('Не удалось обновить чаты: '+e.message)}
  finally{inFlight.current=false;setBusy(false)}
 },[]);
 useEffect(()=>{
  if(active)load();
  const timer=setInterval(()=>{if(activeRef.current&&!document.hidden)load()},15000);
  const visible=()=>{if(activeRef.current&&!document.hidden)load()};
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('online',visible);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible)};
 },[load,active,refreshTick]);
 const filtered=useMemo(()=>list.filter(m=>(tab!=='unread'||m.unread>0)&&
   (!q.trim()||[m.profile?.name,m.profile?.city].some(v=>String(v||'').toLocaleLowerCase('ru').includes(q.trim().toLocaleLowerCase('ru')))))
   .sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||
    new Date(b.last?.created_at||b.created_at).getTime()-new Date(a.last?.created_at||a.created_at).getTime()),[list,tab,q]);
 const pin=async m=>{
  haptic();
  setList(rows=>rows.map(row=>row.id===m.id?{...row,pinned:!m.pinned}:row));
  try{await patch('/matches/'+m.id+'/pin',{pinned:!m.pinned})}
  catch(e){setList(rows=>rows.map(row=>row.id===m.id?{...row,pinned:m.pinned}:row));setError(e.message)}
 };
 return <div className="page chats veyra-chats">
  <div className="ve-chats-brand"><Logo width={151}/></div>
  <h1>Чаты</h1>
  <label className="search-chat ve-chat-search"><Icon name="search" size={20}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск собеседников" aria-label="Поиск чатов"/>{q&&<button className="ve-clear" onClick={()=>setQ('')} aria-label="Очистить поиск" type="button">×</button>}</label>
  <div className="ve-chat-tabs" role="tablist" aria-label="Фильтр чатов">{[['all','Все'],['unread','Непрочитанные']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'selected':''} onClick={()=>{haptic();setTab(key)}}>{label}</button>)}</div>
  {error&&<div className="alert" role="alert">{error} <button className="text-link" onClick={load}>Повторить</button></div>}
  {busy&&list.length===0?<div className="center-loading"><Spinner/></div>:filtered.length===0&&!error?<Empty title={q?'Ничего не найдено':tab==='unread'?'Всё прочитано':'Пока нет переписок'} body={q?'Попробуй другое имя.':tab==='unread'?'Новых сообщений пока нет.':'После взаимной симпатии вы сможете общаться здесь.'}/>:<div className="chat-list ve-chat-list">
   {filtered.map(m=><div className={'chat-tile ve-chat-tile '+(m.pinned?'ve-pinned':'')} key={m.id} role="button" tabIndex={0} onClick={()=>{haptic();onOpen(m.id,m.profile)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen(m.id,m.profile)}}}>
    <span className="ve-avatar-wrap"><Photo id={m.profile?.photos?.[0]} className="chat-avatar"/>{m.profile?.online&&<i className="ve-online-dot" aria-label="В сети"/>}</span>
    <span className="chat-preview">
     {m.pinned&&<span className="ve-pinned-caption">✦ Закреплённый чат</span>}
     <span className="chat-preview-head"><b>{m.profile?.name||'Собеседник'}{m.profile?.age?', '+m.profile.age:''}</b><small>{shortTime(m.last?.created_at||m.created_at)}</small></span>
     <span className="ve-chat-second"><span className="ve-chat-last">{preview(m)}</span>{m.unread>0&&<span className="unread">{m.unread>99?'99+':m.unread}</span>}</span>
    </span>
    <button className={'ve-pin-button '+(m.pinned?'is-pinned':'')} type="button" aria-label={m.pinned?'Открепить чат':'Закрепить чат'} title={m.pinned?'Открепить':'Закрепить'} onClick={e=>{e.stopPropagation();pin(m)}}><Icon name="pin" size={17} tone={m.pinned?'pink':'dark'}/></button>
   </div>)}
  </div>}
 </div>;
}
function MessagePhoto({matchId,messageId,onView}){
 const [attempt,setAttempt]=useState(0),[state,setState]=useState({url:'',failed:false});
 const frame=useRef(null);
 useEffect(()=>{
  let live=true,obj='',observer;const controller=new AbortController();
  setState({url:'',failed:false});
  const load=()=>fetch('/api/matches/'+encodeURIComponent(matchId)+'/messages/'+encodeURIComponent(messageId)+'/media',{
   headers:{Authorization:'Bearer '+getBearer()},signal:controller.signal
  }).then(r=>{if(!r.ok)throw Error('IMAGE_UNAVAILABLE');return r.blob()})
   .then(b=>{obj=URL.createObjectURL(b);if(live)setState({url:obj,failed:false});else URL.revokeObjectURL(obj)})
   .catch(()=>{if(live&&!controller.signal.aborted)setState({url:'',failed:true})});
  if(frame.current&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'250px'});
   observer.observe(frame.current);
  }else load();
  return()=>{live=false;controller.abort();observer?.disconnect();if(obj)URL.revokeObjectURL(obj)};
 },[matchId,messageId,attempt]);
 return <span className="message-image-frame" ref={frame}>
  {state.url?<button type="button" className="ve-image-open" onClick={()=>onView(state.url)} aria-label="Открыть фото на весь экран"><img className="message-image" src={state.url} alt="Фотография в переписке" loading="lazy" decoding="async"/></button>:
   state.failed?<button type="button" className="message-image-retry" onClick={()=>setAttempt(n=>n+1)}>↻ Фото не открылось · Повторить</button>:
   <span className="message-image-placeholder">Загружаем фото…</span>}
 </span>;
}
const mergeMessages=(existing,incoming)=>{
 const byId=new Map(existing.map(m=>[m.id,m]));
 for(const m of incoming){const prev=byId.get(m.id);byId.set(m.id,prev?{...prev,...m}:m)}
 return [...byId.values()].filter(x=>x.created_at).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));
};
export function Conversation({matchId,partner,onBack,onProfile,onGift,myId}){
 const [messages,setMessages]=useState([]),[gifts,setGifts]=useState([]),[body,setBody]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[before,setBefore]=useState(null),[more,setMore]=useState(false);
 const [stickerMode,setStickerMode]=useState(false),[stickers,setStickers]=useState([]),[selected,setSelected]=useState(null),[reply,setReply]=useState(null);
 const [typing,setTyping]=useState(false),[online,setOnline]=useState(!!partner?.online);
 const [viewer,setViewer]=useState(''),[menu,setMenu]=useState(false),[report,setReport]=useState(false),[reportReason,setReportReason]=useState('spam'),[reportBusy,setReportBusy]=useState(false);
 const [attachments,setAttachments]=useState(false),[showLatest,setShowLatest]=useState(false);
 const frame=useRef(null),scroll=useRef(null),first=useRef(true),autoScroll=useRef(true),syncRef=useRef(''),syncBusy=useRef(false),syncGeneration=useRef(0),scrollAnchor=useRef(null),input=useRef(null),photoInput=useRef(null),typingAt=useRef(0),touchTimer=useRef(null),giftBusy=useRef(false);
 const timeline=useMemo(()=>[
  ...messages.map(m=>({...m,eventType:'message'})),
  ...gifts.filter(g=>g.delivered_at).map(g=>({...g,id:'gift-'+g.id,created_at:g.delivered_at,eventType:'gift'}))
 ].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id))),[messages,gifts]);
 const fetchPage=async({older=false,initial=false}={})=>{
  if(!older&&syncBusy.current)return;
  const generation=syncGeneration.current;
  if(!older)syncBusy.current=true;
  try{
   let version=initial?'':syncRef.current,oldest=null,moreHistory=false,typingNow=false,onlineNow=false;
   const collected=[],unread=[];
   for(let page=0;page<(older||initial?1:4);page++){
    const qs=older&&before?'?before='+encodeURIComponent(before):version?'?since='+encodeURIComponent(version):'';
    const r=await get('/matches/'+matchId+'/messages'+qs);
    if(generation!==syncGeneration.current)return;
    const rows=r.messages||[];
    collected.push(...rows);
    if(page===0){oldest=r.before;moreHistory=!!r.has_more}
    typingNow=!!r.typing;onlineNow=!!r.online;
    unread.push(...rows.filter(m=>String(m.sender)!==String(myId)&&!m.read_at&&!m.deleted).map(m=>m.id));
    if(r.sync_version&&(!version||BigInt(r.sync_version)>BigInt(version)))version=String(r.sync_version);
    if(older||initial||!r.sync_more||!rows.length)break;
   }
   if(generation!==syncGeneration.current)return;
   if(!older){
    const node=scroll.current;
    if(initial||node&&node.scrollHeight-node.scrollTop-node.clientHeight<135)autoScroll.current=true;
   }
   if(older){setMessages(old=>mergeMessages(old,collected));setBefore(oldest);setMore(moreHistory)}
   else{
    setMessages(old=>initial?mergeMessages([],collected):mergeMessages(old,collected));
    if(!syncRef.current||initial){setBefore(oldest);setMore(moreHistory)}
    if(version)syncRef.current=version;
    setTyping(typingNow);setOnline(onlineNow);
   }
   if(unread.length)for(let i=0;i<unread.length;i+=100)post('/matches/'+matchId+'/read',{ids:unread.slice(i,i+100)}).catch(()=>{});
   setError('');
  }finally{if(!older&&generation===syncGeneration.current)syncBusy.current=false}
 };
 const fetchGifts=async()=>{
  if(giftBusy.current)return;
  giftBusy.current=true;
  try{const r=await get('/matches/'+matchId+'/gifts');setGifts(old=>JSON.stringify(old)===JSON.stringify(r.gifts)?old:r.gifts||[])}
  catch(e){/* message transport remains usable if gifts are temporarily unavailable */}
  finally{giftBusy.current=false}
 };
 useEffect(()=>{
  let live=true;++syncGeneration.current;syncBusy.current=false;syncRef.current='';
  first.current=true;autoScroll.current=true;scrollAnchor.current=null;
  setMessages([]);setGifts([]);setBefore(null);setMore(false);setError('');setTyping(false);
  fetchPage({initial:true}).catch(e=>{if(live)setError('Не удалось загрузить переписку: '+e.message)});
  fetchGifts();
  get('/chat/stickers').then(r=>{if(live)setStickers(r.stickers||[])}).catch(()=>{});
  const poll=()=>{if(live&&!document.hidden)fetchPage().catch(e=>{if(live)setError('Не удалось обновить переписку: '+e.message)})};
  const timer=setInterval(poll,3500);
  const giftTimer=setInterval(()=>{if(live&&!document.hidden)fetchGifts()},14000);
  const visible=()=>{if(!document.hidden){poll();fetchGifts()}};
  document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);
  return()=>{live=false;++syncGeneration.current;clearInterval(timer);clearInterval(giftTimer);clearTimeout(touchTimer.current);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible)};
 },[matchId]);
 useEffect(()=>{
  const viewport=window.visualViewport;
  const resize=()=>{if(frame.current)frame.current.style.setProperty('--chat-viewport-height',(viewport?.height||window.innerHeight)+'px')};
  resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
  return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize)};
 },[]);
 useLayoutEffect(()=>{
  const node=scroll.current;if(!node)return;
  if(scrollAnchor.current){const {height,top}=scrollAnchor.current;node.scrollTop=node.scrollHeight-height+top;scrollAnchor.current=null;return}
  if(first.current||autoScroll.current){node.scrollTop=node.scrollHeight;first.current=false;autoScroll.current=false;setShowLatest(false)}
 },[timeline.length,timeline.at(-1)?.id,typing]);
 const nearBottom=()=>{const node=scroll.current;return !node||node.scrollHeight-node.scrollTop-node.clientHeight<150};
 const bottom=()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'});setShowLatest(false)};
 const send=async e=>{
  e.preventDefault();if(!body.trim()||busy)return;
  const txt=body.trim(),quote=reply;autoScroll.current=true;setBody('');setBusy(true);setError('');
  try{const sent=await post('/matches/'+matchId+'/messages',{kind:'text',body:txt,client_id:crypto.randomUUID(),...(quote?{reply_to:quote.id}:{})});
   if(sent?.id)setMessages(old=>mergeMessages(old,[sent]));setReply(null);await fetchPage();
   post('/matches/'+matchId+'/typing',{typing:false}).catch(()=>{});
  }catch(e){setBody(txt);setError(e.message)}finally{setBusy(false)}
 };
 const sendSticker=async st=>{
  if(busy)return;autoScroll.current=true;setBusy(true);
  try{const sent=await post('/matches/'+matchId+'/messages',{kind:'sticker',sticker_id:st.id,client_id:crypto.randomUUID(),...(reply?{reply_to:reply.id}:{})});
   if(sent?.id)setMessages(old=>mergeMessages(old,[sent]));setStickerMode(false);setReply(null);await fetchPage();
  }catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const sendPhoto=e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){setError('Фото должно быть JPG, PNG или WEBP до 12 МБ');return}
  autoScroll.current=true;setBusy(true);setError('');setAttachments(false);
  const fd=new FormData();fd.append('kind','image');fd.append('client_id',crypto.randomUUID());fd.append('body','');
  if(reply)fd.append('reply_to',reply.id);fd.append('file',file);
  post('/matches/'+matchId+'/media',fd).then(async sent=>{if(sent?.id)setMessages(old=>mergeMessages(old,[sent]));setReply(null);await fetchPage()})
   .catch(e=>setError(e.message)).finally(()=>setBusy(false));
 };
 const onTyping=e=>{
  setBody(e.target.value);
  const time=Date.now();
  if(e.target.value&&time-typingAt.current>4500){typingAt.current=time;post('/matches/'+matchId+'/typing',{typing:true}).catch(()=>{})}
 };
 const chooseReaction=async emoji=>{
  const m=selected;if(!m)return;setSelected(null);haptic();
  const own=m.reactions?.find(r=>r.mine)?.emoji;
  try{const updated=await put('/matches/'+matchId+'/messages/'+m.id+'/reaction',{emoji:own===emoji?null:emoji});
   if(updated?.id)setMessages(old=>mergeMessages(old,[updated]));
  }catch(e){setError('Не удалось сохранить реакцию: '+e.message)}
 };
 const edit=async()=>{
  const m=selected;if(!m)return;
  setSelected(null);const revised=window.prompt('Редактировать сообщение',m.body);
  if(revised===null||!revised.trim()||revised.trim()===m.body)return;
  try{const updated=await patch('/matches/'+matchId+'/messages/'+m.id,{body:revised.trim()});setMessages(old=>mergeMessages(old,[updated]))}
  catch(e){setError(e.message)}
 };
 const del=async scope=>{
  const m=selected;if(!m)return;
  if(scope==='everyone'&&!window.confirm('Удалить сообщение у обоих?'))return;
  setSelected(null);
  try{await request('/matches/'+matchId+'/messages/'+m.id,{method:'DELETE',body:{scope}});
   if(scope==='me')setMessages(old=>old.filter(x=>x.id!==m.id));
   else setMessages(old=>old.map(x=>x.id===m.id?{...x,deleted:true}:x));
   await fetchPage();
  }catch(e){setError(e.message)}
 };
 const older=async()=>{
  if(!more||!before)return;
  const node=scroll.current;scrollAnchor.current=node?{height:node.scrollHeight,top:node.scrollTop}:null;
  try{await fetchPage({older:true})}catch(e){scrollAnchor.current=null;setError(e.message)}
 };
 const submitReport=async()=>{
  if(reportBusy)return;setReportBusy(true);
  try{await post('/matches/'+matchId+'/report',{reason:reportReason,details:''});setReport(false);setError('Жалоба отправлена модераторам')}
  catch(e){setError(e.message)}finally{setReportBusy(false)}
 };
 const block=async()=>{
  if(!partner?.id||!window.confirm('Заблокировать пользователя? Переписка станет недоступна.'))return;
  try{await post('/blocks',{target:String(partner.id)});setMenu(false);onBack()}
  catch(e){setError(e.message)}
 };
 const openActions=m=>{haptic();setSelected(m)};
 return <div className="conversation ve-conversation" ref={frame}>
  <header className="conversation-head">
   <button type="button" onClick={onBack} aria-label="Назад" className="quiet"><Icon name="back"/></button>
   <button type="button" className="chat-user" onClick={()=>onProfile(partner?.id,matchId)}>
    <span className="ve-avatar-wrap"><Photo id={partner?.photos?.[0]} className="mini-avatar"/>{online&&<i className="ve-online-dot" aria-label="В сети"/>}</span>
    <span><b>{partner?.name||'Собеседник'}{partner?.age?', '+partner.age:''}</b><small className={typing?'ve-typing-status':''}>{typing?'печатает…':online?'в сети':'не в сети'}</small></span>
   </button>
   <button type="button" className="quiet ve-header-more" title="Дополнительно" aria-label="Меню переписки" onClick={()=>setMenu(true)}><Icon name="more"/></button>
  </header>
  <div className="ve-timeline-wrap">
   <div className="message-stream" ref={scroll} role="log" aria-label="Сообщения" onScroll={()=>setShowLatest(!nearBottom())}>
    {more&&<button className="history-more" onClick={older}>Загрузить предыдущие сообщения</button>}
    {timeline.map((m,i)=>{
     const mine=String(m.sender)===String(myId),date=new Date(m.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
     const earlier=timeline[i-1]&&new Date(timeline[i-1].created_at).toDateString()===new Date(m.created_at).toDateString();
     return <React.Fragment key={m.id}>{!earlier&&<div className="ve-day-stamp">{date}</div>}
      {m.eventType==='gift'?<div className={'ve-gift-event '+(mine?'gift-mine':'gift-theirs')}>
       <div className="ve-gift-top">🎁 {mine?'Вы отправили подарок':'Вам отправили подарок'}</div>
       <div className="ve-gift-content"><span className="ve-gift-emoji">{m.emoji||'🎁'}</span><span><strong>{m.name}</strong>{m.note&&<small>{m.note}</small>}<span className="ve-gift-time">{clock(m.created_at)}</span></span></div>
       <button type="button" onClick={()=>onProfile(partner?.id,matchId)}>Посмотреть профиль</button>
      </div>:<div className={'ve-message-row '+(mine?'mine':'theirs')}>
       <div className={'bubble '+(mine?'mine':'theirs')+(m.kind==='image'?' ve-photo-bubble':'')}
        onContextMenu={e=>{e.preventDefault();openActions(m)}}
        onTouchStart={()=>{clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>openActions(m),550)}}
        onTouchEnd={()=>clearTimeout(touchTimer.current)}
        onTouchMove={()=>clearTimeout(touchTimer.current)}>
        {!m.deleted&&<button className="ve-message-actions" type="button" aria-label="Действия с сообщением" onClick={()=>openActions(m)}>···</button>}
        {m.deleted?<em>Сообщение удалено</em>:<>
         {m.reply&&<div className="quoted-msg"><strong>{m.reply.unavailable?'Сообщение недоступно':m.reply.name||'Ответ'}</strong><span>{m.reply.unavailable?'Сообщение недоступно':m.reply.body||'Фото или стикер'}</span></div>}
         {m.kind==='image'&&<MessagePhoto matchId={matchId} messageId={m.id} onView={setViewer}/>}
         {m.kind==='sticker'&&<img className="message-sticker" alt="Стикер" src={stickers.find(s=>s.id===m.sticker_id)?.src||''}/>}
         {m.body&&<span className="ve-bubble-text">{m.body}</span>}
        </>}
        <small className="ve-message-time">{m.edited_at&&'изм. · '}{clock(m.created_at)}{mine&&<span className="ve-receipt" title={m.read_at?'Прочитано':m.delivered_at?'Доставлено':'Отправлено'}>{m.read_at?'✓✓':m.delivered_at?'✓✓':'✓'}</span>}</small>
       </div>
       {!!m.reactions?.length&&!m.deleted&&<div className="ve-reactions">{m.reactions.map(r=><button key={r.emoji} type="button" className={r.mine?'own':''} onClick={()=>{setSelected(m);haptic()}} aria-label={'Реакция '+r.emoji+' '+r.count}>{r.emoji} {r.count}</button>)}</div>}
      </div>}</React.Fragment>
    })}
    {typing&&<div className="ve-typing-bubble"><span/><span/><span/><small>{partner?.name||'Собеседник'} печатает…</small></div>}
   </div>
   {showLatest&&<button type="button" className="ve-scroll-latest" onClick={bottom} aria-label="К последним сообщениям">↓</button>}
  </div>
  {error&&<InlineAlert>{error}</InlineAlert>}
  {reply&&<div className="reply-composer"><span><b>↪ Ответ на сообщение</b><small>{reply.body||'Фото или стикер'}</small></span><button type="button" aria-label="Отменить ответ" onClick={()=>setReply(null)}>×</button></div>}
  {stickerMode&&<div className="sticker-tray">{stickers.map(st=><button type="button" key={st.id} title={st.label} disabled={busy} onClick={()=>sendSticker(st)}><img loading="lazy" src={st.src} alt={st.label}/></button>)}</div>}
  {attachments&&<div className="ve-attachment-tray"><button type="button" onClick={()=>photoInput.current?.click()}><Icon name="camera" tone="pink"/> Фото</button><button type="button" onClick={()=>{setStickerMode(v=>!v);setAttachments(false)}}><Icon name="sparkle" tone="pink"/> Стикеры</button><button type="button" onClick={()=>{setAttachments(false);onGift(partner)}}><Icon name="gift" tone="pink"/> Подарок</button></div>}
  <form className="message-composer ve-message-composer" onSubmit={send}>
   <button className="ve-composer-plus" type="button" title="Вложения" aria-label="Вложения" onClick={()=>{haptic();setAttachments(v=>!v)}}><Icon name="plus" tone="white" size={23}/></button>
   <input ref={input} maxLength={2000} placeholder="Написать сообщение…" value={body} onChange={onTyping} aria-label="Сообщение"/>
   <button className="ve-composer-tool" type="button" title="Отправить фото" onClick={()=>photoInput.current?.click()}><Icon name="camera" size={22}/></button>
   <button className="ve-composer-tool" type="button" title="Отправить подарок" onClick={()=>onGift(partner)}><Icon name="gift" size={22}/></button>
   <button className="ve-composer-send" disabled={!body.trim()||busy} title="Отправить" type="submit"><Icon name="send" tone="white" size={22}/></button>
   <input type="file" hidden ref={photoInput} onChange={sendPhoto} accept="image/jpeg,image/png,image/webp"/>
  </form>
  {selected&&<Sheet title="Сообщение" onClose={()=>setSelected(null)}>
   {!selected.deleted&&<div className="ve-emoji-reactions">{['❤️','😍','🥰','😂','🔥','👍'].map(emoji=><button type="button" key={emoji} onClick={()=>chooseReaction(emoji)}>{emoji}</button>)}</div>}
   {!selected.deleted&&<button className="menu-item" onClick={()=>{setReply(selected);setSelected(null);input.current?.focus()}}>↪ Ответить</button>}
   {selected.body&&!selected.deleted&&<button className="menu-item" onClick={()=>{navigator.clipboard?.writeText(selected.body).catch(()=>{});setSelected(null)}}>Копировать текст</button>}
   {String(selected.sender)===String(myId)&&['text','image'].includes(selected.kind)&&!selected.deleted&&<button className="menu-item" onClick={edit}>Редактировать</button>}
   {String(selected.sender)===String(myId)&&<button className="menu-item" onClick={()=>del('me')}>Удалить у меня</button>}
   {String(selected.sender)===String(myId)&&<button className="menu-item danger" onClick={()=>del('everyone')}>Удалить у всех</button>}
   {String(selected.sender)!==String(myId)&&<button className="menu-item danger" onClick={()=>{setSelected(null);setReport(true)}}>Пожаловаться</button>}
  </Sheet>}
  {menu&&<Sheet title="Настройки переписки" onClose={()=>setMenu(false)}>
   <button className="menu-item" onClick={()=>{setMenu(false);onProfile(partner?.id,matchId)}}>Посмотреть профиль</button>
   <button className="menu-item" onClick={()=>{setMenu(false);onGift(partner)}}>🎁 Отправить подарок</button>
   <button className="menu-item" onClick={()=>{setMenu(false);setReport(true)}}>Пожаловаться</button>
   <button className="menu-item danger" onClick={block}>Заблокировать</button>
  </Sheet>}
  {report&&<Sheet title="Пожаловаться на переписку" onClose={()=>setReport(false)}>
   <p className="ve-report-help">Выбери причину. Жалоба поступит модераторам VEYRA.</p>
   <div className="ve-report-options">{[['spam','Спам'],['harassment','Оскорбления или угрозы'],['fraud','Мошенничество'],['explicit','Неприемлемый контент'],['fake','Фейковый профиль'],['other','Другое']].map(([key,label])=><label key={key}><input type="radio" name="chat-report" checked={reportReason===key} onChange={()=>setReportReason(key)}/>{label}</label>)}</div>
   <button className="btn primary full" type="button" disabled={reportBusy} onClick={submitReport}>Отправить жалобу</button>
  </Sheet>}
  {viewer&&<div className="ve-media-viewer" role="dialog" aria-modal="true" aria-label="Просмотр фотографии" onClick={()=>setViewer('')}><button type="button" className="ve-viewer-close" aria-label="Закрыть">×</button><img src={viewer} alt="Фото в полном размере" onClick={e=>e.stopPropagation()}/></div>}
 </div>;
}
