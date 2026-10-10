import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Camera,ChevronRight,Clapperboard,Coffee,Dumbbell,Flower2,Footprints,Headphones,MapPin,MonitorSmartphone,Music2,Palette,PawPrint,Plane,Shirt,Star,UtensilsCrossed} from 'lucide-react';
import {get,post,photoUrl,cachedPhoto} from './api.js';
import {Button,Empty,Icon,InlineAlert,Spinner,Tabs} from './UI.jsx';
import './Discover.css';

const modes=[['discover','для вас'],['nearby','рядом'],['for_you','по интересам']];
const interestIcons={
 'музыка':Music2,'путешествия':Plane,'кино':Clapperboard,'спорт':Dumbbell,
 'книги':BookOpen,'кофе':Coffee,'технологии':MonitorSmartphone,
 'животные':PawPrint,'фото':Camera,'прогулки':Footprints,
 'искусство':Palette,'вкусная еда':UtensilsCrossed,'танцы':Headphones,
 'йога':Flower2,'мода':Shirt
};

function InterestIcon({name}){
 const Component=interestIcons[String(name).toLowerCase()];
 return Component?<Component size={15} strokeWidth={2} aria-hidden="true"/>:null;
}
async function decodePhoto(url){
 if(!url||typeof Image==='undefined')return;
 const image=new Image();
 image.src=url;
 if(typeof image.decode==='function')await image.decode().catch(()=>{});
}
function FeedPicture({profileId,photos,index,name}){
 const id=photos[index];
 const [picture,setPicture]=useState(()=>({profileId,src:cachedPhoto(id),previous:'',failed:!id}));
 useEffect(()=>{
  let live=true;
  if(!id){setPicture({profileId,src:'',previous:'',failed:true});return;}
  const apply=url=>setPicture(prev=>{
   const old=prev.profileId===profileId?prev.src:'';
   return {profileId,src:url,previous:old&&old!==url?old:'',failed:false};
  });
  const cached=cachedPhoto(id);
  if(cached){apply(cached);}
  else {
   setPicture(prev=>prev.profileId===profileId?{...prev,failed:false}:{profileId,src:'',previous:'',failed:false});
   photoUrl(id).then(async url=>{await decodePhoto(url);if(live)apply(url)})
    .catch(()=>{if(live)setPicture({profileId,src:'',previous:'',failed:true})});
  }
  return()=>{live=false};
 },[id,profileId]);
 useEffect(()=>{
  if(!picture.previous)return;
  const timer=setTimeout(()=>setPicture(prev=>({...prev,previous:''})),280);
  return()=>clearTimeout(timer);
 },[picture.previous,picture.src]);
 useEffect(()=>{
  if(photos.length<2)return;
  const ids=new Set([photos[(index+1)%photos.length],photos[(index+photos.length-1)%photos.length]]);
  ids.delete(id);
  for(const next of ids)if(next)photoUrl(next).then(decodePhoto).catch(()=>{});
 },[profileId,photos,index,id]);
 const samePerson=picture.profileId===profileId;
 return <div className="feed-picture" aria-label={'Фото анкеты '+name}>
  {samePerson&&picture.previous&&<img className="feed-picture-previous" src={picture.previous} alt="" draggable="false" aria-hidden="true"/>}
  {samePerson&&picture.src?<img key={picture.src} className="feed-picture-current" src={picture.src} alt={name} loading="eager" fetchPriority="high" decoding="async" draggable="false"/>:
   samePerson&&picture.failed?<div className="feed-picture-unavailable"><Icon name="camera" tone="pink" size={27}/><span>Фото недоступно</span></div>:
   <div className="feed-picture-skeleton" aria-hidden="true"/>}
 </div>;
}

export function Discover({onProfile,onMatch,onPremium,onFilters,refreshTick=0}){
 const [mode,setMode]=useState('discover');
 const [card,setCard]=useState(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [limited,setLimited]=useState(false);
 const [index,setIndex]=useState(0);
 const [reload,setReload]=useState(0);
 const [dragX,setDragX]=useState(0);
 const [motion,setMotion]=useState('');
 const [last,setLast]=useState({can_undo:false,free_undo_left:0,premium:false,target:null});
 const ticket=useRef(0);
 const pointer=useRef(null);
 const ignoreTap=useRef(false);

 useEffect(()=>{
  let alive=true;
  get('/reactions/last').then(value=>{
   if(alive)setLast({...value,target:value.action?.target||null});
  }).catch(()=>{});
  return()=>{alive=false};
 },[]);
 useEffect(()=>{
  let alive=true;
  const seq=++ticket.current;
  setLoading(true);setCard(null);setError('');setIndex(0);setDragX(0);setMotion('');
  get('/feed?mode='+encodeURIComponent(mode)).then(result=>{
   if(alive&&seq===ticket.current){
    setCard(result.profiles?.[0]||null);
    setLimited(!!result.limited);
   }
  }).catch(e=>{
   if(alive&&seq===ticket.current)setError('Не удалось загрузить анкеты: '+e.message);
  }).finally(()=>{
   if(alive&&seq===ticket.current)setLoading(false);
  });
  return()=>{alive=false;ticket.current++};
 },[mode,refreshTick,reload]);

 const photos=card?.photos||[];
 const changePhoto=step=>{
  if(!card||photos.length<2||busy)return;
  setIndex(current=>(current+step+photos.length)%photos.length);
 };
 const react=async kind=>{
  if(!card||busy)return;
  const target=String(card.id);
  setBusy(true);setMotion(kind);setDragX(0);setError('');
  try{
   const result=await post('/reactions',{target,kind,next_mode:mode});
   setLast(previous=>({...previous,target,can_undo:!result.matched}));
   if(result.next){
    ++ticket.current;
    setCard(result.next.profiles?.[0]||null);
    setIndex(0);
    setLimited(!!result.next.limited);
    setLoading(false);
   }else{
    setReload(value=>value+1);
   }
   if(result.matched)onMatch(result.match_id,card);
  }catch(e){
   if(e.message.includes('LIMIT')||e.message.includes('REQUIRED'))onPremium();
   else setError('Действие не выполнено: '+e.message);
  }finally{
   setMotion('');setBusy(false);
  }
 };
 const undo=async()=>{
  if(busy||!last.can_undo||!last.target||(!last.premium&&!last.free_undo_left))return;
  setBusy(true);setMotion('undo');setError('');
  try{
   const result=await post('/reactions/undo',{target:String(last.target)});
   ++ticket.current;
   setCard(result.profile);
   setIndex(0);setLoading(false);setLimited(false);
   setLast(previous=>({...previous,can_undo:false,target:null,free_undo_left:previous.premium?previous.free_undo_left:Math.max(0,previous.free_undo_left-1)}));
  }catch(e){
   if(e.message.includes('PREMIUM_REQUIRED'))onPremium();
   else setError('Не удалось вернуть анкету: '+e.message);
  }finally{setMotion('');setBusy(false)}
 };
 const pointerDown=e=>{
  if(busy||!card||e.button!==0||e.target.closest('button'))return;
  pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false};
 };
 const pointerMove=e=>{
  const start=pointer.current;
  if(!start||start.id!==e.pointerId||busy)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;
  if(!start.horizontal&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.25){
   start.horizontal=true;
   try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
  }
  if(start.horizontal)setDragX(Math.max(-180,Math.min(180,dx)));
 };
 const pointerEnd=e=>{
  const start=pointer.current;
  if(!start||start.id!==e.pointerId)return;
  pointer.current=null;
  if(start.horizontal){
   ignoreTap.current=true;
   const dx=e.clientX-start.x;
   setDragX(0);
   if(Math.abs(dx)>105)react(dx>0?'like':'pass');
   setTimeout(()=>{ignoreTap.current=false},0);
  }
 };
 const distance=card?.distance_km;
 const distanceText=distance!==null&&distance!==undefined&&Number.isFinite(Number(distance))?Math.round(Number(distance))+' км от вас':'';
 const showUndo=!!last.can_undo&&(!!last.premium||last.free_undo_left>0);
 return <section className="discover screen" aria-label="Лента знакомств">
  <div className="feed-head">
   <span className="spark-badge" aria-hidden="true"><Icon name="sparkle" tone="pink" size={23}/></span>
   <div className="feed-logo"><img src="/assets/veyra/00_brand/veyra_logo.svg" alt="VEYRA" width="112"/></div>
   <button className="icon-button" type="button" aria-label="Фильтры" onClick={onFilters}><Icon name="filters" tone="dark" size={22}/></button>
  </div>
  <Tabs items={modes} value={mode} onChange={next=>{if(!busy)setMode(next)}}/>
  <div className="feed-content" aria-busy={busy}>
   {loading&&!card?
    <div className="feed-state feed-state-loading" role="status"><div className="feed-state-symbol"><Spinner/></div><h2>Подбираем анкеты</h2><p>Ищем людей, которые могут тебе понравиться</p></div>:
    card?
    <>
     <div className={'feed-photo'+(motion?' feed-motion-'+motion:'')+(dragX?' feed-dragging':'')}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
      onClickCapture={e=>{if(ignoreTap.current){e.preventDefault();e.stopPropagation()}}}
      style={dragX?{transform:'translate3d('+dragX+'px,0,0) rotate('+(dragX/28)+'deg)'}:undefined}>
      <FeedPicture profileId={card.id} photos={photos} index={index} name={card.name}/>
      <div className="feed-image-shade" aria-hidden="true"/>
      {Math.abs(dragX)>35&&<span className={'feed-drag-feedback '+(dragX>0?'positive':'negative')} aria-hidden="true">{dragX>0?'♥ нравится':'× пропустить'}</span>}
      <button className="feed-more" type="button" aria-label="Подробнее об анкете" onClick={()=>onProfile(card.id)}><Icon name="more" tone="white" size={23}/></button>
      <button className="feed-photo-tap feed-photo-tap-left" type="button" aria-label="Предыдущее фото" onClick={()=>changePhoto(-1)}/>
      <button className="feed-photo-tap feed-photo-tap-right" type="button" aria-label="Следующее фото" onClick={()=>changePhoto(1)}/>
      <div className="hero-info">
       {card.online&&<span className="feed-online"><span className="feed-online-dot"/>в сети</span>}
       <div className="feed-name-line">
        <button className="hero-name" type="button" onClick={()=>onProfile(card.id)}>{card.name}, {card.age}</button>
        <button className="feed-profile-link" type="button" aria-label="Открыть профиль" onClick={()=>onProfile(card.id)}><ChevronRight size={25} strokeWidth={2.5} aria-hidden="true"/></button>
       </div>
       {(card.city||distanceText)&&<p className="feed-location"><MapPin size={16} strokeWidth={2.2} aria-hidden="true"/><span>{[card.city,distanceText].filter(Boolean).join(' · ')}</span></p>}
       {card.bio&&<p className="hero-bio">{card.bio}</p>}
       {(card.interests?.length>0||card.popular||card.new_member)&&<div className="hero-tags">
        {card.popular&&<span className="feed-interest"><Icon name="heart_filled" tone="white" size={15}/> популярный</span>}
        {card.new_member&&<span className="feed-interest"><Icon name="sparkle" tone="white" size={15}/> новенький</span>}
        {(card.interests||[]).slice(0,3).map(name=><span className="feed-interest" key={name}><InterestIcon name={name}/><span>{name}</span></span>)}
       </div>}
      </div>
      <div className="photo-bars" role="group" aria-label="Фотографии анкеты">{photos.map((id,i)=><button type="button" key={id} aria-label={'Фото '+(i+1)} aria-current={index===i?'true':undefined} className={index===i?'active':''} onClick={()=>setIndex(i)}/>)}</div>
     </div>
     <div className="feed-actions">
      <button type="button" className="feed-action action-undo" disabled={busy||!showUndo} aria-label="Отменить последнее действие" title="Отменить последнее действие" onClick={undo}>
       <span className="feed-action-circle"><Icon name="undo" tone="dark" size={26}/></span><span className="feed-action-label">отмена</span>
      </button>
      <button type="button" className="feed-action action-pass" disabled={busy} aria-label="Пропустить" title="Пропустить" onClick={()=>react('pass')}>
       <span className="feed-action-circle"><Icon name="close" tone="pink" size={30}/></span><span className="feed-action-label">пропустить</span>
      </button>
      <button type="button" className="feed-action action-like" disabled={busy} aria-label="Нравится" title="Нравится" onClick={()=>react('like')}>
       <span className="feed-action-circle"><Icon name="heart_filled" tone="white" size={38}/></span><span className="feed-action-label">нравится</span>
      </button>
      <button type="button" className="feed-action action-super" disabled={busy} aria-label="Суперлайк" title="Суперлайк" onClick={()=>react('super')}>
       <span className="feed-action-circle"><Star size={28} fill="currentColor" strokeWidth={1.6} aria-hidden="true"/></span><span className="feed-action-label">суперлайк</span>
      </button>
     </div>
    </>:
    <div className="feed-state">
     <div className="feed-state-symbol"><Icon name={error?'close':limited?'crown':'cards'} tone="pink" size={45}/></div>
     <h2>{error?'Не удалось загрузить анкеты':limited?'На сегодня всё':'Пока нет новых анкет'}</h2>
     <p>{error?'Проверь подключение и попробуй ещё раз.':limited?'Лимит доступных анкет на сегодня исчерпан.':'Попробуй изменить фильтры или зайди позже. Новые анкеты появляются после модерации.'}</p>
     <Button className="full" onClick={limited?onPremium:error?()=>setReload(value=>value+1):onFilters}>{limited?'Открыть Premium':error?'Попробовать ещё раз':'Настроить фильтры'}</Button>
    </div>}
   {card&&<InlineAlert>{error}</InlineAlert>}
  </div>
 </section>;
}
