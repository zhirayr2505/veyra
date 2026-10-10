import React,{useEffect,useState,useCallback} from 'react';
import {get,post,setBearer,clearPhotoCache} from './api.js';
import {Logo,Icon,Header,Button,Sheet,Empty,Spinner,InlineAlert} from './UI.jsx';
import {Welcome} from './Welcome.jsx';
import {Registration} from './Registration.jsx';
import {Moderation} from './Moderation.jsx';
import {Discover} from './Discover.jsx';
import {Member} from './Member.jsx';
import {Likes} from './Likes.jsx';
import {Chats,Conversation} from './Chats.jsx';
import {Premium,GiftPicker,GiftCollection,Filters,OwnProfile,Settings,Ranking,CourtshipInbox,openInvoice} from './Extras.jsx';
import {Admin} from './Admin.jsx';
import {ProfileEditor} from './ProfileEditor.jsx';
import {DeletedScreen} from './DeletedScreen.jsx';
const tg=window.Telegram?.WebApp;
const nav=[['feed','cards','лента'],['likes','heart','симпатии'],['chats','chat','чаты'],['profile','user','профиль']];
export function App(){
 const [initializing,setInitializing]=useState(true),[startRegistration,setStartRegistration]=useState(false),[me,setMe]=useState(null),[error,setError]=useState(''),[deleted,setDeleted]=useState(false);
 const [tab,setTab]=useState('feed'),[visited,setVisited]=useState(new Set(['feed'])),[overlay,setOverlay]=useState(null),[member,setMember]=useState(null),[conversation,setConversation]=useState(null),[match,setMatch]=useState(null),[refreshTick,setRefreshTick]=useState(0),[feedTick,setFeedTick]=useState(0);
 const [returnChat,setReturnChat]=useState(null);
 const [adminMode,setAdminMode]=useState(location.pathname.startsWith('/admin'));
 const admin=location.pathname.startsWith('/admin');
 const refresh=useCallback(async()=>{const m=await get('/me');setMe(m);return m},[]);
 const exitOverlay=()=>setOverlay(null);
 useEffect(()=>{let alive=true;(async()=>{try{
  tg?.ready?.();tg?.expand?.();tg?.setHeaderColor?.('#fffdf8');tg?.setBackgroundColor?.('#fffdf8');
  if(!tg?.initData)throw Error('Открой VEYRA через официальный Telegram-бот @VeyraAppBot');
  const auth=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:tg.initData,scope:admin?'admin':'user'})});
  const j=await auth.json();if(!auth.ok)throw Error(j.error||'Не удалось войти через Telegram');
  setBearer(j.token);const m=await get('/me');if(alive){setMe(m);setError('')}
 }catch(e){if(alive)setError(e.message)}finally{if(alive)setInitializing(false)}})();return()=>{alive=false}},[]);
 useEffect(()=>{const back=tg?.BackButton;if(!back?.onClick)return;
  const active=!!(match||overlay||member||conversation);
  if(!active){back.hide?.();return;}
  const goBack=()=>{if(match){setMatch(null);return;}if(overlay){setOverlay(null);return;}if(member){setMember(null);if(returnChat){setConversation(returnChat);setReturnChat(null)}return;}if(conversation)setConversation(null)};
  back.show?.();back.onClick(goBack);return()=>{back.offClick?.(goBack);back.hide?.()};
 },[match,overlay,member,conversation,returnChat]);
 const accountDeleted=()=>{if(me?.user?.id)localStorage.removeItem('veyra.registration.v5.'+String(me.user.id));setBearer('');clearPhotoCache();setOverlay(null);setMember(null);setConversation(null);setMe(null);setError('');setDeleted(true)};
 const navigate=next=>{setError('');setMember(null);setConversation(null);setReturnChat(null);setOverlay(null);setTab(next);setVisited(s=>new Set([...s,next]));window.scrollTo(0,0)};
 const openMember=(id,matchId=null)=>{if(!id)return;setError('');setReturnChat(conversation);setConversation(null);setOverlay(null);setMember({id,matchId});window.scrollTo(0,0)};
 const openChat=async(id,person)=>{if(!id){setError('Чат пока недоступен');return;}setError('');setReturnChat(null);setMember(null);setOverlay(null);setTab('chats');setVisited(s=>new Set([...s,'chats']));if(person){setConversation({id,partner:person});return;}try{const all=await get('/matches');const m=all.find(x=>x.id===id);if(!m?.profile)throw Error('Переписка больше недоступна');setConversation({id,partner:m.profile})}catch(e){setError(e.message)}};
 const gift=person=>{if(person?.id)setOverlay({type:'gift',target:person})};
 const matchFound=(matchId,profile)=>{setMatch({id:matchId,profile});setRefreshTick(x=>x+1)};
 const courtship=async()=>{if(!member)return;try{const r=await post('/courtships/request',{target:String(member.id)});setOverlay({type:'courtship-sent',status:r.status})}catch(e){setError(e.message)}};
 const status=me?.profile?.moderation;
 const ready=!!me?.profile&&status==='approved';
 if(initializing)return <div className="splash" aria-label="VEYRA загружается"><Logo width={206}/><div className="splash-progress"><span/></div></div>;
 if(deleted)return <DeletedScreen onClose={()=>{if(tg?.close)tg.close();else window.location.assign('https://t.me/VeyraAppBot')}}/>;
 if(error&&!me)return <main className="access"><Logo width={188}/><h2>встретимся в Telegram</h2><p>{error}</p><Button onClick={()=>window.open('https://t.me/VeyraAppBot','_blank')}>открыть @VeyraAppBot</Button><button className="text-link" onClick={()=>location.reload()}>повторить</button></main>;
 if(adminMode)return <Admin onExit={()=>admin?location.assign('/'):setAdminMode(false)}/>;
 if(!ready&&(!me?.profile||status==='draft'||status==='rejected')){
  if(!startRegistration&&!me?.profile&&!me?.registration)return <Welcome onStart={()=>setStartRegistration(true)}/>;
  return <Registration me={me} refresh={refresh}/>;
 }
 if(status==='pending')return <Moderation profile={me.profile} refresh={refresh}/>;
 if(!ready)return <main className="access"><Logo/><Empty title="Анкета недоступна" body="Проверить статус можно через официальный бот."/><Button onClick={refresh}>проверить ещё раз</Button></main>;
 return <div className="app-shell">
 <div className="view-frame" hidden={!!conversation||!!member}>
 <div className="view-tab" hidden={tab!=='feed'}><Discover onProfile={openMember} onMatch={matchFound} refreshTick={feedTick} onPremium={()=>setOverlay({type:'premium'})} onFilters={()=>setOverlay({type:'filters'})}/></div>
 {visited.has('likes')&&<div className="view-tab" hidden={tab!=='likes'}><Likes active={tab==='likes'&&!conversation&&!member} onProfile={openMember} onChat={openChat} onPremium={()=>setOverlay({type:'premium'})} refreshTick={refreshTick}/></div>}
 {visited.has('chats')&&<div className="view-tab" hidden={tab!=='chats'}><Chats active={tab==='chats'&&!conversation&&!member} onOpen={openChat} onProfile={openMember} refreshTick={refreshTick}/></div>}
 {visited.has('profile')&&<div className="view-tab" hidden={tab!=='profile'}><OwnProfile me={me} refresh={refresh} onPremium={()=>setOverlay({type:'premium'})} onCollection={()=>setOverlay({type:'collection'})} onSettings={()=>setOverlay({type:'settings'})} onRanking={()=>setOverlay({type:'ranking'})} onCourtship={()=>setOverlay({type:'courtship-inbox'})} onEdit={()=>setOverlay({type:'edit'})} onAdmin={()=>{const url='https://t.me/VeyraAdminBot';if(tg?.openTelegramLink)tg.openTelegramLink(url);else window.open(url,'_blank','noopener,noreferrer')}}/></div>}
 </div>
 {member&&<div className="subscreen"><Member id={member.id} initialMatch={member.matchId} onBack={()=>{setMember(null);if(returnChat){setConversation(returnChat);setReturnChat(null)}}} onChat={openChat} onMatch={matchFound} onGift={gift} onPremium={courtship}/></div>}
 {conversation&&<div className="subscreen"><Conversation matchId={conversation.id} partner={conversation.partner} onBack={()=>setConversation(null)} onProfile={openMember} onGift={gift} myId={me.user.id}/></div>}
 {!conversation&&!member&&<nav className="bottom-nav" aria-label="Навигация VEYRA">{nav.map(([k,icon,label])=><button key={k} aria-current={tab===k?'page':undefined} className={tab===k?'active':''} onClick={()=>navigate(k)}><Icon name={icon+(tab===k&&['heart','chat','user'].includes(icon)?'_filled':'')} tone={tab===k?'pink':'dark'} size={23}/><span>{label}</span></button>)}</nav>}
 {match&&<div className="match-overlay"><div className="match-dialog"><span className="match-sparkle">💜</span><Logo width={148}/><h2>это взаимно!</h2><p>Вы понравились друг другу. Возможно, это начало истории.</p><Button className="full" onClick={()=>{const m=match;setMatch(null);openChat(m.id,m.profile)}}><Icon name="chat" tone="white"/> написать</Button><Button kind="outline" className="full" onClick={()=>{const m=match;setMatch(null);openMember(m.profile.id,m.id)}}>посмотреть профиль</Button><button className="text-link" onClick={()=>setMatch(null)}>продолжить знакомства</button></div></div>}
 {overlay?.type==='premium'&&<Premium me={me} onClose={exitOverlay} refresh={refresh}/>}
 {overlay?.type==='gift'&&<GiftPicker target={overlay.target} onClose={exitOverlay}/>}
 {overlay?.type==='collection'&&<Sheet title="коллекция подарков" onClose={exitOverlay}><GiftCollection/></Sheet>}
 {overlay?.type==='filters'&&<Filters profile={me.profile} onClose={exitOverlay} onSave={()=>{setFeedTick(x=>x+1);setRefreshTick(x=>x+1)}}/>}
 {overlay?.type==='edit'&&<ProfileEditor me={me} refresh={refresh} onClose={exitOverlay}/>}
 {overlay?.type==='settings'&&<Settings me={me} onClose={exitOverlay} refresh={refresh} onDeleted={accountDeleted}/>}
 {overlay?.type==='ranking'&&<Ranking onClose={exitOverlay}/>}
 {overlay?.type==='courtship-inbox'&&<CourtshipInbox onClose={exitOverlay}/>}
 {overlay?.type==='courtship-sent'&&<Sheet title="ухаживание" onClose={exitOverlay}><p className="tip">Предложение отправлено. Публичный статус и оплата появятся только после согласия получателя.</p><Button className="full" onClick={exitOverlay}>понятно</Button></Sheet>}
 <InlineAlert>{error}</InlineAlert>
 </div>;
}
