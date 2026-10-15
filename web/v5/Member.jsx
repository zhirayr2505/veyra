import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MapPin,Plane,Palette,BookOpen,Music2,Coffee,Clapperboard,Dumbbell,Camera,PawPrint,Gamepad2,UtensilsCrossed,Heart,Footprints,Sparkles,ChevronLeft,ChevronRight,Images,Gift,UsersRound,UserRound} from 'lucide-react';
import {Logo,Icon,DetailIcon,Photo,Button,InterestChip,Sheet,Empty,InlineAlert} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {get,post,photoUrl} from './api.js';
import {openInvoice,GiftCollection} from './Extras.jsx';
import {ProfileHighlights,INTEREST_GROUPS,goalTitle} from './OnboardingOptions.jsx';
import './MemberFeed.css';
import './MemberTelegramProfile.css';
import {VeyraPackIcon,interestGlyph} from './VeyraPackIcons.jsx';
import {useVeyraProfileMotion} from './useVeyraProfileMotion.js';
import {interestTone,sharedInterestSet,normalizeInterest} from './profilePolishLogic.js';
import {MemberSwipePages} from './MemberSwipePages.jsx';
import {PhotoSegments} from './PhotoSegments.jsx';
import {HeroPhotoTrack} from './HeroPhotoTrack.jsx';
import {ProfileGallery} from './ProfileGallery.jsx';
import {normalizeProfileSeed,mergeProfileSeed} from './profileSeed.js';
import {Pencil,Settings2,Wallet,ShieldCheck,Crown,Medal,ImagePlus,MessageCircleHeart} from 'lucide-react';

const TABS=[['about','О себе'],['photos','Фото'],['gifts','Подарки'],['common','Общее']];
const TAB_ICONS={about:UserRound,photos:Images,gifts:Gift,common:UsersRound};
const ICONS_BY_GROUP={'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,'Путешествия':Plane,'Вкус и стиль':Coffee,'Образ жизни':Heart,'Кино и развлечения':Clapperboard,'Спорт и движение':Dumbbell,'Искусство и творчество':Palette,'Еда и напитки':UtensilsCrossed,'Природа и питомцы':PawPrint,'Технологии и игры':Gamepad2,'Саморазвитие':BookOpen,'Город и встречи':Footprints};
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function MemberInterest({label,common=false}){return <InterestChip label={label} tone={interestTone(label,INTEREST_GROUPS)} common={common} icon={<VeyraPackIcon name={interestGlyph(label)} size={19}/>}/>;}
const feedback=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{/* No haptic outside Telegram. */}};

// The hero has already fetched the image. Reuse its cached blob for the
// static blurred compact background; never trigger a second /photos request.
// The DOM node stays stable so ScrollTimeline keeps animating its opacity.
const CompactBackdropPhoto=React.memo(function CompactBackdropPhoto({id}){
 return <Photo id={id} resolution={256} priority alt="" />;
});

export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer,ownMe=null,onEdit,onSettings,onPreviewAction,onCollection,onRanking,onCourtship,onAdmin,onGalleryStateChange,initialData=null,previewData=null,readOnly=false,viewState=null,onViewStateChange=null}){
 if(typeof window!=='undefined'&&window.__VEYRA_PROFILE_TEST__)window.__veyraMemberRenderCount=(window.__veyraMemberRenderCount||0)+1;
 const isPreview=readOnly&&!!previewData;
 const isOwn=!!ownMe||isPreview;
 const tabs=isPreview?TABS.slice(0,3):isOwn?[['about','О себе'],['photos','Фото'],['gifts','Подарки'],['common','Ещё']]:TABS;
 const seed=useMemo(()=>normalizeProfileSeed(initialData,id),[initialData,id]);
 const ownSeed=useMemo(()=>{
  if(isPreview){
   const p=previewData||{},photos=Array.isArray(p.photos)?p.photos:[];
   return normalizeProfileSeed({...p,id:p.id||'preview',photos,
    photo_placeholders:p.photo_placeholders||{}},p.id||'preview');
  }
  if(!ownMe)return null;
  const p=ownMe.profile||{},year=p.birth_year||p.year_of_birth;
  return normalizeProfileSeed({...p,id:p.id||ownMe.user?.id,photos:ownMe.photos||[],
   photo_placeholders:Object.fromEntries((ownMe.photos||[]).map(photo=>[photo.id,{lqip:photo.lqip||null,dominant:photo.dominant_color||null}])),
   age:p.age||(year?new Date().getFullYear()-Number(year):null),online:false});
 },[ownMe,isPreview,previewData]);
 const [data,setData]=useState(()=>ownSeed||seed),[loading,setLoading]=useState(()=>!ownSeed),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [idx,setIdx]=useState(()=>viewState?.index??0),[gallery,setGallery]=useState(false),[galleryHint,setGalleryHint]=useState(false),[more,setMore]=useState(false);
 const [reactionPulse,setReactionPulse]=useState('');
 const [courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false);
 const [reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false);
 const [reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const [tab,setTab]=useState(()=>viewState?.tab??'about');
 const [logoTone,setLogoTone]=useState(null);
 const scrollRef=useRef(null),stageRef=useRef(null),motionRef=useRef(null),galleryHintSeen=useRef(false);
 const profileKey=String(isPreview?'preview':ownMe?.user?.id||id||'own');
 const previousKey=useRef(profileKey),restorePending=useRef(true),modeRef=useRef(viewState?.mode||'expanded');
 const stateChangeRef=useRef(onViewStateChange);stateChangeRef.current=onViewStateChange;
 const rememberView=useCallback((mode=modeRef.current)=>{
  modeRef.current=mode;stateChangeRef.current?.({tab,index:idx,mode});
 },[tab,idx]);
 useEffect(()=>{rememberView()},[rememberView]);
 useLayoutEffect(()=>{
  if(!data||!restorePending.current||!scrollRef.current||!stageRef.current)return;
  restorePending.current=false;
  const el=scrollRef.current;
  const compact=parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||292;
  const d=Math.max(0,stageRef.current.offsetHeight-compact);
  el.scrollTop=modeRef.current==='compact'?d:0;
 },[data]);
 useEffect(()=>{
  const el=scrollRef.current;if(!el)return;
  const settled=()=>{
   const compact=parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||292;
   const d=Math.max(1,(stageRef.current?.offsetHeight||0)-compact);
   if(el.scrollTop<1)rememberView('expanded');
   else if(Math.abs(el.scrollTop-d)<1)rememberView('compact');
  };
  el.addEventListener('scrollend',settled,{passive:true});
  return()=>el.removeEventListener('scrollend',settled);
 },[rememberView]);
 const swipeApiRef=useRef(null),tabRailRef=useRef(null);
 const moveTabIndicator=useCallback(position=>{
  const underline=tabRailRef.current?.querySelector('.vx-tab-underline');
  if(underline)underline.style.transform='translate3d('+(position*100).toFixed(3)+'%,0,0)';
 },[]);
 const onPhotoDragProgress=useCallback(amount=>{
  const indicator=motionRef.current?.querySelector('.vx-profile-photo-bars');
  indicator?.style.setProperty('--veyra-swipe-drag',Math.min(1,Math.max(0,amount)).toFixed(3));
 },[]);
 const {onTouchStart:motionTouchStart,onTouchEnd:motionTouchEnd,onWheel:motionWheel}=useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready:!!data});
 useLayoutEffect(()=>{
  if(isPreview||!scrollRef.current)return;
  const el=scrollRef.current,nav=document.querySelector('.bottom-nav');
  const measure=()=>el.style.setProperty('--vx-profile-bottom-clear',Math.ceil((nav?.getBoundingClientRect().height||80)+16)+'px');
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  if(nav)ro?.observe(nav);
  measure();return()=>{ro?.disconnect();el.style.removeProperty('--vx-profile-bottom-clear')};
 },[isPreview]);

 useEffect(()=>{
  let active=true;
  setData(ownSeed||seed);
  setLoading(!ownSeed);
  setError('');setCourtship(null);
  if(previousKey.current!==profileKey){
   previousKey.current=profileKey;setTab('about');setIdx(0);modeRef.current='expanded';restorePending.current=true;
  }
  if(ownSeed)return()=>{active=false};
  // Paint known feed/chat/likes data first. Profile and courtship independently
  // hydrate it; courtship latency must never hold back the hero photograph.
  get('/profiles/'+id).then(profile=>{
   if(active)setData(previous=>mergeProfileSeed(previous,profile));
  }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
  get('/courtships/profile/'+id).then(c=>{if(active)setCourtship(c)}).catch(()=>{});
  return()=>{active=false};
 },[id,ownSeed,seed,retry]);
 useEffect(()=>{if(isOwn)return;const root=document.documentElement,body=document.body;const prev=[root.style.overflow,body.style.overflow];root.style.overflow='hidden';body.style.overflow='hidden';return()=>{root.style.overflow=prev[0];body.style.overflow=prev[1]}},[isOwn]);

 // Read a tiny canvas sample of the actual portrait, once per photo change.
 // No canvas work is performed during scrolling or the animation loop.
 useEffect(()=>{
  if(!data)return;
  const root=motionRef.current;
  if(!root)return;
  const sample=()=>{
   const image=root.querySelector('.vx-profile-hero-photo .vx-hero-swipe-slide:nth-child(2) .photo-box img.photo-sharp');
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
    const brightness=sum/(bytes.length/4);
    setLogoTone(prev=>prev==null?(brightness<140?'dark':'light'):prev==='dark'?(brightness>150?'light':'dark'):(brightness<130?'dark':'light'));
   }catch{setLogoTone(prev=>prev??'light')}
  };
  const observer=new MutationObserver(sample);
  observer.observe(root,{childList:true,subtree:true});
  root.addEventListener('load',sample,true);
  sample();
  return()=>{observer.disconnect();root.removeEventListener('load',sample,true)};
 },[data,idx]);

 const editProfile=()=>{rememberView();onEdit?.()};
 useEffect(()=>{
  const main=data?.photos?.[0];if(!main)return;
  let alive=true;
  Promise.all([photoUrl(main,{width:256}),photoUrl(main,{width:960})]).then(urls=>{
   if(!alive)return;
   for(const url of urls){const img=new Image();img.src=url;img.decode?.().catch(()=>{});}
  }).catch(()=>{});
  return()=>{alive=false};
 },[data?.photos?.[0]]);
 useEffect(()=>{
  if(data?.photos?.length)setIdx(current=>Math.min(current,data.photos.length-1));
  else if(data)setIdx(0);
 },[data?.photos?.length]);
 const openGallery=index=>{if(!data?.photos?.length)return;if(Number.isInteger(index))setIdx(index);setGalleryHint(!galleryHintSeen.current);galleryHintSeen.current=true;setGallery(true)};
 useEffect(()=>{
  onGalleryStateChange?.(gallery);
  return()=>{if(gallery)onGalleryStateChange?.(false)};
 },[gallery,onGalleryStateChange]);
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
 return <div className={'member page member-feed-profile vx-master-profile'+(isPreview?' vx-profile-read-only':'')+(isOwn?' vx-own-member own-profile':'')+(loading?' vx-profile-hydrating':'')} aria-busy={loading}>
  {!isPreview&&createPortal(<header className="vx-member-floating-header vx-member-native-header" data-logo-tone={logoTone||"pending"} aria-label="Навигация профиля VEYRA">
   {!(window.Telegram?.WebApp?.initData&&window.Telegram?.WebApp?.BackButton)&&<button type="button" className="vx-member-fallback-back" onClick={onBack} aria-label="Закрыть профиль"><Icon name="back" tone="pink" size={21}/></button>}
   <Logo width={131} tone={logoTone||"dark"} ready={logoTone!=null} className="vx-member-floating-logo"/>
  </header>,document.body)}

  <div className="vx-profile-scroller" ref={scrollRef} onTouchStart={motionTouchStart} onTouchEnd={motionTouchEnd} onWheel={motionWheel} aria-label={'Профиль '+data.name}>
   <div className="vx-profile-motion" ref={motionRef} data-state="expanded" data-photo-shape="cover" data-motion-phase="sheet" data-sheet-overlap="true">
    <div className="vx-profile-sticky" aria-hidden="false">
     <div className="vx-profile-compact-backdrop" aria-hidden="true">{photos[0]&&<CompactBackdropPhoto id={photos[0]}/>}</div>

     <div className="vx-profile-card-backdrop" aria-hidden="true"/>
     <div className="vx-profile-sheet-lip" aria-hidden="true"/>
     <div className="vx-profile-sheet-grabber" aria-hidden="true"/>
     <div className="vx-profile-hero-photo">
      <HeroPhotoTrack photos={photos} index={idx} onIndex={setIdx} onGallery={()=>openGallery()} name={data.name} placeholders={data.photo_placeholders} motionRef={motionRef} onDragProgress={onPhotoDragProgress}/>
      {idx!==0&&photos[0]&&<div className="vx-profile-main-crossfade" aria-hidden="true"><Photo id={photos[0]} priority resolution={960} alt=""/></div>}
      <div className="vx-profile-photo-morph-rim" aria-hidden="true"/>

      <PhotoSegments count={photos.length} index={idx} className="vx-profile-photo-bars"/>
      
      {data.online&&<span className="vx-profile-online" aria-label="В сети" title="В сети"/>}
      <button type="button" className="vx-profile-avatar-hit" aria-label="Открыть фотографию профиля" onClick={()=>openGallery(idx)} disabled={!photos.length}/>
     </div>


     <section className="vx-profile-identity" aria-label="Информация об анкете">
      <div className="vx-profile-name-row"><h1>{fullName}</h1>{data.verified?<Icon name="verified" tone="pink" size={18}/>:null}</div>
      <div className="vx-profile-location"><CountryFlag country={data.country} round/> {data.city}</div>
      {data.goal&&<span className="vx-profile-goal"><Heart size={13}/><span className="vx-profile-goal-text">{goalTitle(data.goal)}</span></span>}
     </section>
     {isOwn?<div className="vx-profile-primary-actions vx-own-profile-actions" aria-label="Управление моим профилем">
      <button type="button" className="vx-profile-action" onClick={isPreview?()=>onPreviewAction?.('photos'):editProfile}><ImagePlus size={19}/><span>Мои фото</span></button>
      <button type="button" className="vx-profile-action primary" onClick={isPreview?()=>onPreviewAction?.('edit'):editProfile}><Pencil size={19}/><span>Изменить</span></button>
      {!isPreview&&<button type="button" className="vx-profile-action" onClick={onSettings}><Settings2 size={19}/><span>Настройки</span></button>}
     </div>:<div className="vx-profile-primary-actions" aria-label="Действия с человеком">
      <button type="button" className="vx-profile-action" onClick={()=>onGift(data)} aria-label="Подарить подарок"><VeyraPackIcon name="gift" size={21}/><span>Подарок</span></button>
      <button type="button" className={"vx-profile-action primary"+(reactionPulse==='like'?" vx-reaction-burst":"")} onAnimationEnd={()=>setReactionPulse('')} onClick={()=>match?(feedback(),onChat(match)):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><VeyraPackIcon name={match?'chat':'heart'} size={21} filled={!match}/><span>{match?'Написать':'Нравится'}</span></button>
      {match?<button type="button" className="vx-profile-action vx-profile-courtship" data-status={courtStatus} onClick={requestCourtship} disabled={courtDisabled} aria-label={courtLabel}><VeyraPackIcon name="courtship" size={21}/><span>{courtLabel}</span></button>
       :<button type="button" className={"vx-profile-action vx-profile-super"+(reactionPulse==='super'?' vx-reaction-burst':'')} onAnimationEnd={()=>setReactionPulse('')} onClick={()=>like('super')} aria-label="Суперлайк"><VeyraPackIcon name="star" size={21} filled/><span>Суперлайк</span></button>}
      </div>}
      {!isOwn&&<button type="button" className="vx-profile-card-more" aria-label="Действия с анкетой" aria-expanded={more} onClick={()=>setMore(v=>!v)}><Icon name="more" tone="pink" size={20}/></button>}
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
      <div className="vx-own-section-heading"><h2>О себе</h2>{isOwn&&!isPreview&&<button type="button" onClick={editProfile} aria-label="Изменить описание"><Pencil size={17}/></button>}</div>{loading&&!data.bio?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/><span/></div>:<p>{data.bio||'Пока ничего не рассказал о себе.'}</p>}
      
     </section>
     <section className="vx-profile-surface"><div className="vx-own-section-heading"><h2>Интересы</h2>{isOwn&&!isPreview&&<button type="button" onClick={editProfile} aria-label="Изменить интересы"><Pencil size={17}/></button>}</div>{(data.interests||[]).length?<div className="vx-member-interests-grid">{data.interests.map(label=><MemberInterest key={label} label={label} common={!isOwn&&shared.has(normalizeInterest(label))}/>)}</div> :loading?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/></div>:<p className="vx-profile-secondary">Пока не указаны.</p>}</section>
     <section className="vx-profile-surface vx-profile-goal-surface"><div className="vx-own-section-heading"><h2>Цель знакомства</h2>{isOwn&&!isPreview&&<button type="button" onClick={editProfile} aria-label="Изменить цель знакомства"><Pencil size={17}/></button>}</div>{loading&&!data.goal?<div className="vx-profile-loading-lines" aria-hidden="true"><span/><span/></div>:<div className="vx-profile-goal-detail"><span className="vx-profile-goal-emblem"><VeyraPackIcon name="goal" size={32}/></span><div className="vx-profile-goal-copy"><small>Моя цель на VEYRA</small><strong>{goalTitle(data.goal)}</strong></div></div>}</section>
     {data.online&&<div className="vx-profile-hint"><DetailIcon name="online" size={13}/> Сейчас в сети</div>}
     {match&&courtship?.mine?.status&&<div className="vx-profile-hint">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение ожидает согласия':courtship.mine.status==='accepted'?'Предложение принято, можно оплатить':'Ухаживание: '+courtship.mine.status}</div>}
     <ProfileHighlights profile={data} viewer={viewer} showGoal={false} showCommon={false}/>
    </>}
    {key==='photos'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Фотографии</h2>{isOwn&&!isPreview&&<button className="vx-own-pencil" type="button" aria-label="Изменить фотографии" onClick={editProfile}><Pencil size={17}/></button>}<span>{photos.length}</span></div>{photos.length?<div className="vx-profile-photos-grid">{photos.map((p,i)=><button type="button" key={p} onClick={()=>openGallery(i)} aria-label={'Открыть фото '+(i+1)}><Photo id={p} alt={'Фото '+(i+1)+' · '+data.name} resolution={640} placeholder={data.photo_placeholders?.[String(p)]}/></button>)}</div>:<Empty art="profile" title="Фотографий пока нет" body="Пока здесь нет снимков."/>}</section></>}
    {key==='gifts'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Подарки</h2><Gift size={19}/></div>{!isPreview&&tab==='gifts'&&<GiftCollection ownerId={isOwn?'me':id}/>}{isPreview&&<Empty art="gift" title="Подарков пока нет" body="После публикации здесь появится коллекция полученных подарков."/>}</section></>}
    {key==='common'&&!isOwn&&<>
     <section className="vx-profile-surface"><h2>Что вас объединяет</h2>{common.length||sameGoal?<><p className="vx-profile-secondary">Уже есть повод начать разговор.</p>{common.length>0&&<div className="vx-member-interests-grid">{common.map(label=><MemberInterest label={label} common key={label}/>)}</div>}{sameGoal&&<div className="vx-profile-goal-detail"><VeyraPackIcon name="heart" size={18}/>У вас совпадают цели знакомства</div>}</>:<p className="vx-profile-secondary">Пока общих интересов не нашлось. Узнайте друг друга в общении.</p>}</section>
     {(courtship?.suitors||[]).length>0&&<section className="vx-profile-surface"><h2>Ухажёры</h2><p>{courtship.suitors.map(x=>x.sender_name).join(' · ')}</p></section>}
    </>}
    {key==='common'&&isOwn&&isPreview&&<section className="vx-profile-surface"><Empty art="profile" title="Пока нет дополнительных сведений" body="После публикации здесь появятся возможности VEYRA."/></section>}
     {key==='common'&&isOwn&&!isPreview&&<section className="vx-profile-surface vx-own-tools" aria-label="Мои возможности"><h2>Мой VEYRA</h2><div className="own-shortcuts"><button onClick={onPremium}><Crown size={25}/><b>Premium</b></button><button onClick={onCollection}><VeyraPackIcon name="gift" size={25}/><b>подарки</b></button><button onClick={onRanking}><Medal size={25}/><b>рейтинг</b></button><button onClick={onSettings}><Settings2 size={25}/><b>настройки</b></button></div><button type="button" className="vx-own-tool-row" onClick={onWallet}><Wallet size={23}/> Мой кошелёк VEYS <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={onCourtship}><MessageCircleHeart size={23}/> Предложения ухаживания <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={editProfile}><Pencil size={23}/> Редактировать анкету <span>→</span></button>{ownMe?.user?.admin_role&&<button type="button" className="vx-own-tool-row" onClick={onAdmin}><ShieldCheck size={23}/> Панель модератора <span>→</span></button>}</section>}
    {key===tab&&<InlineAlert>{error}</InlineAlert>}{key===tab&&error&&!isPreview&&<button type="button" className="vx-profile-retry" onClick={()=>setRetry(n=>n+1)}>Повторить загрузку</button>}
    </div>}
   </MemberSwipePages>
  </div>

  {gallery&&createPortal(<ProfileGallery photos={photos} index={idx} onIndex={setIdx} onClose={()=>setGallery(false)} name={data.name} placeholders={data.photo_placeholders} showHint={galleryHint}/>,document.body)}

  {!isOwn&&reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
  {!isOwn&&more&&createPortal(<div className="vx-member-menu-backdrop" role="presentation" onClick={()=>setMore(false)}><section className="vx-member-popup-menu" role="menu" aria-label="Действия с анкетой" onClick={e=>e.stopPropagation()}><strong>Действия с анкетой</strong><button className="menu-item" role="menuitem" onClick={share}><Icon name="share" tone="pink" size={20}/> Поделиться</button><button className="menu-item" role="menuitem" onClick={()=>{setMore(false);setReportOpen(true)}}><Icon name="info" tone="pink" size={20}/> Пожаловаться</button><button className="menu-item danger" role="menuitem" onClick={()=>{setMore(false);block()}}><Icon name="block" tone="pink" size={20}/> Заблокировать</button><button className="vx-member-menu-close" onClick={()=>setMore(false)}>Закрыть</button></section></div>,document.body)}
 </div>;
}
