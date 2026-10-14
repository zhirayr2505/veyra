import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MapPin,Plane,Palette,BookOpen,Music2,Coffee,Clapperboard,Dumbbell,Camera,PawPrint,Gamepad2,UtensilsCrossed,Heart,Footprints,Sparkles,ChevronLeft,ChevronRight,Images,Gift,UsersRound,UserRound} from 'lucide-react';
import {Logo,Icon,DetailIcon,Photo,Button,Sheet,Empty,InlineAlert} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {get,post} from './api.js';
import {openInvoice,GiftCollection,OwnerTestTools} from './Extras.jsx';
import {ProfileHighlights,INTEREST_GROUPS,goalTitle} from './OnboardingOptions.jsx';
import './MemberFeed.css';
import './MemberTelegramProfile.css';
import {VeyraPackIcon,interestGlyph} from './VeyraPackIcons.jsx';
import {useVeyraProfileMotion} from './useVeyraProfileMotion.js';
import {interestTone,sharedInterestSet,normalizeInterest} from './profilePolishLogic.js';
import {MemberSwipePages} from './MemberSwipePages.jsx';
import {PhotoSegments} from './PhotoSegments.jsx';
import {normalizeProfileSeed,mergeProfileSeed} from './profileSeed.js';
import {Pencil,Settings2,Wallet,ShieldCheck,Crown,Medal,ImagePlus,MessageCircleHeart} from 'lucide-react';

const TABS=[['about','О себе'],['photos','Фото'],['gifts','Подарки'],['common','Общее']];
const TAB_ICONS={about:UserRound,photos:Images,gifts:Gift,common:UsersRound};
const ICONS_BY_GROUP={'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,'Путешествия':Plane,'Вкус и стиль':Coffee,'Образ жизни':Heart,'Кино и развлечения':Clapperboard,'Спорт и движение':Dumbbell,'Искусство и творчество':Palette,'Еда и напитки':UtensilsCrossed,'Природа и питомцы':PawPrint,'Технологии и игры':Gamepad2,'Саморазвитие':BookOpen,'Город и встречи':Footprints};
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function MemberInterest({label,common=false}){return <span className="vx-member-interest" data-tone={interestTone(label,INTEREST_GROUPS)} data-common={common?'true':undefined}><VeyraPackIcon name={interestGlyph(label)} size={19}/><span className="vx-interest-text">{label}</span>{common&&<span className="vx-profile-common-tag">общее</span>}</span>}
const feedback=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{/* No haptic outside Telegram. */}};

export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer,ownMe=null,onEdit,onSettings,onCollection,onRanking,onCourtship,onAdmin,initialData=null}){
 const isOwn=!!ownMe;
 const tabs=isOwn?[['about','О себе'],['photos','Фото'],['gifts','Подарки'],['common','Ещё']]:TABS;
 const seed=useMemo(()=>normalizeProfileSeed(initialData,id),[initialData,id]);
 const ownSeed=useMemo(()=>{
  if(!ownMe)return null;
  const p=ownMe.profile||{},year=p.birth_year||p.year_of_birth;
  return normalizeProfileSeed({...p,id:p.id||ownMe.user?.id,photos:ownMe.photos||[],
   age:p.age||(year?new Date().getFullYear()-Number(year):null),online:false});
 },[ownMe]);
 const [data,setData]=useState(()=>ownSeed||seed),[loading,setLoading]=useState(()=>!ownSeed),[error,setError]=useState('');
 const [idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[galleryHint,setGalleryHint]=useState(false),[more,setMore]=useState(false);
 const [reactionPulse,setReactionPulse]=useState('');
 const [courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false);
 const [reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false);
 const [reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const [tab,setTab]=useState('about');
 const [logoTone,setLogoTone]=useState('light');
 const scrollRef=useRef(null),stageRef=useRef(null),motionRef=useRef(null),galleryTouch=useRef(null),galleryHintSeen=useRef(false);
 const swipeApiRef=useRef(null),tabRailRef=useRef(null);
 const moveTabIndicator=useCallback(position=>{
  const underline=tabRailRef.current?.querySelector('.vx-tab-underline');
  if(underline)underline.style.transform='translate3d('+(position*100).toFixed(3)+'%,0,0)';
 },[]);
 const {onTouchStart:motionTouchStart,onTouchEnd:motionTouchEnd,onWheel:motionWheel}=useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready:!!data});

 useEffect(()=>{
  let active=true;
  setData(ownSeed||seed);
  setLoading(!ownSeed);
  setError('');setTab('about');setIdx(0);setCourtship(null);
  if(ownSeed)return()=>{active=false};
  // Paint known feed/chat/likes data first. Profile and courtship independently
  // hydrate it; courtship latency must never hold back the hero photograph.
  get('/profiles/'+id).then(profile=>{
   if(active)setData(previous=>mergeProfileSeed(previous,profile));
  }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
  get('/courtships/profile/'+id).then(c=>{if(active)setCourtship(c)}).catch(()=>{});
  return()=>{active=false};
 },[id,ownSeed,seed]);
 useEffect(()=>{if(isOwn)return;const root=document.documentElement,body=document.body;const prev=[root.style.overflow,body.style.overflow];root.style.overflow='hidden';body.style.overflow='hidden';return()=>{root.style.overflow=prev[0];body.style.overflow=prev[1]}},[isOwn]);

 // Read a tiny canvas sample of the actual portrait, once per photo change.
 // No canvas work is performed during scrolling or the animation loop.
 useEffect(()=>{
  if(!data)return;
  const root=motionRef.current;
  if(!root)return;
  const sample=()=>{
   const image=root.querySelector('.vx-profile-hero-photo .photo-box img');
   if(!image?.complete||image.naturalWidth<4)return;
   try{
    const c=document.createElement('canvas');c.width=12;c.height=8;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    // Approximate the upper-central header area in both photo states.
    ctx.drawImage(image,image.naturalWidth*.22,0,image.naturalWidth*.56,image.naturalHeight*.33,0,0,12,8);
    const bytes=ctx.getImageData(0,0,12,8).data;
    let sum=0;
    for(let i=0;i<bytes.length;i+=4)sum+=.2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2];
    setLogoTone(sum/(bytes.length/4)<139?'dark':'light');
   }catch{setLogoTone('light')}
  };
  const observer=new MutationObserver(sample);
  observer.observe(root,{childList:true,subtree:true});
  root.addEventListener('load',sample,true);
  sample();
  return()=>{observer.disconnect();root.removeEventListener('load',sample,true)};
 },[data,idx]);

 const openGallery=index=>{if(!data?.photos?.length)return;if(Number.isInteger(index))setIdx(index);setGalleryHint(!galleryHintSeen.current);galleryHintSeen.current=true;setGallery(true)};
 useEffect(()=>{
  if(!gallery)return;
  const onKey=e=>{const length=data?.photos?.length||0;if(e.key==='Escape')setGallery(false);if(e.key==='ArrowLeft'&&length>1)setIdx(i=>(i-1+length)%length);if(e.key==='ArrowRight'&&length>1)setIdx(i=>(i+1)%length)};
  document.addEventListener('keydown',onKey);
  return()=>document.removeEventListener('keydown',onKey);
 },[gallery,data]);
 const openTab=next=>{
  const index=tabs.findIndex(([key])=>key===next);
  if(index<0)return;
  // Tabs and the vertical scroll are independent; changing tabs must
  // never fight the photo collapse/expand gesture.
  if(swipeApiRef.current)swipeApiRef.current.scrollTo(index);
  else setTab(next);
 };
 const requestCourtship=async()=>{
  if(courtBusy)return;setCourtBusy(true);setError('');
  try{const mine=courtship?.mine;const r=mine?.status==='accepted'?await post('/courtships/'+mine.id+'/pay',{}):await post('/courtships/request',{target:String(id)});if(r.invoice_url){openInvoice(r.invoice_url)}else if(r.status==='pending')window.alert('Приглашение отправлено. Статус появится только после согласия.');if(r.status==='active')await onPaid?.();setCourtship(await get('/courtships/profile/'+id))}catch(e){setError(e.message==='INSUFFICIENT_VEYS'?'Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.':e.message)}finally{setCourtBusy(false)}
 };
 const like=async(kind='like')=>{feedback();setReactionPulse(kind);try{const r=await post('/reactions',{target:String(id),kind});if(r.matched)onMatch(r.match_id,data);else onBack()}catch(e){if(kind==='super'&&/PREMIUM_REQUIRED|LIMIT_REACHED|INSUFFICIENT/i.test(e.message))onPremium?.();else setError(e.message)}};
 const report=async()=>{if(reportBusy)return;setReportBusy(true);setError('');try{await post('/reports',{target:String(id),reason:reportReason,details:reportDetails});setReportOpen(false);onBack()}catch(e){setError('Не удалось отправить жалобу: '+e.message)}finally{setReportBusy(false)}};
 const block=async()=>{if(!window.confirm('Заблокировать пользователя?'))return;try{await post('/blocks',{target:String(id)});onBack()}catch(e){setError(e.message)}};
 const share=async()=>{try{await navigator.share?.({title:'VEYRA',text:'Анкета в VEYRA'})}catch{}setMore(false)};
 if(!data&&loading)return <main className="page vx-profile-entry-fallback" aria-busy="true" aria-label="Открывается профиль">
  <div className="vx-profile-entry-cover" aria-hidden="true"/>
  <Logo width={131}/>
  <div className="vx-profile-entry-sheet" aria-hidden="true"><span/><span/><span/></div>
 </main>;
 if(!data)return <div className="page"><Empty title="Анкета недоступна" body={error}/><Button onClick={onBack}>вернуться</Button></div>;
 const match=data.match_id||initialMatch,photos=data.photos||[];
 const courtStatus=courtship?.mine?.status||'available';
 const courtDisabled=courtBusy||['active','payment_pending','pending'].includes(courtStatus);
 const courtLabel=courtStatus==='active'?'Вы ухаживаете':courtStatus==='pending'?'На рассмотрении':courtStatus==='payment_pending'?'Ожидаем оплату':courtStatus==='accepted'?'Оплатить':'Ухаживать';
 const shared=sharedInterestSet(data.interests||[],viewer?.interests||[]),common=(data.interests||[]).filter(i=>shared.has(normalizeInterest(i)));
 const sameGoal=!!(viewer?.goal&&viewer.goal!=='unsure'&&data.goal===viewer.goal);
 const fullName=(data.name||'Профиль')+(data.age?', '+data.age:'');
 const photosNext=step=>setIdx(n=>(n+step+photos.length)%photos.length);
 return <div className={'member page member-feed-profile vx-telegram-member vx-master-profile'+(isOwn?' vx-own-member own-profile':'')+(loading?' vx-profile-hydrating':'')} aria-busy={loading}>
  {createPortal(<header className="vx-member-floating-header vx-member-native-header" data-logo-tone={logoTone} aria-label="Навигация профиля VEYRA">
   {(isOwn||!window.Telegram?.WebApp?.BackButton)&&<button type="button" className="vx-member-fallback-back" onClick={onBack} aria-label="Закрыть профиль"><Icon name="back" tone="pink" size={21}/></button>}
   <Logo width={115} className="vx-member-floating-logo"/>
  </header>,document.body)}

  <div className="vx-profile-scroller" ref={scrollRef} onTouchStart={motionTouchStart} onTouchEnd={motionTouchEnd} onWheel={motionWheel} aria-label={'Профиль '+data.name}>
   <div className="vx-profile-motion" ref={motionRef} data-state="expanded" data-motion-phase="sheet" data-sheet-overlap="true">
    <div className="vx-profile-sticky" aria-hidden="false">
     <div className="vx-profile-compact-backdrop" aria-hidden="true"/>
     <div className="vx-profile-blurred-header" aria-hidden="true">
      <Photo id={photos[idx]} resolution={640} alt=""/>
     </div>
     <div className="vx-profile-card-backdrop" aria-hidden="true"/>
     <div className="vx-profile-sheet-lip" aria-hidden="true"/>
     <div className="vx-profile-sheet-grabber" aria-hidden="true"/>
     <div className="vx-profile-hero-photo">
      <Photo id={photos[idx]} alt={data.name} onClick={()=>openGallery()} priority resolution={960}/>
      <div className="vx-profile-photo-morph-rim" aria-hidden="true"/>
      <div className="vx-profile-photo-shade" aria-hidden="true"/>
      <PhotoSegments count={photos.length} index={idx} className="vx-profile-photo-bars"/>
      {photos.length>1&&<div className="vx-profile-photo-nav">
       <button type="button" onClick={()=>photosNext(-1)} aria-label="Предыдущее фото"><ChevronLeft size={26}/></button>
       <button type="button" onClick={()=>photosNext(1)} aria-label="Следующее фото"><ChevronRight size={26}/></button>
      </div>}
      {data.test_profile&&!isOwn&&<span className="vx-profile-demo-badge">ДЕМО</span>}
      {data.online&&<span className="vx-profile-online" aria-label="В сети" title="В сети"/>}
     </div>
     <div className="vx-profile-avatar-ring" aria-hidden="true"/>
     {data.online&&<div className="vx-profile-avatar-online-dot" aria-label="В сети"/>}

     <section className="vx-profile-identity" aria-label="Информация об анкете">
      <div className="vx-profile-name-row"><h1>{fullName}</h1>{data.verified&&!data.test_profile?<Icon name="verified" tone="pink" size={18}/>:null}</div>
      <div className="vx-profile-location"><CountryFlag country={data.country} round/> {data.city}</div>
      {data.goal&&<span className="vx-profile-goal"><Heart size={13}/><span className="vx-profile-goal-text">{goalTitle(data.goal)}</span></span>}
     </section>
     {isOwn?<div className="vx-profile-primary-actions vx-own-profile-actions" aria-label="Управление моим профилем">
      <button type="button" className="vx-profile-action" onClick={()=>openTab('photos')}><ImagePlus size={20}/><span>Мои фото</span></button>
      <button type="button" className="vx-profile-action primary" onClick={onEdit}><Pencil size={20}/><span>Изменить</span></button>
      <button type="button" className="vx-profile-action" onClick={onSettings}><Settings2 size={20}/><span>Настройки</span></button>
     </div>:<div className="vx-profile-primary-actions" aria-label="Действия с человеком">
      <button type="button" className="vx-profile-action" onClick={()=>onGift(data)} aria-label="Подарить подарок"><VeyraPackIcon name="gift" size={21}/><span>Подарок</span></button>
      <button type="button" className={"vx-profile-action primary"+(reactionPulse==='like'?" vx-reaction-burst":"")} onAnimationEnd={()=>setReactionPulse('')} onClick={()=>match?(feedback(),onChat(match)):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><VeyraPackIcon name={match?'chat':'heart'} size={21} filled={!match}/><span>{match?'Написать':'Нравится'}</span></button>
      {match?<button type="button" className="vx-profile-action vx-profile-courtship" data-status={courtStatus} onClick={requestCourtship} disabled={courtDisabled} aria-label={courtLabel}><VeyraPackIcon name="courtship" size={21}/><span>{courtLabel}</span></button>
       :<button type="button" className={"vx-profile-action vx-profile-super"+(reactionPulse==='super'?' vx-reaction-burst':'')} onAnimationEnd={()=>setReactionPulse('')} onClick={()=>like('super')} aria-label="Суперлайк"><VeyraPackIcon name="star" size={21} filled/><span>Суперлайк</span></button>}
      </div>}
      {isOwn
       ? <button type="button" className="vx-profile-card-more" aria-label="Настройки" onClick={onSettings}><Settings2 size={21}/></button>
       : <button type="button" className="vx-profile-card-more" aria-label="Действия с анкетой" aria-expanded={more} onClick={()=>setMore(v=>!v)}><Icon name="more" tone="pink" size={20}/></button>}
     </div>
    </div>
    <div className="vx-profile-open-spacer" ref={stageRef} aria-hidden="true"/>

   <div className="vx-profile-tab-rail" role="tablist" aria-label="Разделы анкеты" ref={tabRailRef}>
    {tabs.map(([key,label])=>{const TabIcon=TAB_ICONS[key];return <button key={key} type="button" role="tab" aria-selected={tab===key} aria-controls={'vx-profile-panel-'+key} className={tab===key?'active':''} onClick={()=>openTab(key)}><TabIcon className="vx-tab-icon" size={15} strokeWidth={2}/><span className="vx-tab-label-stack"><span className="vx-tab-label-base">{label}</span><span className="vx-tab-label-active" aria-hidden="true">{label}</span></span></button>})}
    <span className="vx-tab-underline" aria-hidden="true"/>
   </div>
   <MemberSwipePages tabs={tabs} active={tab} onChange={setTab} onProgress={moveTabIndicator} carouselApiRef={swipeApiRef}>
    {key=><div className="vx-profile-section-body">
    {key==='about'&&<>
     <section className="vx-profile-surface vx-profile-about">
      <div className="vx-own-section-heading"><h2>О себе</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить описание"><Pencil size={17}/></button>}</div>{loading&&!data.bio?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/><span/></div>:<p>{data.bio||'Пока ничего не рассказал о себе.'}</p>}
      
     </section>
     <section className="vx-profile-surface"><div className="vx-own-section-heading"><h2>Интересы</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить интересы"><Pencil size={17}/></button>}</div>{(data.interests||[]).length?<div className="vx-member-interests-grid">{data.interests.map(label=><MemberInterest key={label} label={label} common={!isOwn&&shared.has(normalizeInterest(label))}/>)}</div> :loading?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/></div>:<p className="vx-profile-secondary">Пока не указаны.</p>}</section>
     <section className="vx-profile-surface vx-profile-goal-surface"><div className="vx-own-section-heading"><h2>Цель знакомства</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить цель знакомства"><Pencil size={17}/></button>}</div>{loading&&!data.goal?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/></div>:<div className="vx-profile-goal-detail"><span className="vx-profile-goal-emblem"><VeyraPackIcon name="goal" size={32}/></span><div className="vx-profile-goal-copy"><small>Моя цель на VEYRA</small><strong>{goalTitle(data.goal)}</strong></div></div>}</section>
     {data.online&&<div className="vx-profile-hint"><DetailIcon name="online" size={13}/> Сейчас в сети</div>}
     {match&&courtship?.mine?.status&&<div className="vx-profile-hint">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение ожидает согласия':courtship.mine.status==='accepted'?'Предложение принято, можно оплатить':'Ухаживание: '+courtship.mine.status}</div>}
     <ProfileHighlights profile={data} viewer={viewer} showGoal={false} showCommon={false}/>
      {data.test_profile&&!isOwn&&<p className="vx-profile-demo-disclaimer">Это вымышленный персонаж для проверки дизайна VEYRA. Фотографии иллюстративные.</p>}
    </>}
    {key==='photos'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Фотографии</h2>{isOwn&&<button className="vx-own-pencil" type="button" aria-label="Изменить фотографии" onClick={onEdit}><Pencil size={17}/></button>}<span>{photos.length}</span></div>{photos.length?<div className="vx-profile-photos-grid">{photos.map((p,i)=><button type="button" key={p} onClick={()=>openGallery(i)} aria-label={'Открыть фото '+(i+1)}><Photo id={p} alt={'Фото '+(i+1)+' · '+data.name} resolution={640}/></button>)}</div>:<Empty art="profile" title="Фотографий пока нет" body="Пока здесь нет снимков."/>}</section></>}
    {key==='gifts'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Подарки</h2><Gift size={19}/></div>{tab==='gifts'&&<GiftCollection ownerId={isOwn?'me':id}/>}</section></>}
    {key==='common'&&!isOwn&&<>
     <section className="vx-profile-surface"><h2>Что вас объединяет</h2>{common.length||sameGoal?<><p className="vx-profile-secondary">Уже есть повод начать разговор.</p>{common.length>0&&<div className="vx-member-interests-grid">{common.map(label=><MemberInterest label={label} common key={label}/>)}</div>}{sameGoal&&<div className="vx-profile-goal-detail"><VeyraPackIcon name="heart" size={18}/>У вас совпадают цели знакомства</div>}</>:<p className="vx-profile-secondary">Пока общих интересов не нашлось. Узнайте друг друга в общении.</p>}</section>
     {(courtship?.suitors||[]).length>0&&<section className="vx-profile-surface"><h2>Ухажёры</h2><p>{courtship.suitors.map(x=>x.sender_name).join(' · ')}</p></section>}
    </>}
    {key==='common'&&isOwn&&<section className="vx-profile-surface vx-own-tools" aria-label="Мои возможности"><h2>Мой VEYRA</h2><div className="own-shortcuts"><button onClick={onPremium}><Crown size={25}/><b>Premium</b></button><button onClick={onCollection}><VeyraPackIcon name="gift" size={25}/><b>подарки</b></button><button onClick={onRanking}><Medal size={25}/><b>рейтинг</b></button><button onClick={onSettings}><Settings2 size={25}/><b>настройки</b></button></div><button type="button" className="vx-own-tool-row" onClick={onWallet}><Wallet size={23}/> Мой кошелёк VEYS <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={onCourtship}><MessageCircleHeart size={23}/> Предложения ухаживания <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={onEdit}><Pencil size={23}/> Редактировать анкету <span>→</span></button>{ownMe.user?.admin_role&&<button type="button" className="vx-own-tool-row" onClick={onAdmin}><ShieldCheck size={23}/> Панель модератора <span>→</span></button>}{ownMe.user?.admin_role==='owner'&&<OwnerTestTools/>}</section>}
    {key===tab&&<InlineAlert>{error}</InlineAlert>}
    </div>}
   </MemberSwipePages>
  </div>

  {gallery&&createPortal(<div className="gallery vx-profile-gallery" role="dialog" aria-modal="true" aria-label={"Галерея "+data.name} onTouchStart={e=>{galleryTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{const start=galleryTouch.current;if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(dy>90&&Math.abs(dy)>Math.abs(dx))setGallery(false);else if(Math.abs(dx)>40)photosNext(dx<0?1:-1);galleryTouch.current=null}}>
   <button type="button" className="gallery-close" aria-label="Закрыть" onClick={()=>setGallery(false)}><Icon name="close" tone="white" size={21}/></button>
   {photos.length>1&&<button type="button" className="vx-profile-gallery-prev" aria-label="Предыдущее фото" onClick={()=>photosNext(-1)}><ChevronLeft size={28}/></button>}
   <Photo id={photos[idx]} alt={data.name} priority resolution={960}/>
   {photos.length>1&&<button type="button" className="vx-profile-gallery-next" aria-label="Следующее фото" onClick={()=>photosNext(1)}><ChevronRight size={28}/></button>}
   <PhotoSegments count={photos.length} index={idx} className="vx-profile-gallery-bars"/>
   <small className="vx-profile-gallery-counter" aria-live="polite">{idx+1}/{photos.length}</small>
   {galleryHint&&<span className="vx-profile-gallery-hint" aria-hidden="true">↓ Свайп вниз — закрыть фото</span>}
  </div>,document.body)}

  {!isOwn&&reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
  {!isOwn&&more&&createPortal(<div className="vx-member-menu-backdrop" role="presentation" onClick={()=>setMore(false)}><section className="vx-member-popup-menu" role="menu" aria-label="Действия с анкетой" onClick={e=>e.stopPropagation()}><strong>Действия с анкетой</strong><button className="menu-item" role="menuitem" onClick={share}><Icon name="share" tone="pink" size={20}/> Поделиться</button><button className="menu-item" role="menuitem" onClick={()=>{setMore(false);setReportOpen(true)}}><Icon name="info" tone="pink" size={20}/> Пожаловаться</button><button className="menu-item danger" role="menuitem" onClick={()=>{setMore(false);block()}}><Icon name="block" tone="pink" size={20}/> Заблокировать</button><button className="vx-member-menu-close" onClick={()=>setMore(false)}>Закрыть</button></section></div>,document.body)}
 </div>;
}
