import {TopZone} from './TopZone.jsx';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {get,post,photoUrl} from './api.js';
import {Button,Icon,InterestIcon,Logo,Photo,Spinner,InlineAlert} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {Discover} from './Discover.jsx';
import {PersonQuickPreview} from './PersonQuickPreview.jsx';
import './DiscoveryHub.css';

const TABS=[['feed','Лента'],['for_you','Для вас'],['nearby','Рядом']];
const PAGE_SIZE=8;
const DATING_ART='/veyra-approved/dating_stage02/';
// Versioned lossless masters intentionally bypass older cached low-quality WebPs.
const ORIGINAL_ART_VERSION='_master_20261013.png';
const THEMED_COLLECTIONS=[
 {id:'common',name:'Схожие интересы',description:'Увлечения объединяют',image:'collection_common_interests_master_20261013.png',symbol:'for_you_common_headphones.svg'},
 {id:'serious',name:'Серьёзные отношения',description:'Для тех, кто ищет близость',image:'collection_serious_relationships_master_20261013.png',symbol:'for_you_serious_hearts.svg'},
 {id:'travel',name:'Любят путешествовать',description:'Откройте мир вдвоём',image:'collection_travel_master_20261013.png',symbol:'for_you_travel_plane.svg'}
];
const haptic=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{/* optional */}};
const distanceFor=p=>Number.isFinite(Number(p.distance_km))&&p.distance_km!=null
 ?'~'+Math.round(Number(p.distance_km))+' км':null;
const interestKey=v=>String(v||'').toLocaleLowerCase('ru').trim();
const queryFor=(kind,filters,choice,skip=[],collection=null)=>{
 const p=new URLSearchParams({browse:'true',mode:kind,limit:String(PAGE_SIZE)});
 if(filters?.only_online||(kind==='nearby'&&choice==='online'))p.set('only_online','true');
 if(filters?.common_interests||(kind==='nearby'&&choice==='common'))p.set('common_interests','true');
 if(kind==='for_you'){
  if(collection==='common')p.set('common_interests','true');
  if(collection==='serious')p.set('goal','relationship');
  if(collection==='travel')p.set('interest','Путешествия');
 }
 if(skip.length)p.set('skip',skip.map(x=>String(x.id)).join(','));
 return '/feed?'+p.toString();
};
function SectionTitle({children,action,onAction}){
 return <div className="vx-section-title"><h2>{children}</h2>
  {action&&<button type="button" onClick={onAction}>{action}<Icon name="chevron-right" tone="dark" size={18}/></button>}</div>;
}
function Portrait({person,onProfile,interest,forYou=false}){
 return <button className="vx-portrait-card" type="button" onClick={()=>onProfile(person.id)} aria-label={'Открыть профиль '+person.name}>
  <span className="vx-portrait-circle"><Photo id={person.photos?.[0]} alt={person.name} placeholder={person.photo_placeholders?.[String(person.photos?.[0])]} resolution={640}/></span>
  {!forYou&&(interest?<span className="vx-portrait-interest"><InterestIcon name={interest} size={18}/></span>:
   person.online?<span className="vx-portrait-online" aria-label="В сети"/>:null)}
  <span className="vx-portrait-name">{person.name}{forYou&&Number.isFinite(Number(person.age))?', '+person.age:''}</span>
  {forYou&&<span className="vx-for-you-common"><Icon name="heart" tone="pink" size={12}/>{Number(person.shared_interests)>0?Number(person.shared_interests)+' общих':'Подходит тебе'}</span>}
 </button>;
}
function BrowsePerson({person,onProfile,variant='nearby'}){
 return <article className={'vx-person vx-person-'+variant} data-person-id={person.id}>
  <button type="button" className="vx-person-open" onClick={()=>onProfile(person.id)} aria-label={'Открыть профиль '+person.name}>
   <Photo id={person.photos?.[0]} alt={person.name}/>
   <span className="vx-person-gradient" aria-hidden="true"/>
   {person.online&&(variant==='recommended'
    ?<span className="vx-for-you-online"><span/>В сети</span>
    :<span className="vx-card-online" title="В сети"/>)}
   <span className="vx-person-caption">
    <strong>{person.name}, {person.age}</strong>
    <small>{variant==='recommended'
     ?<>{person.city}<CountryFlag country={person.country} round/>{Number(person.shared_interests)>0&&<span className="vx-for-you-shared">· {person.shared_interests} общих</span>}</>
     :<><CountryFlag country={person.country}/>{person.city}</>}</small>
    {variant==='nearby'&&distanceFor(person)&&<small><Icon name="pin" tone="white" size={13}/>{distanceFor(person)}</small>}
   </span>
  </button>
 </article>;
}
function BrowseScene({kind,active,profile,filters,refreshTick,onProfile,onMatch,onPremium,onFilters,onReaction}){
 const personal=kind==='for_you';
 const [people,setPeople]=useState([]),[loading,setLoading]=useState(false),[limited,setLimited]=useState(false);
 const [error,setError]=useState(''),[hasMore,setHasMore]=useState(false),[moreBusy,setMoreBusy]=useState(false);
 const [choice,setChoice]=useState('all'),[collection,setCollection]=useState(null),[pending,setPending]=useState([]);
 const [retry,setRetry]=useState(0),[showAllPortraits,setShowAllPortraits]=useState(false),[showAllRecommendations,setShowAllRecommendations]=useState(false);
 const [previewPerson,setPreviewPerson]=useState(null);
 const loadedKey=useRef(null),requestNumber=useRef(0);
 const recommendationHeadingRef=useRef(null);
 const requestKey=[kind,filters?.only_online,filters?.common_interests,choice,collection,refreshTick,retry].join(':');
 const sharedPeople=useMemo(()=>[...people].sort((a,b)=>(b.shared_interests||0)-(a.shared_interests||0)),[people]);
 const nearbyLocation=profile?.city?profile.city:'Местоположение не определено';
 const hasCoordinates=Number.isFinite(Number(profile?.lat))&&Number.isFinite(Number(profile?.lon))&&profile?.lat!=null&&profile?.lon!=null;
 const radius=profile?.radius_km===20000?'по всему миру':'в радиусе '+(profile?.radius_km||50)+' км';

 useEffect(()=>{
  if(!active||loadedKey.current===requestKey)return;
  loadedKey.current=requestKey;
  const n=++requestNumber.current;let alive=true,done=false;
  setLoading(true);setError('');setHasMore(false);
  get(queryFor(kind,filters,choice,[],collection)).then(data=>{
   if(!alive||n!==requestNumber.current)return;
   done=true;const list=data.profiles||[];
   setPeople(list);setLimited(!!data.limited);setHasMore(list.length===PAGE_SIZE&&!data.limited);
  }).catch(e=>{
   if(alive&&n===requestNumber.current){loadedKey.current=null;setError(e.message)}
  }).finally(()=>{if(alive&&n===requestNumber.current)setLoading(false)});
  return()=>{alive=false;if(!done&&loadedKey.current===requestKey)loadedKey.current=null};
 },[active,requestKey,kind,filters,choice,collection]);
 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   const ids=people.slice(0,Math.min(5,people.length)).map(p=>p.photos?.[0]).filter(Boolean);
   if(!ids.length)return;
   await photoUrl(ids[0],{width:960}).catch(()=>{});
   if(cancelled)return;
   await photoUrl(ids[0],{width:640}).catch(()=>{});
   for(const id of ids.slice(1)){
    if(cancelled)return;
    await photoUrl(id,{width:640}).catch(()=>{});
   }
  })();
  return()=>{cancelled=true};
 },[people]);
 const loadMore=async()=>{
  if(moreBusy||!hasMore)return;
  setMoreBusy(true);setError('');
  try{
   const data=await get(queryFor(kind,filters,choice,people,collection));
   const existing=new Set(people.map(p=>String(p.id)));
   const next=(data.profiles||[]).filter(p=>!existing.has(String(p.id)));
   setPeople(old=>[...old,...next]);setLimited(!!data.limited);
   setHasMore(next.length===PAGE_SIZE&&!data.limited);
  }catch(e){setError('Не удалось загрузить другие анкеты: '+e.message)}
  finally{setMoreBusy(false)}
 };
 const like=async person=>{
  const target=String(person.id);if(pending.includes(target))return;
  setPending(old=>[...old,target]);setError('');
  try{
   const data=await post('/reactions',{target,kind:'like'});
   setPeople(old=>old.filter(p=>String(p.id)!==target));
   onReaction?.();
   if(data.matched)onMatch(data.match_id,person);
  }catch(e){
   if(/LIMIT|REQUIRED|PREMIUM/i.test(e.message))onPremium();
   else setError('Не удалось отправить симпатию: '+e.message);
  }finally{setPending(old=>old.filter(v=>v!==target))}
 };
 const retryLoad=()=>{loadedKey.current=null;setRetry(x=>x+1)};
 const rows=personal?sharedPeople:people;
 const previewProfile=personId=>{const person=people.find(p=>String(p.id)===String(personId));if(person){haptic();setPreviewPerson(person)}};
 return <div className={'vx-browse vx-'+kind} aria-label={personal?'Для вас':'Люди рядом'}>
  {personal?<>
   <section className="vx-personal-head vx-for-you-approved-hero" aria-label="Персональные рекомендации VEYRA">
    <div className="vx-personal-hello">
     <span className="vx-for-you-eyebrow"><Icon name="sparkle" tone="pink" size={15}/> VEYRA MATCH</span>
     <h1>Это <span>для тебя</span></h1>
     <p>Мы подобрали людей, которые разделяют твои интересы и ценности</p>
    </div>
    <img className="vx-for-you-glossy-heart" src="/veyra-approved/dating_stage02/for_you_glossy_heart.svg" alt="" aria-hidden="true"/>
    <span className="vx-for-you-sparkle vx-for-you-sparkle-a" aria-hidden="true">✧</span>
    <span className="vx-for-you-sparkle vx-for-you-sparkle-b" aria-hidden="true">✦</span>
    <span className="vx-for-you-sparkle vx-for-you-sparkle-c" aria-hidden="true">✧</span>
    <span className="vx-for-you-dots" aria-hidden="true"><i/><i/><i/></span>
   </section>
   <div className="vx-benefits vx-for-you-benefits" aria-label="Преимущества персональных рекомендаций">
    <span className="vx-benefit-chip"><Icon name="sparkle" tone="pink" size={17}/><span className="vx-benefit-copy">Общие интересы</span></span>
    <span className="vx-benefit-chip"><Icon name="heart" tone="pink" size={17}/><span className="vx-benefit-copy">Близкие цели</span></span>
    <span className="vx-benefit-chip"><Icon name="rating" tone="pink" size={17}/><span className="vx-benefit-copy">Больше совпадений</span></span>
   </div>
   <SectionTitle action={showAllPortraits?'Свернуть':'Смотреть все'} onAction={()=>setShowAllPortraits(x=>!x)}>Люди, похожие на тебя</SectionTitle>
   {people.length>0&&<div className={'vx-interest-portraits vx-for-you-portraits'+(showAllPortraits?' expanded':'')}>
    {(showAllPortraits?sharedPeople:sharedPeople.slice(0,6)).map(p=>{
     const common=(p.interests||[]).find(x=>(profile?.interests||[]).some(i=>interestKey(x)===interestKey(i)));
     return <Portrait key={p.id} person={p} interest={common||(p.interests||[])[0]} forYou onProfile={previewProfile}/>;
    })}
   </div>}
   <SectionTitle action="Все" onAction={()=>{setCollection(null);setShowAllRecommendations(true);recommendationHeadingRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'})}}>Подборки для тебя</SectionTitle>
   <div className="vx-collections vx-themed-collections" aria-label="Тематические подборки">
    {THEMED_COLLECTIONS.map(group=><button type="button" key={group.id}
      className={'vx-collection vx-themed-collection vx-for-you-themed-'+group.id+(collection===group.id?' chosen':'')}
      aria-pressed={collection===group.id} aria-label={'Подборка: '+group.name}
      onClick={()=>{haptic();setCollection(collection===group.id?null:group.id);setShowAllRecommendations(false)}}>
     <img className="vx-collection-art" src={DATING_ART+group.image} width="1152" height="1536" alt="" loading="lazy" decoding="async"/>
     <span className="vx-collection-shade" aria-hidden="true"/>
     <span className="vx-for-you-collection-glass" aria-hidden="true"><img className="vx-for-you-collection-symbol" src={DATING_ART+group.symbol} alt="" width="92" height="92" loading="lazy" decoding="async"/></span>
     <span className="vx-collection-label"><b>{group.name}</b><small>{group.description}</small></span>
    </button>)}
   </div>
   <div ref={recommendationHeadingRef} className="vx-for-you-rec-heading">
    <SectionTitle action={collection?'Сбросить':showAllRecommendations?'Свернуть':'Смотреть все'}
     onAction={collection?()=>{setCollection(null);setShowAllRecommendations(false)}:()=>setShowAllRecommendations(v=>!v)}>
     {collection?THEMED_COLLECTIONS.find(g=>g.id===collection)?.name:'Рекомендуем тебе'}</SectionTitle>
   </div>
  </>:<>
   <section className="vx-nearby-hero"><img className="vx-hero-art vx-nearby-art" src={DATING_ART+"nearby_hero"+ORIGINAL_ART_VERSION} width="1536" height="768" alt="" aria-hidden="true" fetchPriority="high"/>
    <div className="vx-nearby-copy"><h1>Люди рядом</h1><p className="vx-nearby-place"><Icon name="pin" tone="pink" size={18}/>{nearbyLocation}</p>
     <p className="vx-nearby-description">Новые знакомства рядом с вами<br/>{radius}</p></div>
    <div className="vx-nearby-radar" aria-hidden="true">
     {people.slice(0,4).map((p,i)=><span key={p.id} className={'vx-radar-face face-'+i}><Photo id={p.photos?.[0]} alt=""/></span>)}
    </div>
   </section>
   {!hasCoordinates&&<div className="vx-location-hint"><Icon name="pin" tone="pink" size={19}/><p>Чтобы искать поблизости, выбери город и расстояние в фильтрах.</p><button onClick={onFilters}>Выбрать город</button></div>}
   <div className="vx-filter-pills" role="group" aria-label="Фильтры рядом">
    {[['all','Все','everyone'],['online','В сети','online'],['common','Общие интересы','everyone']].map(([key,label,icon])=>
     <button type="button" key={key} className={choice===key?'chosen':''} aria-pressed={choice===key}
      onClick={()=>{haptic();setChoice(key)}}><Icon name={icon} tone={choice===key?'white':'pink'} size={17}/>{label}</button>)}
   </div>
   <div className="vx-nearby-avatars">
    <button type="button" className="vx-nearby-adjust" onClick={onFilters}><span><Icon name="plus" tone="pink" size={24}/></span><small>Настроить</small></button>
    {people.slice(0,6).map(p=><Portrait person={p} key={p.id} onProfile={previewProfile}/>)}
   </div>
  </>}
  {loading?<div className="vx-state" role="status"><Spinner/><p>Подбираем настоящие анкеты…</p></div>:
   people.length>0?<>
    {rows.length>0?<div className={'vx-people'+(personal?' vx-recommendations':' vx-nearby-grid')}>
     {(personal&&!showAllRecommendations?rows.slice(0,2):rows).map(p=><BrowsePerson person={p} key={p.id} variant={personal?'recommended':'nearby'}
       onProfile={previewProfile}/>)}
    </div>:<div className="vx-state"><p>Пока нет анкет в этой подборке.</p><Button kind="outline" onClick={()=>setCollection(null)}>Все анкеты</Button></div>}
    {hasMore&&(!personal||showAllRecommendations)&&<button type="button" className="vx-more" disabled={moreBusy} onClick={loadMore}>
     {moreBusy?'Загружаем…':'Показать ещё'}<Icon name="chevron-right" tone="pink" size={18}/></button>}
    {limited&&<p className="vx-quota">Дневной лимит анкет исчерпан. <button onClick={onPremium}>VEYRA Premium</button></p>}
   </>:<div className="vx-state vx-empty">
    <img src="/veyra-approved/04_empty_states/svg/no_nearby_people.svg" alt="" className="vx-state-illustration"/>
    <h3>{limited?'Дневной лимит исчерпан':error?'Не удалось загрузить анкеты':'Пока нет подходящих людей'}</h3>
    <p>{limited?'Больше знакомств доступно с Premium.':error?'Проверь соединение и попробуй снова.':'Анкеты проходят модерацию. Попробуй изменить фильтры или вернись позже.'}</p>
    <Button onClick={limited?onPremium:error?retryLoad:onFilters}>{limited?'Открыть Premium':error?'Повторить':'Настроить поиск'}</Button>
   </div>}
  <InlineAlert>{error&&people.length>0?error:''}</InlineAlert>
  {previewPerson&&<PersonQuickPreview person={previewPerson} kind={kind} onClose={()=>setPreviewPerson(null)} onOpenProfile={id=>{setPreviewPerson(null);onProfile(id,null,previewPerson)}}/>}
 </div>;
}
export function DiscoveryHub({directory=false,freezeFeed=false,filters,profile,onProfile,onMatch,onPremium,onFilters,onWallet,veysBalance=0,refreshTick=0}){
 const [tab,setTab]=useState('feed'),[visited,setVisited]=useState(new Set(['feed'])),[directoryTab,setDirectoryTab]=useState('nearby');
 const [reactionRefresh,setReactionRefresh]=useState(0);
 const [liquidFlow,setLiquidFlow]=useState(false);
 const liquidTimer=useRef(null);
 const scroll=useRef({feed:0,for_you:0,nearby:0}),scrollTimeout=useRef(null);
 const hubRef=useRef(null);
 // Main Feed is a fixed-height scene. Nearby / For You retain natural scrolling.
 // Measure the actual Telegram WebView plus the bottom nav; do not guess from vh.
 useEffect(()=>{
  if(directory||!freezeFeed||tab!=='feed')return;
  const root=document.documentElement,hub=hubRef.current;
  if(!hub)return;
  const previousOverflow=root.style.overflow,previousBodyOverflow=document.body.style.overflow;
  const previousScroll=window.scrollY;
  root.classList.add('veyra-feed-viewport-locked');
  root.style.overflow='hidden';document.body.style.overflow='hidden';
  window.scrollTo(0,0);
  const keepAtTop=()=>{if(window.scrollY>0){window.scrollTo({top:0,behavior:'instant'});if(document.scrollingElement)document.scrollingElement.scrollTop=0;}};
  window.addEventListener('scroll',keepAtTop,{passive:true});
  keepAtTop();
  let frame=0;
  const fit=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const panel=hub.querySelector('#vx-panel-feed');
    const nav=document.querySelector('.bottom-nav');
    if(!panel)return;
    const top=panel.getBoundingClientRect().top;
    const bottom=nav?.getBoundingClientRect().top??(window.visualViewport?.height||window.innerHeight)-72;
    const actionHeight=hub.querySelector('#vx-panel-feed .feed-actions')?.getBoundingClientRect().height||92;
    const height=Math.max(225,Math.floor(bottom-top-actionHeight-14));
    hub.style.setProperty('--vx-feed-photo-height',height+'px');
   });
  };
  fit();
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;
  observer?.observe(hub.querySelector('.vx-head')||hub);
  const tabs=hub.querySelector('.vx-tabs');if(tabs)observer?.observe(tabs);
  window.addEventListener('resize',fit,{passive:true});window.visualViewport?.addEventListener('resize',fit,{passive:true});
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);root.classList.remove('veyra-feed-viewport-locked');root.style.overflow=previousOverflow;document.body.style.overflow=previousBodyOverflow;window.removeEventListener('scroll',keepAtTop);hub.style.removeProperty('--vx-feed-photo-height');window.scrollTo(0,Math.max(0,previousScroll))};
 },[directory,freezeFeed,tab]);

 useEffect(()=>()=>{if(scrollTimeout.current)cancelAnimationFrame(scrollTimeout.current);clearTimeout(liquidTimer.current)},[]);
 const switchTab=next=>{
  if(next===tab)return;
  haptic();clearTimeout(liquidTimer.current);setLiquidFlow(true);
   liquidTimer.current=setTimeout(()=>setLiquidFlow(false),540);
   scroll.current[tab]=window.scrollY;setTab(next);setVisited(v=>new Set([...v,next]));
  scrollTimeout.current=requestAnimationFrame(()=>window.scrollTo({top:scroll.current[next]||0,behavior:'instant'}));
 };
 if(directory)return <section className="vx-hub v2-directory" aria-label="Поиск людей VEYRA">
  <TopZone className="vx-head" title="Поиск" center={<Logo width={138} className="vx-logo"/>} right={<div className="vx-head-actions">
   <button type="button" className="veys-header-button" onClick={onWallet} aria-label="Открыть VEYS кошелёк"><img src="/veyra-approved/09_veys/veys-diamond.svg" alt="" width="20" height="20"/>{new Intl.NumberFormat('ru-RU').format(veysBalance)}</button>
   <button type="button" onClick={onFilters} aria-label="Фильтры"><Icon name="filters" tone="pink" size={22}/></button></div>}/>
  <h1 className="v2-directory-title">Поиск людей</h1><p className="v2-directory-subtitle">Знакомься с теми, кто тебе интересен</p>
  <div className="v2-directory-switch" role="tablist" aria-label="Подборки людей">
   {TABS.slice(1).reverse().map(([key,label])=><button key={key} type="button" role="tab" aria-selected={directoryTab===key}
    className={directoryTab===key?'chosen':''} onClick={()=>setDirectoryTab(key)}>{label}</button>)}
  </div>
  <BrowseScene kind={directoryTab} active profile={profile} filters={filters} onProfile={onProfile} onMatch={onMatch}
   onPremium={onPremium} onFilters={onFilters} onReaction={()=>setReactionRefresh(x=>x+1)}
   refreshTick={refreshTick+reactionRefresh}/>
 </section>;
 return <section ref={hubRef} className={"vx-hub vx-dating-stage02"+(freezeFeed&&tab==="feed"?" vx-feed-locked":"")+(tab==='for_you'?" vx-for-you-active":"")} aria-label="Раздел знакомств VEYRA">
  <TopZone className="vx-head" center={<Logo width={145} className="vx-logo"/>} left={<button className="vx-crown" type="button" onClick={onPremium} aria-label="VEYRA Premium">
    <img className="vx-premium-crown" src="/veyra-approved/01_icons/active/veyra-premium-crown.svg" width="31" height="31" alt="" aria-hidden="true"/>
   </button>} right={<div className="vx-head-actions">
    <button type="button" className="veys-header-button" aria-label="Открыть VEYS кошелёк" onClick={onWallet}>
     <img alt="" aria-hidden="true" width="21" height="21" src="/veyra-approved/09_veys/veys-diamond.svg"/>
     <span className="vx-feed-balance-number">{new Intl.NumberFormat('ru-RU').format(veysBalance)}</span><span className="vx-feed-balance-plus" aria-hidden="true">+</span>
    </button>
    <button type="button" aria-label="Фильтры" onClick={onFilters}><Icon name="filters" tone="pink" size={23}/></button>
   </div>}/>
  <div className={'vx-tabs vx-liquid-tabs'+(liquidFlow?' is-flowing':'')} role="tablist" aria-label="Способы знакомств"
   style={{'--vx-liquid-offset':(TABS.findIndex(([key])=>key===tab)*100)+'%'}}>
   <span className="vx-liquid-indicator" aria-hidden="true"/>
   {TABS.map(([key,label])=><button key={key} id={'vx-tab-'+key} type="button" role="tab"
    aria-selected={tab===key} aria-controls={'vx-panel-'+key} className={tab===key?'active':''}
    onClick={()=>switchTab(key)}>{label}</button>)}
  </div>
  <div id="vx-panel-feed" className="vx-panel" role="tabpanel" aria-labelledby="vx-tab-feed" hidden={tab!=='feed'}>
   <Discover embedded filters={filters} onProfile={onProfile} onMatch={onMatch} onPremium={onPremium}
    onFilters={onFilters} refreshTick={refreshTick+(tab==='feed'?reactionRefresh:0)}/>
  </div>
  {['for_you','nearby'].map(kind=>visited.has(kind)&&<div key={kind} id={'vx-panel-'+kind}
   className="vx-panel" role="tabpanel" aria-labelledby={'vx-tab-'+kind} hidden={tab!==kind}>
   <BrowseScene kind={kind} active={tab===kind} profile={profile} filters={filters} onProfile={onProfile} onMatch={onMatch}
    onPremium={onPremium} onFilters={onFilters} onReaction={()=>setReactionRefresh(x=>x+1)}
    refreshTick={refreshTick+reactionRefresh}/>
  </div>)}
 </section>;
}
