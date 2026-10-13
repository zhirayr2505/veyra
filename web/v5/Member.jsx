import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MapPin,Plane,Palette,BookOpen,Music2,Coffee,Clapperboard,Dumbbell,Camera,PawPrint,Gamepad2,UtensilsCrossed,Heart,Footprints,Sparkles,ChevronLeft,ChevronRight,Images,Gift,UsersRound} from 'lucide-react';
import {Logo,Icon,DetailIcon,Photo,Button,Sheet,Empty,InlineAlert,Spinner} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {get,post} from './api.js';
import {openInvoice,GiftCollection} from './Extras.jsx';
import {ProfileHighlights,INTEREST_GROUPS,goalTitle} from './OnboardingOptions.jsx';
import './MemberFeed.css';
import './MemberTelegramProfile.css';

const TABS=[['about','Обо мне'],['photos','Фото'],['gifts','Подарки'],['common','Общее']];
const ICONS_BY_GROUP={'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,'Путешествия':Plane,'Вкус и стиль':Coffee,'Образ жизни':Heart,'Кино и развлечения':Clapperboard,'Спорт и движение':Dumbbell,'Искусство и творчество':Palette,'Еда и напитки':UtensilsCrossed,'Природа и питомцы':PawPrint,'Технологии и игры':Gamepad2,'Саморазвитие':BookOpen,'Город и встречи':Footprints};
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function MemberInterest({label}){const v=String(label||'').toLocaleLowerCase('ru');const direct=v.includes('путешеств')||v.includes('поездк')?Plane:v.includes('искусств')||v.includes('рисова')?Palette:v.includes('книг')?BookOpen:v.includes('фото')?Camera:null;const group=INTEREST_GROUPS.find(x=>x.items.some(y=>y.toLocaleLowerCase('ru')===v));const Glyph=direct||ICONS_BY_GROUP[group?.title]||Sparkles;return <span className="vx-member-interest"><Glyph size={19} strokeWidth={2.1} aria-hidden="true"/>{label}</span>}

export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[more,setMore]=useState(false);
 const [courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false);
 const [reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false);
 const [reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const [tab,setTab]=useState('about'),[direction,setDirection]=useState(1);
 const scrollRef=useRef(null),stageRef=useRef(null),motionRef=useRef(null),touchRef=useRef(null),galleryTouch=useRef(null),rafRef=useRef(0),indexRef=useRef(0);

 useEffect(()=>{let active=true;setLoading(true);setData(null);setTab('about');setIdx(0);Promise.all([get('/profiles/'+id),get('/courtships/profile/'+id).catch(()=>null)]).then(([profile,c])=>{if(active){setData(profile);setCourtship(c)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[id]);
 useEffect(()=>{const root=document.documentElement,body=document.body;const prev=[root.style.overflow,body.style.overflow];root.style.overflow='hidden';body.style.overflow='hidden';return()=>{root.style.overflow=prev[0];body.style.overflow=prev[1];cancelAnimationFrame(rafRef.current)}},[]);

 const animate=useCallback(()=>{
  cancelAnimationFrame(rafRef.current);
  rafRef.current=requestAnimationFrame(()=>{
   const scroller=scrollRef.current,stage=stageRef.current,motion=motionRef.current;
   if(!scroller||!stage||!motion)return;
   const openHeight=stage.getBoundingClientRect().height;
   const compactHeight=parseFloat(getComputedStyle(scroller).getPropertyValue('--vx-profile-compact-height'))||244;
   const delta=Math.max(1,openHeight-compactHeight);
   const progress=clamp(scroller.scrollTop/delta);
   motion.style.setProperty('--vx-collapse',String(progress));
   motion.dataset.state=progress<=.015?'expanded':progress>=.985?'compact':'transition';
   scroller.style.setProperty('--vx-collapse',String(progress));
  })
 },[]);
 useLayoutEffect(()=>{
  if(!data)return;
  animate();
  const obs=typeof ResizeObserver==='function'?new ResizeObserver(animate):null;
  if(stageRef.current)obs?.observe(stageRef.current);
  window.addEventListener('resize',animate,{passive:true});
  window.visualViewport?.addEventListener('resize',animate,{passive:true});
  return()=>{obs?.disconnect();window.removeEventListener('resize',animate);window.visualViewport?.removeEventListener('resize',animate);cancelAnimationFrame(rafRef.current)}
 },[data?.id,animate]);

 const openTab=next=>{
  if(next===tab)return;
  setDirection(TABS.findIndex(x=>x[0]===next)>TABS.findIndex(x=>x[0]===tab)?1:-1);
  setTab(next);
  const scroll=scrollRef.current,stage=stageRef.current;
  if(scroll&&stage){
   const compact=parseFloat(getComputedStyle(scroll).getPropertyValue('--vx-profile-compact-height'))||244;
   const limit=Math.max(0,stage.getBoundingClientRect().height-compact);
   if(scroll.scrollTop<limit)scroll.scrollTo({top:limit,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
 };
 const handleTouchEnd=e=>{
  const start=touchRef.current;touchRef.current=null;
  if(!start||gallery)return;
  const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)<72||Math.abs(dx)<Math.abs(dy)*1.5)return;
  const target=e.target;
  if(target?.closest?.('button,a,input,textarea,select,.photo-gallery-mini,.collection'))return;
  const pos=TABS.findIndex(x=>x[0]===tab),next=clamp(pos+(dx<0?1:-1),0,TABS.length-1);
  if(pos!==next)openTab(TABS[next][0]);
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
 const fullName=data.name+', '+data.age;
 const photosNext=step=>setIdx(n=>(n+step+photos.length)%photos.length);
 return <div className="member page member-feed-profile vx-telegram-member">
  {createPortal(<header className="vx-member-floating-header vx-member-native-header" aria-label="Навигация профиля VEYRA">
   {!window.Telegram?.WebApp?.BackButton&&<button type="button" className="vx-member-fallback-back" onClick={onBack} aria-label="Закрыть профиль"><Icon name="back" tone="pink" size={21}/></button>}
   <Logo width={115} className="vx-member-floating-logo"/>
   <button type="button" className="vx-member-more" aria-label="Действия с анкетой" aria-expanded={more} onClick={()=>setMore(v=>!v)}><Icon name="more" tone="pink" size={21}/></button>
  </header>,document.body)}

  <div className="vx-profile-scroller" ref={scrollRef} onScroll={animate} aria-label={'Профиль '+data.name}>
   <div className="vx-profile-motion" ref={motionRef} data-state="expanded">
    <div className="vx-profile-sticky" aria-hidden="false">
     <div className="vx-profile-hero-photo">
      <Photo id={photos[idx]} alt={data.name} onClick={()=>setGallery(true)}/>
      {photos.length>1&&<div className="vx-profile-photo-bars">{photos.map((p,i)=><button key={p} type="button" className={i===idx?'active':''} onClick={()=>setIdx(i)} aria-label={'Фото '+(i+1)}/>)}</div>}
      {photos.length>1&&<div className="vx-profile-photo-nav">
       <button type="button" onClick={()=>photosNext(-1)} aria-label="Предыдущее фото"><ChevronLeft size={26}/></button>
       <button type="button" onClick={()=>photosNext(1)} aria-label="Следующее фото"><ChevronRight size={26}/></button>
      </div>}
      {data.test_profile&&<span className="vx-profile-demo-badge">ДЕМО</span>}
     </div>

     <section className="vx-profile-identity" aria-label="Информация об анкете">
      <div className="vx-profile-name-row"><h1>{fullName}</h1>{data.test_profile?<span className="vx-demo-member-label">ДЕМО</span>:<Icon name="verified" tone="pink" size={18}/>}</div>
      <div className="vx-profile-location"><CountryFlag country={data.country}/> {data.city}</div>
      {data.goal&&<span className="vx-profile-goal"><Heart size={13}/>{goalTitle(data.goal)}</span>}
     </section>
     <div className="vx-profile-primary-actions" aria-label="Действия с человеком">
      <button type="button" className="vx-profile-action" onClick={()=>onGift(data)} aria-label="Подарить подарок"><Icon name="gift" tone="pink" size={23}/><span>Подарок</span></button>
      <button type="button" className="vx-profile-action primary" onClick={()=>match?onChat(match):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><Icon name={match?'chat':'heart_filled'} tone="white" size={23}/><span>{match?'Написать':'Нравится'}</span></button>
      {match?<button type="button" className="vx-profile-action" onClick={requestCourtship} disabled={courtBusy||['active','payment_pending','pending'].includes(courtship?.mine?.status)} aria-label="Ухаживать"><Icon name="sparkle" tone="pink" size={23}/><span>{courtship?.mine?.status==='accepted'?'Оплатить':'Ухаживать'}</span></button>
       :<button type="button" className="vx-profile-action" onClick={()=>like('super')} aria-label="Суперлайк"><Icon name="star" tone="pink" size={23}/><span>Суперлайк</span></button>}
     </div>
    </div>
   </div>
   <div className="vx-profile-open-spacer" ref={stageRef} aria-hidden="true"/>

   <div className="vx-profile-tab-rail" role="tablist" aria-label="Разделы анкеты">
    {TABS.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>openTab(key)}>{label}</button>)}
   </div>
   <div className="vx-profile-tab-page" role="tabpanel" aria-label={TABS.find(x=>x[0]===tab)?.[1]}
      onTouchStart={e=>{touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}}
      onTouchEnd={handleTouchEnd} data-direction={direction} key={tab}>
    {tab==='about'&&<div className="vx-profile-section-body">
     <section className="vx-profile-surface vx-profile-about">
      <h2>О себе</h2><p>{data.bio||'Пока ничего не рассказал о себе.'}</p>
      {data.test_profile&&<p className="vx-profile-demo-disclaimer">Это вымышленный персонаж для проверки дизайна VEYRA. Фотография иллюстративная.</p>}
     </section>
     <section className="vx-profile-surface"><h2>Интересы</h2>{(data.interests||[]).length?<div className="vx-member-interests-grid">{data.interests.map(label=><MemberInterest key={label} label={label}/>)}</div>:<p className="vx-profile-secondary">Пока не указаны.</p>}</section>
     <section className="vx-profile-surface"><h2>Цель знакомства</h2><div className="vx-profile-goal-detail"><Heart size={18}/>{goalTitle(data.goal)}</div></section>
     {data.online&&<div className="vx-profile-hint"><DetailIcon name="online" size={13}/> Сейчас в сети</div>}
     {match&&courtship?.mine?.status&&<div className="vx-profile-hint">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение ожидает согласия':courtship.mine.status==='accepted'?'Предложение принято, можно оплатить':'Ухаживание: '+courtship.mine.status}</div>}
     <ProfileHighlights profile={data} viewer={viewer} showGoal={false} showCommon={false}/>
    </div>}
    {tab==='photos'&&<div className="vx-profile-section-body"><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Фотографии</h2><span>{photos.length}</span></div>{photos.length?<div className="vx-profile-photos-grid">{photos.map((p,i)=><button type="button" key={p} onClick={()=>{setIdx(i);setGallery(true)}} aria-label={'Открыть фото '+(i+1)}><Photo id={p} alt={'Фото '+(i+1)+' · '+data.name}/></button>)}</div>:<Empty title="Фотографий пока нет"/>}</section></div>}
    {tab==='gifts'&&<div className="vx-profile-section-body"><section className="vx-profile-surface"><div className="vx-profile-section-heading"><h2>Подарки</h2><Gift size={19}/></div><GiftCollection ownerId={id}/></section></div>}
    {tab==='common'&&<div className="vx-profile-section-body">
     <section className="vx-profile-surface"><h2>Что вас объединяет</h2>{common.length||sameGoal?<><p className="vx-profile-secondary">Уже есть повод начать разговор.</p>{common.length>0&&<div className="vx-member-interests-grid">{common.map(label=><MemberInterest label={label} key={label}/>)}</div>}{sameGoal&&<div className="vx-profile-goal-detail"><Heart size={18}/>У вас совпадают цели знакомства</div>}</>:<p className="vx-profile-secondary">Пока общих интересов не нашлось. Узнайте друг друга в общении.</p>}</section>
     {(courtship?.suitors||[]).length>0&&<section className="vx-profile-surface"><h2>Ухажёры</h2><p>{courtship.suitors.map(x=>x.sender_name).join(' · ')}</p></section>}
    </div>}
    <InlineAlert>{error}</InlineAlert>
   </div>
  </div>

  {gallery&&createPortal(<div className="gallery vx-profile-gallery" onTouchStart={e=>{galleryTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{const start=galleryTouch.current;if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>90&&Math.abs(dy)>Math.abs(dx))setGallery(false);else if(Math.abs(dx)>40)photosNext(dx<0?1:-1);galleryTouch.current=null}}>
   <button className="gallery-close" aria-label="Закрыть" onClick={()=>setGallery(false)}><Icon name="close" tone="white" size={21}/></button>
   <Photo id={photos[idx]} alt={data.name}/><small>{idx+1} / {photos.length}</small>
  </div>,document.body)}

  {reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
  {more&&createPortal(<div className="vx-member-menu-backdrop" role="presentation" onClick={()=>setMore(false)}><section className="vx-member-popup-menu" role="menu" aria-label="Действия с анкетой" onClick={e=>e.stopPropagation()}><strong>Действия с анкетой</strong><button className="menu-item" role="menuitem" onClick={share}><Icon name="share" tone="pink" size={20}/> Поделиться</button><button className="menu-item" role="menuitem" onClick={()=>{setMore(false);setReportOpen(true)}}><Icon name="info" tone="pink" size={20}/> Пожаловаться</button><button className="menu-item danger" role="menuitem" onClick={()=>{setMore(false);block()}}><Icon name="block" tone="pink" size={20}/> Заблокировать</button><button className="vx-member-menu-close" onClick={()=>setMore(false)}>Закрыть</button></section></div>,document.body)}
 </div>;
}
