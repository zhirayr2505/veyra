import React,{useState,useEffect,useRef} from 'react';
import {get,post} from './api.js';
import {Header,Icon,Photo,Empty,Button,Spinner,Tabs,InlineAlert} from './UI.jsx';
export function Chats({onOpen,onProfile,refreshTick=0,active=true}){
 const [list,setList]=useState([]),[tab,setTab]=useState('all'),[q,setQ]=useState(''),[busy,setBusy]=useState(true);
 const load=()=>get('/matches').then(setList).catch(()=>{}).finally(()=>setBusy(false));
 useEffect(()=>{if(active)load();const t=setInterval(()=>{if(active&&!document.hidden)load()},14000);return()=>clearInterval(t)},[refreshTick,active]);
 const filtered=list.filter(m=>(tab==='unread'?m.unread>0:true)&&(!q||m.profile?.name?.toLowerCase().includes(q.toLowerCase())));
 return <div className="page chats"><div className="title-line"><h1>чаты</h1><Header/></div><Tabs items={[['all','все'],['matches','мэтчи'],['unread','непрочитанные']]} value={tab} onChange={setTab}/><label className="search-chat"><Icon name="search" size={19}/><input placeholder="поиск" value={q} onChange={e=>setQ(e.target.value)}/></label>
 {busy&&list.length===0?<div className="center-loading"><Spinner/></div>:filtered.length===0?<Empty title="нет переписок" body="Взаимный лайк открывает чат. Общение начинается здесь."/>:
 <div className="chat-list">{filtered.map(m=><button key={m.id} className="chat-tile" onClick={()=>onOpen(m.id,m.profile)}><Photo id={m.profile?.photos?.[0]} className="chat-avatar"/><div className="chat-preview"><div className="chat-preview-head"><b>{m.profile?.name}, {m.profile?.age}</b><small>{m.last?.created_at?new Date(m.last.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):''}</small></div><p>{m.last?.body||'Вы понравились друг другу 💜'}</p></div>{m.unread>0&&<span className="unread">{m.unread}</span>}</button>)}</div>}
 </div>;
}
export function Conversation({matchId,partner,onBack,onProfile,onGift,myId}){
 const [messages,setMessages]=useState([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const scroll=useRef(null),last=useRef('');
 const reload=async()=>{const r=await get('/matches/'+matchId+'/messages');const list=r.messages||r.items||r.rows||(Array.isArray(r)?r:[]);setMessages(old=>JSON.stringify(old.map(m=>m.id))===JSON.stringify(list.map(m=>m.id))?old:list);const unread=list.filter(x=>String(x.sender)!==String(myId)&&!x.read_at).map(x=>x.id);if(unread.length)post('/matches/'+matchId+'/read',{ids:unread}).catch(()=>{});};
 useEffect(()=>{let active=true;reload().catch(e=>active&&setError(e.message));const interval=setInterval(()=>{if(active&&!document.hidden)reload().catch(()=>{})},6000);return()=>{active=false;clearInterval(interval)}},[matchId]);
 useEffect(()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:last.current?'smooth':'instant'});last.current='done'},[messages.length]);
 const send=async e=>{e.preventDefault();if(!body.trim()||busy)return;const txt=body.trim();setBody('');setBusy(true);try{await post('/matches/'+matchId+'/messages',{kind:'text',body:txt,client_id:crypto.randomUUID()});await reload()}catch(e){setBody(txt);setError(e.message)}finally{setBusy(false)}};
 return <div className="conversation"><div className="conversation-head"><button onClick={onBack} aria-label="Назад" className="quiet"><Icon name="back"/></button><button className="chat-user" onClick={()=>onProfile(partner?.id,matchId)}><Photo id={partner?.photos?.[0]} className="mini-avatar"/><span><b>{partner?.name||'мэтч'}</b><small>{partner?.online?'в сети':'общайтесь с уважением'}</small></span></button><button className="quiet" title="Подарок" onClick={()=>onGift(partner)}><Icon name="gift" tone="pink"/></button></div>
 <div className="message-stream" ref={scroll}>{messages.map(m=><div className={'bubble '+(String(m.sender)===String(myId)?'mine':'theirs')} key={m.id}><span>{m.body||'🎁'}</span><small>{new Date(m.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</small></div>)}</div>
 <InlineAlert>{error}</InlineAlert><form className="message-composer" onSubmit={send}><input maxLength={2000} placeholder="написать сообщение..." value={body} onChange={e=>setBody(e.target.value)} aria-label="Сообщение"/><button disabled={!body.trim()||busy} title="Отправить" type="submit"><Icon name="send" tone="white"/></button></form></div>
}
