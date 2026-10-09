import React,{useState,useEffect} from 'react';
import {Heart,Eye,MessageCircle,Star,Zap,ArrowUpRight,Clock,ChevronRight} from 'lucide-react';
import {api,post} from './api';
import {Artwork,VeyraIcon,VeyraEmptyState} from './graphics';
import './experience.css';

export function ProfileStats({app}){
 const[data,setData]=useState(null),[failed,setFailed]=useState(false);
 const load=()=>{setFailed(false);api('/profile/stats').then(setData).catch(()=>setFailed(true));};useEffect(load,[]);
 if(failed)return <button className="text-button" onClick={load}>Обновить статистику</button>;
 return <section className="profile-statistics" aria-label="Статистика профиля"><div className="stats-grid">{[[Eye,'views','Просмотры'],[Heart,'likes','Лайки'],[MessageCircle,'matches','Мэтчи']].map(([Icon,key,label])=><div key={key}><VeyraIcon icon={Icon} size={17}/><strong>{data?.[key]??'—'}</strong><small>{app.t(label)}</small></div>)}</div><button className="completion-row" onClick={()=>app.setPage('edit')}><span>{app.t('Заполненность профиля')}<b>{data?.completion??0}%</b></span><progress max={100} value={data?.completion||0}/></button></section>;
}

export function LikesHistory({app,Photo}){
 const[kind,setKind]=useState(''),[data,setData]=useState(null),[page,setPage]=useState(0),[error,setError]=useState(false);
 const load=async()=>{if(!kind)return;setError(false);try{setData(await api('/likes/history?kind='+kind+'&page='+page));}catch(e){setError(true);throw e;}};
 useEffect(()=>{setData(null);if(kind)app.run(load);},[kind,page]);
 return <section className="likes-history"><div className="segmented-scroll">{[['','Входящие'],['outgoing','Мои лайки'],['super','Super Likes'],['matches','Мэтчи']].map(([key,label])=><button key={key} aria-pressed={kind===key} className={kind===key?'active':''} onClick={()=>{setKind(key);setPage(0);}}>{label}</button>)}</div>{kind&&<div className="history-results">{error?<button className="button secondary" onClick={()=>app.run(load)}>Повторить</button>:!data?<div className="skeleton history-loading"/>:data.profiles.length?<div className="likes-grid">{data.profiles.map(p=><button key={p.id} className="like-tile" onClick={()=>app.openProfile(p,{matchId:p.match_id,onHandled:load})}><Photo id={p.photos[0]} alt={p.name}/><div><h3>{p.name}, {p.age}</h3><p>{p.city}</p></div></button>)}</div>:<VeyraEmptyState art="discover-cards" title={app.t('Пока здесь тихо')} body={app.t('Заглядывай в ленту и знакомься.')}><button type="button" className="button secondary" onClick={()=>app.setTab('feed')}>{app.t('Лента')}</button></VeyraEmptyState>}<div className="pagination">{page>0&&<button onClick={()=>setPage(page-1)}>Назад</button>}{data?.more&&<button onClick={()=>setPage(page+1)}>Ещё <VeyraIcon icon={ChevronRight} size={15}/></button>}</div></div>}</section>;
}

export function BoostPage({app}){
 const[data,setData]=useState(null),[now,setNow]=useState(Date.now()),[error,setError]=useState(false);
 const load=async()=>{setError(false);try{setData(await api('/boost'));}catch(e){setError(true);throw e;}};useEffect(()=>{app.run(load);const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const remaining=Math.max(0,Math.ceil((new Date(data?.until||0)-now)/1000)),active=remaining>0;
 return <section className="boost-page"><div className="editorial-hero"><span className="section-eyebrow">VEYRA SPOTLIGHT</span><Artwork name="boost-rocket" size={170}/><h1>Время сиять</h1><p>30 минут приоритета в рекомендациях. Твою анкету увидят раньше подходящие люди рядом.</p></div>{error?<button className="button secondary full" onClick={()=>app.run(load)}>Повторить</button>:!data?<div className="skeleton history-loading"/>:<>
  <div className={'boost-timer '+(active?'active':'')} role={active?'timer':'group'} aria-label={active?(app.lang==='en'?'Boost active':'Boost активен'):(app.lang==='en'?'Boost preview':'Предпросмотр Boost')}><VeyraIcon icon={Zap} size={26}/><strong>{active?`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`:'30:00'}</strong><small>{active?'Ты в центре внимания':data.weekly_available?'Еженедельный Boost включён в Premium':`Доступно: ${data.credits}`}</small></div>
  {!active&&(data.weekly_available||data.credits>0?<button className="button primary full" disabled={app.busy} onClick={()=>app.run(async()=>{await post('/boost');await Promise.all([load(),app.refresh()]);})}><VeyraIcon icon={Zap} size={19}/>Активировать Boost</button>:<button className="button primary full" onClick={()=>app.setPage('premium')}><VeyraIcon icon={Star} size={18}/>Купить за Stars<VeyraIcon icon={ArrowUpRight} size={18}/></button>)}
  <p className="fineprint">Приоритет не гарантирует лайки или мэтчи. Фильтры и приватность сохраняются.</p>
  {data.runs.length>0&&<div className="account-panel"><h2>История продвижения</h2>{data.runs.map(r=><div className="boost-history" key={r.id}><span><VeyraIcon icon={Clock} size={15}/>{new Date(r.started_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span><span><VeyraIcon icon={Eye} size={15}/>{r.views}</span><span><VeyraIcon icon={Heart} size={15}/>{r.likes}</span></div>)}</div>}
 </>}</section>;
}
