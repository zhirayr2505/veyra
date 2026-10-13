import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Camera,Clapperboard,Coffee,Dumbbell,Flower2,Footprints,Headphones,MapPin,MonitorSmartphone,Music2,Palette,PawPrint,Plane,ShieldCheck,Shirt,Star,UtensilsCrossed} from 'lucide-react';
import {get,post,photoUrl,cachedPhoto} from './api.js';
import {InterestReveal} from './InterestReveal.jsx';
import {CardCaption,CardPhotoBars,CardGoalBadge} from './DatingCardLayers.jsx';
import {Button,Icon,InlineAlert,Spinner,InterestIcon} from './UI.jsx';
import './Discover.css';

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
function haptic(kind){const feedback=window.Telegram?.WebApp?.HapticFeedback;try{
 if(kind==='like'||kind==='super')feedback?.notificationOccurred?.('success');
 else feedback?.impactOccurred?.('light');
}catch{/* Haptics are optional */}}
async function decodePhoto(url){if(!url||typeof Image==='undefined')return;
 const image=new Image();image.src=url;
 if(typeof image.decode==='function')await image.decode().catch(()=>{});
}
function Interest({name}){return <span className="feed-interest"><InterestIcon name={name} size={14}/><span>{name}</span></span>;}
function FeedPicture({card,index}){
 const photos=card.photos||[],id=photos[index],profileId=card.id;
 const [state,setState]=useState(()=>({profileId,src:cachedPhoto(id),previous:'',failed:!id}));
 useEffect(()=>{
  let alive=true;
  if(!id){setState({profileId,src:'',previous:'',failed:true});return;}
  const apply=url=>setState(prev=>{
   const previous=prev.profileId===profileId?prev.src:'';
   return {profileId,src:url,previous:previous!==url?previous:'',failed:false};
  });
  const cached=cachedPhoto(id);
  if(cached)apply(cached);
  else {
   setState(prev=>prev.profileId===profileId?{...prev,failed:false}:{profileId,src:'',previous:'',failed:false});
   photoUrl(id).then(async url=>{await decodePhoto(url);if(alive)apply(url)})
    .catch(()=>{if(alive)setState(prev=>({...prev,profileId,failed:true}))});
  }
  return()=>{alive=false};
 },[id,profileId]);
 useEffect(()=>{if(!state.previous)return;
  const timer=setTimeout(()=>setState(prev=>({...prev,previous:''})),250);
  return()=>clearTimeout(timer);
 },[state.src,state.previous]);
 useEffect(()=>{if(photos.length<2)return;
  for(const p of new Set([photos[(index+1)%photos.length],photos[(index+photos.length-1)%photos.length]])){
   if(p&&p!==id)photoUrl(p).then(decodePhoto).catch(()=>{});
  }
 },[photos,index,id]);
 const same=state.profileId===profileId;
 return <div className="feed-picture">
  {same&&state.previous&&<img className="feed-picture-previous" src={state.previous} alt="" draggable="false" aria-hidden="true"/>}
  {same&&state.src?<img key={state.src} className="feed-picture-current" src={state.src} alt={card.name} draggable="false" fetchPriority="high" decoding="async"/>:
   same&&state.failed?<div className="feed-picture-unavailable"><Icon name="camera" tone="dark" size={27}/><span>Фото недоступно</span></div>:
   <div className="feed-picture-skeleton" aria-hidden="true"/>}
 </div>;
}
function FeedState({kind,onRetry,onFilters,onPremium}){
 const isLoading=kind==='loading',isError=kind==='error',isLimited=kind==='limit';
 return <div className={'feed-state feed-state-'+kind} role={isLoading?'status':undefined}>
  <div className="feed-state-illustration">
   {isLoading?<div className="feed-load-cards"><img src="/veyra-approved/04_empty_states/svg/no_results.svg" alt="" loading="eager"/><span className="feed-loading-heart"><Spinner/></span></div>:
   isLimited?<img className="feed-no-cards" src="/veyra-approved/04_empty_states/svg/take_a_break.svg" alt=""/>:
   isError?<img className="feed-no-cards" src="/veyra-approved/04_empty_states/svg/nothing_here_yet.svg" alt=""/>:
   <img className="feed-no-cards" src="/veyra-approved/04_empty_states/svg/no_results.svg" alt=""/>}
  </div>
  <h2>{isLoading?'Подбираем анкеты':isError?'Не удалось загрузить анкеты':isLimited?'Лимит на сегодня исчерпан':'Пока нет новых анкет'}</h2>
  <p>{isLoading?'Ищем людей, которые могут тебе понравиться…':
   isError?'Проверь подключение к интернету и попробуй ещё раз.':
   isLimited?'Ты просмотрел доступные сегодня анкеты. Лимиты зависят от твоего тарифа.':
   'Попробуй изменить фильтры или зайди позже — новые анкеты появляются после модерации.'}</p>
  {!isLoading&&<Button className="full" onClick={isError?onRetry:isLimited?onPremium:onFilters}>{isError?'Попробовать ещё раз':isLimited?'Открыть Premium':'Изменить фильтры'}</Button>}
 </div>;
}
export function Discover({onProfile,onMatch,onPremium,onFilters,refreshTick=0,filters={},embedded=false,demoMode=false}){
 const mode=filters.mode||'discover';
 const onlyOnline=!!filters.only_online,commonInterests=!!filters.common_interests;
 const [card,setCard]=useState(null),[loading,setLoading]=useState(true),[limited,setLimited]=useState(false);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[index,setIndex]=useState(0);
 const [refresh,setRefresh]=useState(0),[motion,setMotion]=useState('');
 const [last,setLast]=useState({can_undo:false,free_undo_left:0,premium:false,target:null});
 const requestToken=useRef(0),pointer=useRef(null),ignoreSwipeClick=useRef(false),entranceTimer=useRef(null);
 const photos=card?.photos||[];
 useEffect(()=>()=>clearTimeout(entranceTimer.current),[]);
 const filtersQuery='mode='+encodeURIComponent(mode)+'&only_online='+onlyOnline+'&common_interests='+commonInterests+'&demo='+demoMode;

 useEffect(()=>{let alive=true;get('/reactions/last').then(r=>{
  if(alive)setLast({...r,target:r.action?.target||null});
 }).catch(()=>{});return()=>{alive=false}},[refreshTick]);
 useEffect(()=>{
  let alive=true;const seq=++requestToken.current;
  setLoading(true);setCard(null);setLimited(false);setError('');setIndex(0);setMotion('');
  get('/feed?'+filtersQuery).then(result=>{
   if(alive&&seq===requestToken.current){setCard(result.profiles?.[0]||null);setLimited(!!result.limited)}
  }).catch(e=>{if(alive&&seq===requestToken.current)setError(e.message)})
   .finally(()=>{if(alive&&seq===requestToken.current)setLoading(false)});
  return()=>{alive=false;requestToken.current++};
 },[filtersQuery,refreshTick,refresh]);

 const changePhoto=step=>{
  if(!card||photos.length<2||busy)return;
  haptic('photo');setIndex(current=>(current+step+photos.length)%photos.length);
 };
 const onPointerDown=e=>{
  // A fresh pointer press is always intentional, even immediately after a swipe.
  ignoreSwipeClick.current=false;
  if(!card||busy||e.button!==0||e.target.closest('button'))return;
  pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,started:false};
 };
 const onPointerMove=e=>{
  const p=pointer.current;if(!p||p.id!==e.pointerId||busy)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(!p.started&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2){
   p.started=true;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
  }
  // Card remains fixed; only a completed horizontal gesture changes the photograph.
 };
 const onPointerUp=e=>{
  const p=pointer.current;if(!p||p.id!==e.pointerId)return;
  pointer.current=null;
  if(p.started){
   // Synthetic click events can arrive well after touchend on Android.
   ignoreSwipeClick.current=true;
   const dx=e.clientX-p.x;
   if(Math.abs(dx)>38)changePhoto(dx<0?1:-1);
  }
 };
 const onPointerCancel=e=>{if(pointer.current?.id===e.pointerId)pointer.current=null;};
 const onCardClick=e=>{
  if(ignoreSwipeClick.current){ignoreSwipeClick.current=false;return;}
  if(busy||!card||e.target.closest('button'))return;
  // Tapping the photo browses only the image; the name alone opens the profile.
  const bounds=e.currentTarget.getBoundingClientRect();
  changePhoto(e.clientX<bounds.left+bounds.width/2?-1:1);
 };
 const react=async kind=>{
  if(!card||busy)return;
  const current=card;clearTimeout(entranceTimer.current);setBusy(true);setError('');setMotion('exit-'+kind);haptic(kind);
  try{
   const [result]=await Promise.all([
    post('/reactions',{target:String(current.id),kind,next_mode:mode,only_online:onlyOnline,common_interests:commonInterests,demo:demoMode}),
    wait(310)
   ]);
   let next=result.next;
   // The reaction endpoint already provides the next real, filtered profile.
   if(!next){next=await get('/feed?'+filtersQuery)}
   const following=next.profiles?.[0]||null;
   if(following?.photos?.[0]){
    // Prefetch/decode before revealing the next card, without delaying indefinitely on slow networks.
    await Promise.race([photoUrl(following.photos[0]).then(decodePhoto).catch(()=>{}),wait(700)]);
   }
   ++requestToken.current;
   setCard(following);setIndex(0);setLimited(!!next.limited);
   setLast(old=>({...old,target:String(current.id),can_undo:!result.matched}));
   // A keyed incoming card mounts fresh so its entrance animation always runs.
   setMotion(following?'enter':'');
   entranceTimer.current=setTimeout(()=>setMotion(''),440);
   if(result.matched)onMatch(result.match_id,current);
  }catch(e){
   setMotion('');
   if(e.message.includes('LIMIT')||e.message.includes('REQUIRED'))onPremium();
   else setError('Не удалось выполнить действие: '+e.message);
  }finally{setBusy(false)}
 };
 const undo=async()=>{
  if(busy||!last.can_undo||!last.target)return;
  if(!last.premium&&last.free_undo_left<=0){
   setError('Бесплатная отмена на сегодня уже использована. С Premium можно возвращать анкеты без ограничений.');
   onPremium();return;
  }
  clearTimeout(entranceTimer.current);setBusy(true);setError('');haptic('undo');
  try{
   const r=await post('/reactions/undo',{target:String(last.target)});
   if(r.profile?.photos?.[0])await Promise.race([photoUrl(r.profile.photos[0]).then(decodePhoto).catch(()=>{}),wait(550)]);
   ++requestToken.current;
   setCard(r.profile);setIndex(0);setLimited(false);setLoading(false);
   setMotion('enter');entranceTimer.current=setTimeout(()=>setMotion(''),440);
   setLast(old=>({...old,can_undo:false,target:null,free_undo_left:old.premium?old.free_undo_left:Math.max(0,old.free_undo_left-1)}));
  }catch(e){
   if(e.message.includes('PREMIUM_REQUIRED'))onPremium();
   else setError('Не удалось вернуть анкету: '+e.message);
  }finally{setBusy(false)}
 };
 const distance=card?.distance_km;
 const location=[card?.city,distance!==undefined&&distance!==null&&Number.isFinite(Number(distance))?Math.round(Number(distance))+' км':null].filter(Boolean).join(' · ');
 const undoAvailable=!!last.target&&last.can_undo;
 return <section className={'discover screen'+(embedded?' discover-embedded':'')} aria-label="Лента знакомств">
  {!embedded&&<header className="feed-head">
   <img src="/veyra-approved/00_brand/veyra_logo_primary.svg" alt="VEYRA" className="feed-brand"/>
   <div className="feed-head-right">
    <span className="feed-mode-name">{mode==='nearby'?'рядом':mode==='for_you'?'по интересам':'для вас'}</span>
    <button className="icon-button" type="button" onClick={onFilters} aria-label="Фильтры"><Icon name="filters" tone="pink" size={23}/></button>
   </div>
  </header>}
  <div className="feed-content" aria-busy={busy}>
   {loading&&!card?<FeedState kind="loading"/>:
    card?<React.Fragment>
     <div className="vx-feed-card-stage"><div key={String(card.id)} className={'feed-photo'+(motion?' feed-motion-'+motion:'')}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onClick={onCardClick} aria-label={'Листать фотографии: '+card.name}>
      <FeedPicture key={card.id} card={card} index={index}/>
      <div className="veyra-card-shade" aria-hidden="true"/>
      <CardPhotoBars photos={photos} index={index} onSelect={setIndex}/>
      {card.test_profile&&<span className="vx-demo-feed-badge">ДЕМО</span>}
      <CardCaption profile={card} age={card.age} location={location} onProfile={()=>onProfile(card.id)}/>
      {motion==='exit-like'&&<div className="feed-flash feed-flash-like" aria-hidden="true"><Icon name="heart_filled" tone="white" size={70}/><b>Нравится!</b></div>}
      {motion==='exit-pass'&&<div className="feed-flash feed-flash-pass" aria-hidden="true"><Icon name="close" tone="white" size={64}/><b>Пропустить</b></div>}
      {motion==='exit-super'&&<div className="feed-flash feed-flash-super" aria-hidden="true"><Star size={76} fill="white"/><b>Суперлайк!</b></div>}
     </div>
     <div className="feed-actions">
      <button type="button" className="feed-action action-undo" disabled={busy||!undoAvailable} aria-label="Отменить последнее действие" title={last.can_undo&&!last.premium&&last.free_undo_left<=0?'Лимит бесплатных отмен исчерпан':'Отменить последнее действие'} onClick={undo}><span className="feed-action-circle"><Icon name="undo" tone="dark" size={24}/></span></button>
      <button type="button" className="feed-action action-pass" disabled={busy} aria-label="Пропустить" title="Пропустить" onClick={()=>react('pass')}><span className="feed-action-circle"><Icon name="close" tone="pink" size={29}/></span></button>
      <button type="button" className="feed-action action-super" disabled={busy} aria-label="Суперлайк" title="Суперлайк" onClick={()=>react('super')}><span className="feed-action-circle"><Icon name="star" tone="pink" size={27}/></span></button>
      <button type="button" className="feed-action action-like" disabled={busy} aria-label="Нравится" title="Нравится" onClick={()=>react('like')}><span className="feed-action-circle"><Icon name="heart_filled" tone="white" size={30}/></span></button>
     </div>
     </div>
    </React.Fragment>:<FeedState kind={error?'error':limited?'limit':'empty'} onRetry={()=>setRefresh(i=>i+1)} onFilters={onFilters} onPremium={onPremium}/>}
   {card&&<InlineAlert>{error}</InlineAlert>}
  </div>
 </section>;
}
