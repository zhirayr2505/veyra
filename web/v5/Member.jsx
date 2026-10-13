import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MapPin,Plane,Palette,BookOpen,Music2,Coffee,Clapperboard,Dumbbell,Camera,PawPrint,Gamepad2,UtensilsCrossed,Heart,Footprints,Sparkles,ChevronLeft,ChevronRight,Images,Gift,UsersRound} from 'lucide-react';
import {Logo,Icon,DetailIcon,Photo,Button,Sheet,Empty,InlineAlert,Spinner} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {get,post} from './api.js';
import {openInvoice,GiftCollection,OwnerTestTools} from './Extras.jsx';
import {ProfileHighlights,INTEREST_GROUPS,goalTitle} from './OnboardingOptions.jsx';
import './MemberFeed.css';
import './MemberTelegramProfile.css';
import {VeyraPackIcon,interestGlyph} from './VeyraPackIcons.jsx';
import {useVeyraProfileMotion} from './useVeyraProfileMotion.js';
import {MemberSwipePages} from './MemberSwipePages.jsx';
import {Pencil,Settings2,Wallet,ShieldCheck,Crown,Medal,ImagePlus,MessageCircleHeart} from 'lucide-react';

const TABS=[['about','Обо мне'],['photos','Фото'],['gifts','Подарки'],['common','Общее']];
const ICONS_BY_GROUP={'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,'Путешествия':Plane,'Вкус и стиль':Coffee,'Образ жизни':Heart,'Кино и развлечения':Clapperboard,'Спорт и движение':Dumbbell,'Искусство и творчество':Palette,'Еда и напитки':UtensilsCrossed,'Природа и питомцы':PawPrint,'Технологии и игры':Gamepad2,'Саморазвитие':BookOpen,'Город и встречи':Footprints};
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function MemberInterest({label}){return <span className="vx-member-interest"><VeyraPackIcon name={interestGlyph(label)} size={19}/><span>{label}</span></span>}

export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer,ownMe=null,onEdit,onSettings,onCollection,onRanking,onCourtship,onAdmin}){
 const isOwn=!!ownMe;
 const tabs=isOwn?[['about','Обо мне'],['photos','Фото'],['gifts','Подарки'],['common','Ещё']]:TABS;
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[more,setMore]=useState(false);
 const [courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false);
 const [reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false);
 const [reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const [tab,setTab]=useState('about');
 const scrollRef=useRef(null),stageRef=useRef(null),motionRef=useRef(null),galleryTouch=useRef(null);
 const swipeApiRef=useRef(null),tabRailRef=useRef(null);
 const moveTabIndicator=useCallback(position=>{
  const underline=tabRailRef.current?.querySelector('.vx-tab-underline');
  if(underline)underline.style.transform='translate3d('+(position*100).toFixed(3)+'%,0,0)';
 },[]);
 const {onScroll:handleScroll,onTouchStart:motionTouchStart,onTouchEnd:motionTouchEnd,onWheel:motionWheel,compactForTab}=useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready:!!data});

 useEffect(()=>{let active=true;setLoading(true);setData(null);setTab('about');setIdx(0);
  if(ownMe){const p=ownMe.profile||{};const year=p.birth_year||p.year_of_birth;setData({...p,id:p.id||ownMe.user?.id,photos:(ownMe.photos||[]).map(x=>x.id),age:p.age||(year?new Date().getFullYear()-Number(year):null),online:false});setLoading(false);return()=>{active=false}}
  Promise.all([get('/profiles/'+id),get('/courtships/profile/'+id).catch(()=>null)]).then(([profile,c])=>{if(active){setData(profile);setCourtship(c)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}
 },[id,ownMe]);
 useEffect(()=>{if(isOwn)return;const root=document.documentElement,body=document.body;const prev=[root.style.overflow,body.style.overflow];root.style.overflow='hidden';body.style.overflow='hidden';return()=>{root.style.overflow=prev[0];body.style.overflow=prev[1]}},[isOwn]);

 const openTab=next=>{
  const index=tabs.findIndex(([key])=>key===next);
  if(index<0)return;
  // A tab tap is allowed to reveal the compact profile. Horizontal
  // finger-swipes never start a competing vertical animation.
  compactForTab();
  if(swipeApiRef.current)swipeApiRef.current.scrollTo(index);
  else setTab(next);
 };
 const requestCourtship=async()=>{
  if(courtBusy)return;setCourtBusy(true);setError('');
  try{const mine=courtship?.mine;const r=mine?.status==='accepted'?await post('/courtships/'+mine.id+'/pay',{}):await post('/courtships/request',{target:String(id)});if(r.invoice_url){openInvoice(r.invoice_url)}else if(r.status==='pending')window.alert('Приглашение отправлено. Статус появится только после согласия.');if(r.status==='active')await onPaid?.();setCourtship(await get('/courtships/profile/'+id))}catch(e){setError(e.message==='INSUFFICIENT_VEYS'?'Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.':e.message)}finally{setCourtBusy(false)}
 };
 const like=async(kind='like')=>{try{const r=await post('/reactions',{target:String(id),kind});if(r.matched)onMatch(r.match_id,data);else onBack()}catch(e){if(kind==='super'&&/PREMIUM_REQUIRED|LIMIT_REACHED|INSUFFICIENT/i.test(e.message))onPremium?.();else setError(e.message)}};
 const report=async()=>{if(reportBusy)return;setReportBusy(true);setError('');try{await post('/reports',{target:String(id),reason:reportReason,details:reportDetails});setReportOpen(false);onBack()}catch(e){setError('Не удалось отправить жалобу: '+e.message)}finally{setReportBusy(false)}};
 const block=async()=>{if(!window.confirm('Заблокировать пользователя?'))return;try{await post('/blocks',{target:String(id)});onBack()}catch(e){setError(e.message)}};
 const share=async()=>{try{await navigator.share?.({title:'VEYRA',text:'Анкета в VEYRA'})}catch{}setMore(false)};
 if(loading)return <div className="page"><div className="center-loading"><Spinner/></div></div>;
 if(!data)return <div className="page"><Empty title="Анкета недоступна" body={error}/><Button onClick={onBack}>вернуться</Button></div>;
 const match=data.match_id||initialMatch,photos=data.photos||[];
 const myInterests=viewer?.interests||[],common=(data.interests||[]).filter(i=>myInterests.includes(i));
 const sameGoal=!!(viewer?.goal&&viewer.goal!=='unsure'&&data.goal===viewer.goal);
 const fullName=(data.name||'Профиль')+(data.age?', '+data.age:'');
 const photosNext=step=>setIdx(n=>(n+step+photos.length)%photos.length);
 return <div className={'member page member-feed-profile vx-telegram-member vx-master-profile'+(isOwn?' vx-own-member own-profile':'')}>
  {createPortal(<header className="vx-member-floating-header vx-member-native-header" aria-label="Навигация профиля VEYRA">
   {(isOwn||!window.Telegram?.WebApp?.BackButton)&&<button type="button" className="vx-member-fallback-back" onClick={onBack} aria-label="Закрыть профиль"><Icon name="back" tone="pink" size={21}/></button>}
   <Logo width={115} className="vx-member-floating-logo"/>
  </header>,document.body)}

  <div className="vx-profile-scroller" ref={scrollRef} onScroll={handleScroll} onTouchStart={motionTouchStart} onTouchEnd={motionTouchEnd} onWheel={motionWheel} aria-label={'Профиль '+data.name}>
   <div className="vx-profile-motion" ref={motionRef} data-state="expanded">
    <div className="vx-profile-sticky" aria-hidden="false">
     <div className="vx-profile-hero-photo">
      <Photo id={photos[idx]} alt={data.name} onClick={()=>setGallery(true)}/>
      {photos.length>1&&<div className="vx-profile-photo-bars">{photos.map((p,i)=><button key={p} type="button" className={i===idx?'active':''} onClick={()=>setIdx(i)} aria-label={'Фото '+(i+1)}/>)}</div>}
      {photos.length>1&&<div className="vx-profile-photo-nav">
       <button type="button" onClick={()=>photosNext(-1)} aria-label="Предыдущее фото"><ChevronLeft size={26}/></button>
       <button type="button" onClick={()=>photosNext(1)} aria-label="Следующее фото"><ChevronRight size={26}/></button>
      </div>}
      {data.test_profile&&!isOwn&&<span className="vx-profile-demo-badge">ДЕМО</span>}
      {data.online&&<span className="vx-profile-online" aria-label="В сети" title="В сети"/>}
     </div>

     <section className="vx-profile-identity" aria-label="Информация об анкете">
      <div className="vx-profile-name-row"><h1>{fullName}</h1>{data.test_profile&&!isOwn?<span className="vx-demo-member-label">ДЕМО</span>:data.verified?<Icon name="verified" tone="pink" size={18}/>:null}</div>
      <div className="vx-profile-location"><CountryFlag country={data.country}/> {data.city}</div>
      {data.goal&&<span className="vx-profile-goal"><Heart size={13}/>{goalTitle(data.goal)}</span>}
     </section>
     {isOwn?<div className="vx-profile-primary-actions vx-own-profile-actions" aria-label="Управление моим профилем">
      <button type="button" className="vx-profile-action" onClick={()=>openTab('photos')}><ImagePlus size={20}/><span>Мои фото</span></button>
      <button type="button" className="vx-profile-action primary" onClick={onEdit}><Pencil size={20}/><span>Изменить</span></button>
      <button type="button" className="vx-profile-action" onClick={onSettings}><Settings2 size={20}/><span>Настройки</span></button>
     </div>:<div className="vx-profile-primary-actions" aria-label="Действия с человеком">
      <button type="button" className="vx-profile-action" onClick={()=>onGift(data)} aria-label="Подарить подарок"><VeyraPackIcon name="gift" size={21}/><span>Подарок</span></button>
      <button type="button" className="vx-profile-action primary" onClick={()=>match?onChat(match):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><VeyraPackIcon name={match?'chat':'heart'} size={21} filled={!match}/><span>{match?'Написать':'Нравится'}</span></button>
      {match?<button type="button" className="vx-profile-action" onClick={requestCourtship} disabled={courtBusy||['active','payment_pending','pending'].includes(courtship?.mine?.status)} aria-label="Ухаживать"><VeyraPackIcon name="courtship" size={21}/><span>{courtship?.mine?.status==='accepted'?'Оплатить':'Ухаживать'}</span></button>
       :<button type="button" className="vx-profile-action" onClick={()=>like('super')} aria-label="Суперлайк"><VeyraPackIcon name="star" size={21} filled/><span>Суперлайк</span></button>}
      </div>}
      {isOwn
       ? <button type="button" className="vx-profile-card-more" aria-label="Настройки" onClick={onSettings}><Settings2 size={21}/></button>
       : <button type="button" className="vx-profile-card-more" aria-label="Действия с анкетой" aria-expanded={more} onClick={()=>setMore(v=>!v)}><Icon name="more" tone="pink" size={20}/></button>}
     </div>
    </div>
    <div className="vx-profile-open-spacer" ref={stageRef} aria-hidden="true"/>

   <div className="vx-profile-tab-rail" role="tablist" aria-label="Разделы анкеты" ref={tabRailRef}>
    {tabs.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} aria-controls={'vx-profile-panel-'+key} className={tab===key?'active':''} onClick={()=>openTab(key)}>{label}</button>)}
    <span className="vx-tab-underline" aria-hidden="true"/>
   </div>
   <MemberSwipePages tabs={tabs} active={tab} onChange={setTab} onProgress={moveTabIndicator} carouselApiRef={swipeApiRef}>
    {key=><div className="vx-profile-section-body">
    {key==='about'&&<>
     <section className="vx-profile-surface vx-profile-about">
      <div className="vx-own-section-heading"><h2>О себе</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить описание"><Pencil size={17}/></button>}</div><p>{data.bio||'Пока ничего не рассказал о себе.'}</p>
      {data.test_profile&&!isOwn&&<p className="vx-profile-demo-disclaimer">Это вымышленный персонаж для проверки дизайна VEYRA. Фотография иллюстративная.</p>}
     </section>
     <section className="vx-profile-surface"><div className="vx-own-section-heading"><h2>Интересы</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить интересы"><Pencil size={17}/></button>}</div>{(data.interests||[]).length?<div className="vx-member-interests-grid">{data.interests.map(label=><MemberInterest key={label} label={label}/>)}</div>:<p className="vx-profile-secondary">Пока не указаны.</p>}</section>
     <section className="vx-profile-surface"><div className="vx-own-section-heading"><h2>Цель знакомства</h2>{isOwn&&<button type="button" onClick={onEdit} aria-label="Изменить цель знакомства"><Pencil size={17}/></button>}</div><div className="vx-profile-goal-detail"><VeyraPackIcon name="goal" size={20}/><div><small>Моя цель на VEYRA</small><strong>{goalTitle(data.goal)}</strong></div></div></section>
     {data.online&&<div className="vx-profile-hint"><DetailIcon name="online" size={13}/> Сейчас в сети</div>}
     {match&&courtship?.mine?.status&&<div className="vx-profile-hint">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение ожидает согласия':courtship.mine.status==='accepted'?'Предложение принято, можно оплатить':'Ухаживание: '+courtship.mine.status}</div>}
     <ProfileHighlights profile={data} viewer={viewer} showGoal={false} showCommon={false}/>
    </>}
    {key==='photos'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Фотографии</h2>{isOwn&&<button className="vx-own-pencil" type="button" aria-label="Изменить фотографии" onClick={onEdit}><Pencil size={17}/></button>}<span>{photos.length}</span></div>{photos.length?<div className="vx-profile-photos-grid">{photos.map((p,i)=><button type="button" key={p} onClick={()=>{setIdx(i);setGallery(true)}} aria-label={'Открыть фото '+(i+1)}><Photo id={p} alt={'Фото '+(i+1)+' · '+data.name}/></button>)}</div>:<Empty title="Фотографий пока нет"/>}</section></>}
    {key==='gifts'&&<><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Подарки</h2><Gift size={19}/></div><GiftCollection ownerId={isOwn?'me':id}/></section></>}
    {key==='common'&&!isOwn&&<>
     <section className="vx-profile-surface"><h2>Что вас объединяет</h2>{common.length||sameGoal?<><p className="vx-profile-secondary">Уже есть повод начать разговор.</p>{common.length>0&&<div className="vx-member-interests-grid">{common.map(label=><MemberInterest label={label} key={label}/>)}</div>}{sameGoal&&<div className="vx-profile-goal-detail"><VeyraPackIcon name="heart" size={18}/>У вас совпадают цели знакомства</div>}</>:<p className="vx-profile-secondary">Пока общих интересов не нашлось. Узнайте друг друга в общении.</p>}</section>
     {(courtship?.suitors||[]).length>0&&<section className="vx-profile-surface"><h2>Ухажёры</h2><p>{courtship.suitors.map(x=>x.sender_name).join(' · ')}</p></section>}
    </>}
    {key==='common'&&isOwn&&<section className="vx-profile-surface vx-own-tools" aria-label="Мои возможности"><h2>Мой VEYRA</h2><div className="own-shortcuts"><button onClick={onPremium}><Crown size={25}/><b>Premium</b></button><button onClick={onCollection}><VeyraPackIcon name="gift" size={25}/><b>подарки</b></button><button onClick={onRanking}><Medal size={25}/><b>рейтинг</b></button><button onClick={onSettings}><Settings2 size={25}/><b>настройки</b></button></div><button type="button" className="vx-own-tool-row" onClick={onWallet}><Wallet size={23}/> Мой кошелёк VEYS <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={onCourtship}><MessageCircleHeart size={23}/> Предложения ухаживания <span>→</span></button><button type="button" className="vx-own-tool-row" onClick={onEdit}><Pencil size={23}/> Редактировать анкету <span>→</span></button>{ownMe.user?.admin_role&&<button type="button" className="vx-own-tool-row" onClick={onAdmin}><ShieldCheck size={23}/> Панель модератора <span>→</span></button>}{ownMe.user?.admin_role==='owner'&&<OwnerTestTools/>}</section>}
    {key===tab&&<InlineAlert>{error}</InlineAlert>}
    </div>}
   </MemberSwipePages>
  </div>

  {gallery&&createPortal(<div className="gallery vx-profile-gallery" onTouchStart={e=>{galleryTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{const start=galleryTouch.current;if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>90&&Math.abs(dy)>Math.abs(dx))setGallery(false);else if(Math.abs(dx)>40)photosNext(dx<0?1:-1);galleryTouch.current=null}}>
   <button className="gallery-close" aria-label="Закрыть" onClick={()=>setGallery(false)}><Icon name="close" tone="white" size={21}/></button>
   <Photo id={photos[idx]} alt={data.name}/><small>{idx+1} / {photos.length}</small>
  </div>,document.body)}

  {!isOwn&&reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
  {!isOwn&&more&&createPortal(<div className="vx-member-menu-backdrop" role="presentation" onClick={()=>setMore(false)}><section className="vx-member-popup-menu" role="menu" aria-label="Действия с анкетой" onClick={e=>e.stopPropagation()}><strong>Действия с анкетой</strong><button className="menu-item" role="menuitem" onClick={share}><Icon name="share" tone="pink" size={20}/> Поделиться</button><button className="menu-item" role="menuitem" onClick={()=>{setMore(false);setReportOpen(true)}}><Icon name="info" tone="pink" size={20}/> Пожаловаться</button><button className="menu-item danger" role="menuitem" onClick={()=>{setMore(false);block()}}><Icon name="block" tone="pink" size={20}/> Заблокировать</button><button className="vx-member-menu-close" onClick={()=>setMore(false)}>Закрыть</button></section></div>,document.body)}
 </div>;
}
