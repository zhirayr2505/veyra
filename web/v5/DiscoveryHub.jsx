import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,ChevronRight,Clapperboard,Coffee,Compass,Heart,MapPin,Music2,PawPrint,Plane,RefreshCw,SlidersHorizontal,Sparkles,Star,UsersRound,Dumbbell} from 'lucide-react';
import {get,post} from './api.js';
import {Button,Icon,DetailIcon,Photo,Spinner,InlineAlert} from './UI.jsx';
import {Discover} from './Discover.jsx';
import './DiscoveryHub.css';

const TABS=[['feed','Лента'],['for_you','Для вас'],['nearby','Рядом']];
const MATCH_ICONS={'путешествия':Plane,'кино':Clapperboard,'кофе':Coffee,'музыка':Music2,'спорт':Dumbbell,'животные':PawPrint};
const PAGE_SIZE=6;
function iconFor(name){return MATCH_ICONS[String(name||'').toLowerCase()]||Sparkles;}
function distanceFor(person){const n=Number(person.distance_km);return Number.isFinite(n)&&n>=0?'~'+n+' км':person.city||'';}
function feedback(){try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{}}
function queryFor(kind,filter,choice,skip=[]){
 const params=new URLSearchParams({browse:'true',mode:kind,limit:String(PAGE_SIZE)});
 if(filter?.only_online||kind==='nearby'&&choice==='online')params.set('only_online','true');
 if(filter?.common_interests||kind==='nearby'&&choice==='common')params.set('common_interests','true');
 if(skip.length)params.set('skip',skip.map(p=>String(p.id)).join(','));
 return '/feed?'+params.toString();
}
function Portraits({people,onProfile}){
 return <div className="vx-portraits">
  {people.slice(0,6).map(p=><button type="button" key={p.id} className="vx-portrait" aria-label={'Открыть профиль '+p.name} onClick={()=>onProfile(p.id)}>
   <Photo id={p.photos?.[0]} alt=""/>
   {p.online&&<span className="vx-status-dot"/>}
  </button>)}
 </div>;
}
function BrowsePerson({person,onProfile,onLike,busy}){
 return <article className="vx-person" data-person-id={person.id}>
  <button className="vx-person-open" type="button" aria-label={'Открыть профиль '+person.name} onClick={()=>onProfile(person.id)}>
   <Photo id={person.photos?.[0]} alt={person.name}/>
   <div className="vx-person-gradient" aria-hidden="true"/>
   <div className="vx-person-caption">
    <strong>{person.name}, {person.age} {person.online&&<span className="vx-caption-online" title="Сейчас онлайн"/>}</strong>
    <small><MapPin size={12} aria-hidden="true"/>{[person.city,distanceFor(person)].filter(Boolean).join(' · ')}</small>
   </div>
  </button>
  <button className="vx-person-like" type="button" aria-label={'Нравится '+person.name} disabled={busy} onClick={()=>{feedback();onLike(person)}}><Heart size={20} fill="currentColor" aria-hidden="true"/></button>
 </article>;
}
function BrowseScene({kind,active,profile,filters,refreshTick,onProfile,onMatch,onPremium,onFilters,onReaction}){
 const isPersonal=kind==='for_you';
 const [people,setPeople]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [limited,setLimited]=useState(false),[hasMore,setHasMore]=useState(false),[moreBusy,setMoreBusy]=useState(false);
 const [choice,setChoice]=useState('all'),[interest,setInterest]=useState(''),[pending,setPending]=useState([]),[retry,setRetry]=useState(0);
 const loadedKey=useRef(null),requestNumber=useRef(0);
 const requestKey=[kind,!!filters?.only_online,!!filters?.common_interests,choice,refreshTick,retry].join(':');
 useEffect(()=>{
  if(!active||loadedKey.current===requestKey)return;
  loadedKey.current=requestKey;
  let alive=true,completed=false;const number=++requestNumber.current;
  setLoading(true);setError('');setPeople([]);setHasMore(false);setInterest('');
  get(queryFor(kind,filters,choice)).then(result=>{
   if(!alive||number!==requestNumber.current)return;
   completed=true;
   const list=result.profiles||[];
   setPeople(list);setLimited(!!result.limited);
   setHasMore(list.length===PAGE_SIZE&&!result.limited);
  }).catch(e=>{if(alive&&number===requestNumber.current){loadedKey.current=null;setError('Не удалось загрузить анкеты: '+e.message)}})
   .finally(()=>{if(alive&&number===requestNumber.current)setLoading(false)});
  return()=>{alive=false;if(!completed&&loadedKey.current===requestKey)loadedKey.current=null};
 },[active,requestKey,choice,kind,filters]);
 const interestGroups=useMemo(()=>{
  const own=new Set((profile?.interests||[]).map(x=>String(x).toLowerCase()));
  const values=new Map();
  for(const p of people)for(const label of (p.interests||[])){
   const name=String(label),key=name.toLowerCase();
   if(!values.has(key))values.set(key,{name,people:[],shared:own.has(key)});
   values.get(key).people.push(p);
  }
  return [...values.values()].sort((a,b)=>Number(b.shared)-Number(a.shared)||b.people.length-a.people.length).slice(0,6);
 },[people,profile?.interests]);
 const visible=interest?people.filter(p=>(p.interests||[]).some(v=>String(v).toLowerCase()===interest.toLowerCase())):people;
 const loadMore=async()=>{
  if(moreBusy||!hasMore)return;
  setMoreBusy(true);setError('');
  try{
   const result=await get(queryFor(kind,filters,choice,people));
   const incoming=(result.profiles||[]).filter(p=>!people.some(previous=>String(previous.id)===String(p.id)));
   setPeople(old=>[...old,...incoming]);setLimited(!!result.limited);
   setHasMore(incoming.length===PAGE_SIZE&&!result.limited);
  }catch(e){setError('Не удалось показать больше анкет: '+e.message)}
  finally{setMoreBusy(false)}
 };
 const like=async person=>{
  const id=String(person.id);
  if(pending.includes(id))return;
  setPending(old=>[...old,id]);setError('');
  try{
   const result=await post('/reactions',{target:id,kind:'like'});
   setPeople(old=>old.filter(p=>String(p.id)!==id));
   onReaction();
   if(result.matched)onMatch(result.match_id,person);
  }catch(e){
   if(/LIMIT|REQUIRED|PREMIUM/i.test(e.message))onPremium();
   else setError('Не удалось отправить симпатию: '+e.message);
  }finally{setPending(old=>old.filter(x=>x!==id))}
 };
 const reset=()=>{loadedKey.current=null;setInterest('');setError('');setRetry(n=>n+1)};
 const title=isPersonal?'Для вас':'Рядом с вами';
 return <div className={'vx-browse vx-'+kind} aria-label={title}>
  {isPersonal?
   <React.Fragment>
    <section className="vx-personal-head">
     <div className="vx-feature-label"><Sparkles size={18} fill="currentColor" aria-hidden="true"/><div><b>Специально для тебя</b><p>Знакомства по вашим интересам и предпочтениям</p></div></div>
     {!!people.length&&<Portraits people={people} onProfile={onProfile}/>}
     <div className="vx-feature-mark" aria-hidden="true"><Icon name="sparkle" tone="pink" size={25}/></div>
    </section>
    <div className="vx-section-title"><h2>Твои подборки</h2><small>На основе общих интересов</small></div>
    {!!interestGroups.length&&<div className="vx-collections">
     {interestGroups.slice(0,4).map((group,i)=>{const Symbol=iconFor(group.name),face=group.people[0];
      return <button type="button" key={group.name} className={'vx-collection vx-collection-'+i+(interest===group.name?' chosen':'')}
       aria-label={'Подборка '+group.name} onClick={()=>{feedback();setInterest(interest===group.name?'':group.name)}}>
       <Photo id={face.photos?.[0]} alt=""/>
       <div className="vx-collection-shade"/>
       <span className="vx-collection-icon"><Symbol size={18}/></span>
       <span className="vx-collection-label"><b>{group.name}</b><small>{group.people.length} {group.people.length===1?'анкета':'анкеты в подборке'}</small></span>
       <span className="vx-collection-chevron"><ChevronRight size={18}/></span>
      </button>;
     })}
    </div>}
    <div className="vx-section-title vx-feature-list-heading"><h2>{interest?'Любят '+interest.toLowerCase():'Вам могут понравиться'}</h2>{interest&&<button type="button" onClick={()=>setInterest('')}>Все <ArrowRight size={13}/></button>}</div>
   </React.Fragment>:
   <React.Fragment>
    <div className="vx-section-title vx-nearby-title"><div><h2>Люди рядом</h2><small><MapPin size={14} aria-hidden="true"/>{profile?.city||'По вашей геолокации'} · примерное расстояние</small></div><button type="button" className="vx-nearby-filter" aria-label="Изменить расстояние" onClick={onFilters}><Icon name="filters" tone="pink" size={19}/></button></div>
    {!!people.length&&<section className="vx-nearby-strip"><div className="vx-section-title"><h3>Познакомься поближе</h3><span>{people.length} {people.length===1?'анкета':'анкет'}</span></div><Portraits people={people} onProfile={onProfile}/></section>}
    <div className="vx-filter-pills" role="group" aria-label="Фильтры рядом">{[['all','Все'],['online','В сети'],['common','Общие интересы']].map(([key,label])=><button type="button" key={key} className={choice===key?'chosen':''} aria-pressed={choice===key} onClick={()=>{feedback();setChoice(key)}}>{label}</button>)}</div>
   </React.Fragment>}
  {loading?<div className="vx-state"><Spinner/><p>Подбираем настоящие анкеты…</p></div>:people.length?
   <React.Fragment>
    {visible.length?<div className="vx-people" aria-label={isPersonal?'Подборка анкет':'Анкеты рядом'}>{visible.map(p=><BrowsePerson person={p} key={p.id} onProfile={onProfile} onLike={like} busy={pending.includes(String(p.id))}/>)}</div>:
     <div className="vx-state vx-minor-empty"><Sparkles size={34}/><p>В этой подборке пока нет новых анкет</p><Button kind="outline" onClick={()=>setInterest('')}>Все анкеты</Button></div>}
    {hasMore&&<button type="button" className="vx-more" disabled={moreBusy} onClick={loadMore}>{moreBusy?'Загружаем…':'Показать ещё'} <DetailIcon name="refresh" size={17}/></button>}
    {limited&&<p className="vx-quota">Лимит просмотров на сегодня достигнут. <button type="button" onClick={onPremium}>VEYRA Premium</button></p>}
   </React.Fragment>:
   <div className="vx-state vx-empty"><DetailIcon name="people" size={48}/>
    <h3>{limited?'Лимит просмотров исчерпан':'Пока нет подходящих анкет'}</h3>
    <p>{limited?'Продолжить знакомства можно с VEYRA Premium.':'Попробуй изменить город, возраст или расстояние. Все профили проходят модерацию.'}</p>
    <Button onClick={limited?onPremium:onFilters}>{limited?'Открыть Premium':'Изменить фильтры'}</Button>
   </div>}
  <InlineAlert>{error}</InlineAlert>
  {error&&!people.length&&<button type="button" className="vx-retry" onClick={reset}>Повторить загрузку</button>}
 </div>;
}
export function DiscoveryHub({filters,profile,onProfile,onMatch,onPremium,onFilters,refreshTick=0}){
 const [tab,setTab]=useState('feed'),[visited,setVisited]=useState(new Set(['feed']));
 const [refresh,setRefresh]=useState({feed:0,for_you:0,nearby:0}),[reactionRefresh,setReactionRefresh]=useState(0);
 const switchTab=next=>{feedback();setTab(next);setVisited(prev=>new Set([...prev,next]));};
 return <section className="vx-hub" aria-label="Раздел знакомств VEYRA">
  <header className="vx-head">
   <img className="vx-logo" src="/assets/veyra/00_brand/veyra_logo.svg" alt="VEYRA"/>
   <div className="vx-head-actions">
    <button type="button" aria-label="Обновить подборку" title="Обновить подборку" onClick={()=>{feedback();setRefresh(v=>({...v,[tab]:v[tab]+1}))}}><DetailIcon name="refresh" size={20}/></button>
    <button type="button" aria-label="Фильтры" title="Фильтры" onClick={onFilters}><Icon name="filters" tone="pink" size={22}/></button>
   </div>
  </header>
  <div className="vx-tabs" role="tablist" aria-label="Способы знакомств">
   {TABS.map(([key,label])=><button type="button" key={key} id={'vx-tab-'+key} role="tab" aria-selected={tab===key}
    aria-controls={'vx-panel-'+key} className={tab===key?'active':''} onClick={()=>switchTab(key)}>{label}</button>)}
  </div>
  <div id="vx-panel-feed" className="vx-panel" role="tabpanel" aria-labelledby="vx-tab-feed" hidden={tab!=='feed'}>
   <Discover embedded filters={filters} onProfile={onProfile} onMatch={onMatch}
    onPremium={onPremium} onFilters={onFilters} refreshTick={refreshTick+refresh.feed+(tab==='feed'?reactionRefresh:0)}/>
  </div>
  {['for_you','nearby'].map(kind=>visited.has(kind)&&<div key={kind} id={'vx-panel-'+kind} className="vx-panel" role="tabpanel"
    aria-labelledby={'vx-tab-'+kind} hidden={tab!==kind}>
    <BrowseScene kind={kind} active={tab===kind} profile={profile} filters={filters} onProfile={onProfile}
     onMatch={onMatch} onPremium={onPremium} onFilters={onFilters}
     onReaction={()=>setReactionRefresh(x=>x+1)} refreshTick={refresh[kind]+refreshTick}/>
   </div>)}
 </section>;
}
