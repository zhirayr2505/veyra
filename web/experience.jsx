import React,{useState,useEffect} from 'react';
import {Heart,Eye,MessageCircle,MapPin,ShieldCheck,Star,Zap,ArrowUpRight,EyeOff,Clock,RotateCcw,ChevronRight} from 'lucide-react';
import {api,post} from './api';
import {Artwork} from './graphics';
import './experience.css';

export function ProfileStats({app}){
 const[data,setData]=useState(null),[failed,setFailed]=useState(false);
 const load=()=>{setFailed(false);api('/profile/stats').then(setData).catch(()=>setFailed(true));};useEffect(load,[]);
 if(failed)return <button className="text-button" onClick={load}>Обновить статистику</button>;
 return <section className="profile-statistics" aria-label="Статистика профиля"><div className="stats-grid">{[[Eye,'views','Просмотры'],[Heart,'likes','Лайки'],[MessageCircle,'matches','Мэтчи']].map(([Icon,key,label])=><div key={key}><Icon size={17}/><strong>{data?.[key]??'—'}</strong><small>{app.t(label)}</small></div>)}</div><button className="completion-row" onClick={()=>app.setPage('edit')}><span>{app.t('Заполненность профиля')}<b>{data?.completion??0}%</b></span><progress max={100} value={data?.completion||0}/></button></section>;
}

export function FullProfile({profile,app,Photo,Sheet,onClose,onReact,onReport,onPrematch}){
 const[data,setData]=useState(null),[error,setError]=useState(false),[confirm,setConfirm]=useState(false);
 const load=()=>{setError(false);api('/profiles/'+profile.id).then(setData).catch(()=>setError(true));};useEffect(load,[profile.id]);
 return <Sheet title={profile.name} className="full-profile-sheet" onClose={onClose}>{error?<button className="button secondary full" onClick={load}>Повторить загрузку</button>:!data?<div className="skeleton full-profile-skeleton"/>:<>
  {data.test_profile&&<p className="notice">Тестовая анкета · вымышленный персонаж</p>}
  <div className="full-profile-gallery">{data.photos.map((id,i)=><Photo key={id} id={id} alt={data.name+' · '+(i+1)}/>)}</div>
  <h2>{data.name}, {data.age}<ShieldCheck size={20}/></h2><p className="muted"><MapPin size={15}/> {data.city}</p>
  <div className="tags">{data.interests.map(x=><span className={data.shared_interests.includes(x)?'shared-interest':''} key={x}>{x}</span>)}</div>
  {data.shared_interests.length>0&&<p className="fineprint">Подсвечены ваши общие интересы</p>}<p className="profile-biography">{data.bio}</p>
  <p className="fineprint">Ручная проверка анкеты не является подтверждением личности.</p>
  {data.match_id?<button className="button primary full" onClick={()=>{app.setTab('chats');app.setOpenChatId(data.match_id);onClose();}}><MessageCircle size={19}/>Написать</button>:<div className="profile-actions"><button className="button primary" disabled={app.busy} onClick={()=>onReact('like')}><Heart size={19}/>Нравится</button><button className="button secondary" disabled={app.busy} onClick={()=>onReact('super')}><Star size={18}/>Super Like</button></div>}
  {!data.match_id&&<button className="button secondary full" onClick={onPrematch}><MessageCircle size={18}/>Сказать привет до мэтча</button>}
  <div className="profile-actions"><button className="text-button" onClick={onReport}><ShieldCheck size={17}/>Пожаловаться / блокировать</button><button className="text-button" onClick={()=>setConfirm(true)}><EyeOff size={17}/>Скрыть</button></div>
  {confirm&&<div className="notice"><p>Больше не показывать эту анкету в рекомендациях?</p><button className="button secondary" onClick={()=>setConfirm(false)}>Отмена</button><button className="button danger" disabled={app.busy} onClick={()=>app.run(async()=>{await post('/profiles/'+profile.id+'/hide');onClose();await onReact('hidden');})}>Скрыть анкету</button></div>}
 </>}</Sheet>;
}

export function LikesHistory({app,Photo,Sheet,Card}){
 const[kind,setKind]=useState(''),[data,setData]=useState(null),[page,setPage]=useState(0),[selected,setSelected]=useState(null),[error,setError]=useState(false);
 const load=async()=>{if(!kind)return;setError(false);try{setData(await api('/likes/history?kind='+kind+'&page='+page));}catch(e){setError(true);throw e;}};
 useEffect(()=>{setData(null);if(kind)app.run(load);},[kind,page]);
 return <section className="likes-history"><div className="segmented-scroll">{[['','Входящие'],['outgoing','Мои лайки'],['super','Super Likes'],['matches','Мэтчи']].map(([key,label])=><button key={key} aria-pressed={kind===key} className={kind===key?'active':''} onClick={()=>{setKind(key);setPage(0);}}>{label}</button>)}</div>{kind&&<div className="history-results">{error?<button className="button secondary" onClick={()=>app.run(load)}>Повторить</button>:!data?<div className="skeleton history-loading"/>:data.profiles.length?<div className="likes-grid">{data.profiles.map(p=><button key={p.id} className="like-tile" onClick={()=>p.match_id?(app.setTab('chats'),app.setOpenChatId(p.match_id)):setSelected(p)}><Photo id={p.photos[0]} alt={p.name}/><div><h3>{p.name}, {p.age}</h3><p>{p.city}</p></div></button>)}</div>:<p className="account-empty">Здесь появятся твои новые знакомства.</p>}<div className="pagination">{page>0&&<button onClick={()=>setPage(page-1)}>Назад</button>}{data?.more&&<button onClick={()=>setPage(page+1)}>Ещё <ChevronRight size={15}/></button>}</div></div>}{selected&&<Sheet title={selected.name} onClose={()=>setSelected(null)}><Card p={selected} onReact={async()=>{setSelected(null);await load();}}/></Sheet>}</section>;
}

export function BoostPage({app}){
 const[data,setData]=useState(null),[now,setNow]=useState(Date.now()),[error,setError]=useState(false);
 const load=async()=>{setError(false);try{setData(await api('/boost'));}catch(e){setError(true);throw e;}};useEffect(()=>{app.run(load);const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const remaining=Math.max(0,Math.ceil((new Date(data?.until||0)-now)/1000)),active=remaining>0;
 return <section className="boost-page"><div className="editorial-hero"><span className="section-eyebrow">VEYRA SPOTLIGHT</span><Artwork name="boost-rocket" size={170}/><h1>Время сиять</h1><p>30 минут приоритета в рекомендациях. Твою анкету увидят раньше подходящие люди рядом.</p></div>{error?<button className="button secondary full" onClick={()=>app.run(load)}>Повторить</button>:!data?<div className="skeleton history-loading"/>:<>
  <div className={'boost-timer '+(active?'active':'')}><Zap size={26}/><strong>{active?`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`:'30:00'}</strong><small>{active?'Ты в центре внимания':data.weekly_available?'Еженедельный Boost включён в Premium':`Доступно: ${data.credits}`}</small></div>
  {!active&&(data.weekly_available||data.credits>0?<button className="button primary full" disabled={app.busy} onClick={()=>app.run(async()=>{await post('/boost');await Promise.all([load(),app.refresh()]);})}><Zap size={19}/>Активировать Boost</button>:<button className="button primary full" onClick={()=>app.setPage('premium')}><Star size={18}/>Купить за Stars<ArrowUpRight size={18}/></button>)}
  <p className="fineprint">Приоритет не гарантирует лайки или мэтчи. Фильтры и приватность сохраняются.</p>
  {data.runs.length>0&&<div className="account-panel"><h2>История продвижения</h2>{data.runs.map(r=><div className="boost-history" key={r.id}><span><Clock size={15}/>{new Date(r.started_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span><span><Eye size={15}/>{r.views}</span><span><Heart size={15}/>{r.likes}</span></div>)}</div>}
 </>}</section>;
}
