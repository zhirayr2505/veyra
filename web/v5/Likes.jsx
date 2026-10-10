import React,{useEffect,useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import {get,post} from './api.js';
import {Header,Photo,Button,Tabs,Icon,Empty,Spinner} from './UI.jsx';
import './Likes.css';

const haptic=(kind='light')=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(kind)}catch{}};
const label=p=>[p?.name,p?.age].filter(v=>v!==null&&v!==undefined&&v!=='').join(', ');

function PersonCard({person,match,onProfile,onChat,onLike,onSeen,processing}){
 const p=person,mutual=!!match;
 const open=()=>{haptic();if(mutual)onSeen(match);onProfile(p.id,mutual?match.id:null)};
 const action=()=>{haptic('medium');if(mutual){onSeen(match);onChat(match.id,p)}else onLike(p)};
 return <article className="likes-person">
  <Photo className="likes-person-photo" id={p.photos?.[0]} alt={'Фото '+label(p)} onClick={open}/>
  <div className="likes-photo-shade" aria-hidden="true"/>
  {match?.is_new&&<span className="likes-new-tag"><Icon name="sparkle" tone="white" size={12}/> новый мэтч</span>}
  <div className="likes-person-details">
   <strong className="likes-person-name">{label(p)} {p.online===true&&<span className="likes-online" aria-label="В сети" title="Сейчас в сети"/>}</strong>
   {p.city&&<small className="likes-person-city"><Icon name="pin" tone="white" size={12}/><span>{p.city}</span></small>}
  </div>
  <button type="button" className="likes-photo-action" disabled={processing} aria-label={(mutual?'Открыть переписку с ':'Ответить симпатией ')+p.name} onClick={action}>
   <Icon name={mutual?'chat_filled':'heart_filled'} tone="pink" size={22}/>
   {mutual&&match.unread>0&&<span className="likes-chat-unread">{match.unread>99?'99+':match.unread}</span>}
  </button>
 </article>;
}

function Locked({count,onPremium}){
 const visible=Math.min(6,count);
 return <>
  <div className="likes-count-line"><span>Входящие симпатии</span><span>{count}</span></div>
  <div className="likes-locked-intro"><span><Icon name="crown" tone="pink" size={25}/></span><div><strong>{count===1?'Кто-то заметил тебя':'Тобой заинтересовались'}</strong><p>Посмотри входящие симпатии с Premium</p></div></div>
  <div className="likes-gallery">{Array.from({length:visible},(_,i)=><div key={i} className="likes-person likes-private-card" aria-label="Анкета скрыта — необходим Premium"><div className="likes-private-glow"/><div className="likes-private-center"><LockKeyhole size={24}/><span className="likes-private-chip"><Icon name="crown" tone="pink" size={12}/> Premium</span><small>Открой, кто тебя лайкнул</small></div></div>)}</div>
  {count>visible&&<p className="likes-overflow">И ещё {count-visible}</p>}
  <Button className="likes-premium-button full" onClick={onPremium}><Icon name="crown" tone="white" size={20}/> Открыть с Premium</Button>
 </>;
}

export function Likes({onProfile,onChat,onMatch,onPremium,refreshTick=0,active=true}){
 const [tab,setTab]=useState('matches'),[matches,setMatches]=useState([]),[incoming,setIncoming]=useState(null);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [onlineFirst,setOnlineFirst]=useState(false),[processing,setProcessing]=useState(null);
 useEffect(()=>{
  if(!active)return;
  let live=true,running=false;
  const load=async()=>{
   if(running)return;running=true;
   try{const [m,l]=await Promise.all([get('/matches'),get('/likes')]);if(live){setMatches(m.filter(row=>row.profile&&!row.unavailable));setIncoming(l);setError('')}}
   catch(e){if(live)setError('Не удалось обновить симпатии: '+e.message)}
   finally{running=false;if(live)setBusy(false)}
  };
  load();
  const timer=setInterval(()=>{if(!document.hidden)load()},18000);
  const visible=()=>{if(!document.hidden)load()};
  document.addEventListener('visibilitychange',visible);
  return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[active,refreshTick,retry]);
 const seen=m=>{
  if(!m.is_new)return;
  post('/matches/'+encodeURIComponent(m.id)+'/seen',{}).then(()=>setMatches(rows=>rows.map(x=>x.id===m.id?{...x,is_new:false}:x))).catch(()=>{});
 };
 const like=async p=>{
  if(processing!==null)return;
  setProcessing(String(p.id));setError('');
  try{
   const r=await post('/reactions',{target:String(p.id),kind:'like'});
   if(r.matched&&r.match_id){setTab('matches');onMatch(r.match_id,p)}
   setRetry(i=>i+1);
  }catch(e){setError('Не удалось ответить симпатией: '+e.message)}
  finally{setProcessing(null)}
 };
 const rows=onlineFirst?[...matches].sort((a,b)=>Number(b.profile.online===true)-Number(a.profile.online===true)||new Date(b.created_at)-new Date(a.created_at)):matches;
 const count=Number(incoming?.count)||0;
 return <div className="page likes-v2">
  <Header side={<div className="likes-head-controls">
   <button type="button" className="likes-head-button premium" onClick={onPremium} aria-label="VEYRA Premium"><Icon name="crown" tone="pink" size={21}/></button>
   <button type="button" className={'likes-head-button '+(onlineFirst?'chosen':'')} onClick={()=>{haptic();setOnlineFirst(x=>!x)}} aria-label={onlineFirst?'Показать новые мэтчи сначала':'Показать сначала онлайн'} aria-pressed={onlineFirst}><Icon name="filters" tone={onlineFirst?'pink':'dark'} size={20}/></button>
  </div>}/>
  <div className="likes-hero"><h1>Симпатии</h1><p>{tab==='matches'?'Взаимные симпатии — начни общение':'Люди, которым ты понравился'}</p></div>
  <Tabs items={[['matches','Мэтчи'],['incoming','Входящие']]} value={tab} onChange={next=>{haptic();setTab(next)}}/>
  <div className="likes-content" role="tabpanel" aria-label={tab==='matches'?'Мэтчи':'Входящие'}>
  {error&&<div className="likes-inline-error" role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>Повторить</button></div>}
  {busy?<div className="likes-loading"><Spinner/><span>Загружаем симпатии…</span></div>:
   tab==='matches'?<>
    {rows.length>0&&<div className="likes-count-line"><span>Ваши мэтчи</span><span>{rows.length}</span></div>}
    {rows.length===0?<Empty art="match" title="Здесь начнётся ваша история" body="Когда симпатия окажется взаимной, здесь появится человек, с которым можно общаться." action={<Button kind="soft" onClick={()=>setRetry(x=>x+1)}>Обновить</Button>}/>:
    <div className="likes-gallery">{rows.map(m=><PersonCard key={m.id} person={m.profile} match={m} onProfile={onProfile} onChat={onChat} onSeen={seen}/>)}</div>}
   </>:count===0?<Empty art="match" title="Пока нет входящих симпатий" body="Когда кто-нибудь поставит тебе лайк, он появится здесь. Никаких выдуманных уведомлений." action={<Button kind="soft" onClick={()=>setRetry(x=>x+1)}>Обновить</Button>}/>:
   incoming?.locked?<Locked count={count} onPremium={onPremium}/>:
   <><div className="likes-count-line"><span>Входящие симпатии</span><span>{count}</span></div>
    <div className="likes-gallery">{(incoming?.profiles||[]).map(p=><PersonCard key={p.id} person={p} onProfile={onProfile} onLike={like} processing={processing===String(p.id)}/>)}</div>
   </>}
  </div>
 </div>;
}
