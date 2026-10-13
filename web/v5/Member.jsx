import React,{useEffect,useState,useRef} from 'react';
import {createPortal} from 'react-dom';
import {MapPin,ShieldCheck,Plane,Palette,BookOpen,Music2,Coffee,Clapperboard,Dumbbell,Camera,PawPrint,Gamepad2,UtensilsCrossed,Heart,Footprints,Sparkles} from 'lucide-react';
import {Logo} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import './MemberFeed.css';
import {get,post} from './api.js';
import {openInvoice,GiftCollection} from './Extras.jsx';
import {Header,Icon,DetailIcon,InterestIcon,Photo,Button,Sheet,Empty,InlineAlert,Spinner} from './UI.jsx';
import {ProfileHighlights,CatalogueIcon,INTEREST_GROUPS,goalTitle} from './OnboardingOptions.jsx';
import {InterestReveal} from './InterestReveal.jsx';
const ICONS_BY_GROUP={'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,'Путешествия':Plane,'Вкус и стиль':Coffee,'Образ жизни':Heart,'Кино и развлечения':Clapperboard,'Спорт и движение':Dumbbell,'Искусство и творчество':Palette,'Еда и напитки':UtensilsCrossed,'Природа и питомцы':PawPrint,'Технологии и игры':Gamepad2,'Саморазвитие':BookOpen,'Город и встречи':Footprints};
function MemberInterest({label}){const value=String(label||'').toLocaleLowerCase('ru');const direct=value.includes('путешеств')||value.includes('поездк')||value==='новые города'?Plane:value.includes('искусств')||value.includes('рисова')?Palette:value.includes('книг')?BookOpen:value.includes('фото')?Camera:null;const group=INTEREST_GROUPS.find(group=>group.items.some(name=>name.toLocaleLowerCase('ru')===value));const Glyph=direct||ICONS_BY_GROUP[group?.title]||Sparkles;return <span className="vx-member-interest"><Glyph size={18} strokeWidth={2.15} aria-hidden="true"/><span>{label}</span></span>;}
export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer}){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[more,setMore]=useState(false),[courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false),[reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false),[reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const touch=useRef(null),memberTouch=useRef(null),memberSwiped=useRef(false),photosRef=useRef(null);
 const [headerProgress,setHeaderProgress]=useState(0);
 // Telegram may scroll a nested WebView host, not window. The photo's viewport
 // position reflects either scroller, so animate from its actual displacement.
 useEffect(()=>{
  if(!data)return;
  let raf=0,initialTop=null;
  const update=()=>{
   cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
    const photo=photosRef.current;if(!photo)return;
    const top=photo.getBoundingClientRect().top;
    if(initialTop===null)initialTop=top;
    const scrollRoot=photo.closest('.subscreen');
    const scrollOffset=Math.max(window.scrollY||0,scrollRoot?.scrollTop||0);
    const moved=Math.max(0,(initialTop-top)-24,scrollOffset-24);
    // An image can shift slightly as fonts / Telegram insets settle; consider
    // the original viewport position fully expanded once all scrollers return.
    const restingAtTop=scrollOffset<3&&Math.abs(initialTop-top)<64;
    const progress=restingAtTop?0:Math.min(1,moved/175);
    setHeaderProgress(p=>Math.abs(p-progress)<.015?p:progress);
   });
  };
  update();
  window.addEventListener('scroll',update,{passive:true,capture:true});
  document.addEventListener('scroll',update,{passive:true,capture:true});
  window.addEventListener('resize',update,{passive:true});
  window.visualViewport?.addEventListener('resize',update,{passive:true});
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',update,true);document.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update)};
 },[id,!!data]);
 useEffect(()=>{let ok=true;Promise.all([get('/profiles/'+id),get('/courtships/profile/'+id).catch(()=>null)]).then(([r,c])=>{if(ok){setData(r);setCourtship(c)}}).catch(e=>{if(ok)setError(e.message)}).finally(()=>ok&&setLoading(false));return()=>{ok=false}},[id]);
 const requestCourtship=async()=>{if(courtBusy)return;setCourtBusy(true);setError('');try{const mine=courtship?.mine;const r=mine?.status==='accepted'?await post('/courtships/'+mine.id+'/pay',{}):await post('/courtships/request',{target:String(id)});if(r.invoice_url){openInvoice(r.invoice_url)}else if(r.status==='pending'){window.alert('Приглашение отправлено. Статус появится только после согласия.')}if(r.status==='active')await onPaid?.();const c=await get('/courtships/profile/'+id);setCourtship(c)}catch(e){setError(e.message==='INSUFFICIENT_VEYS'?'Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.':e.message)}finally{setCourtBusy(false)}};
 const like=async(kind='like')=>{try{const r=await post('/reactions',{target:String(id),kind});if(r.matched)onMatch(r.match_id,data);else onBack()}catch(e){if(kind==='super'&&/PREMIUM_REQUIRED|LIMIT_REACHED|INSUFFICIENT/i.test(e.message))onPremium?.();else setError(e.message)}};
 const report=async()=>{if(reportBusy)return;setReportBusy(true);setError('');try{await post('/reports',{target:String(id),reason:reportReason,details:reportDetails});setReportOpen(false);onBack()}catch(e){setError('Не удалось отправить жалобу: '+e.message)}finally{setReportBusy(false)}};
 const block=async()=>{if(!window.confirm('Заблокировать пользователя?'))return;try{await post('/blocks',{target:String(id)});onBack()}catch(e){setError(e.message)}};
 const share=async()=>{await navigator.share?.({title:'VEYRA',text:'Анкета в VEYRA'}).catch(()=>{});setMore(false)};
 if(loading)return <div className="page"><Header back={onBack}/><div className="center-loading"><Spinner/></div></div>;
 if(!data)return <div className="page"><Header back={onBack}/><Empty title="Анкета недоступна" body={error}/></div>;
 const match=data.match_id||initialMatch;
 return <div className="member page member-feed-profile" style={{'--vx-member-collapse':headerProgress}} >
 <header className={"vx-member-floating-header"+(headerProgress>.025?" is-scrolling":"")+(headerProgress>.95?" is-compact":"")} aria-label="Шапка VEYRA">
  {!window.Telegram?.WebApp?.BackButton&&<button className="vx-member-fallback-back" type="button" onClick={onBack} aria-label="Закрыть профиль"><Icon name="back" tone="pink" size={21}/></button>}
  <Logo width={115} className="vx-member-floating-logo"/>
  <button type="button" className="vx-member-more" aria-label="Действия с анкетой" aria-expanded={more} onClick={()=>setMore(v=>!v)}><Icon name="more" tone="pink" size={21}/></button>
  <div className="vx-member-compact-details" aria-hidden={headerProgress<.05}>
   <span className="vx-member-mini-avatar"><Photo id={data.photos?.[0]} alt=""/></span>
   <span className="vx-member-mini-copy"><strong>{data.name}, {data.age}</strong><small><CountryFlag country={data.country}/> {data.city}</small><em>{goalTitle(data.goal)}</em></span>
  </div>
 </header>
 <div className="member-photos" ref={photosRef}
  onTouchStart={e=>{memberTouch.current=e.touches[0]?.clientX??null}}
  onTouchEnd={e=>{if(memberTouch.current===null)return;const dx=e.changedTouches[0].clientX-memberTouch.current;memberTouch.current=null;if(Math.abs(dx)>45&&data.photos?.length>1){memberSwiped.current=true;setIdx(i=>(i+(dx<0?1:-1)+data.photos.length)%data.photos.length);setTimeout(()=>{memberSwiped.current=false},150)}}}>
  <Photo className="member-hero" id={data.photos?.[idx]} onClick={()=>{if(!memberSwiped.current)setGallery(true)}} alt={data.name}/>{data.photos?.length>1&&<div className="member-bars">{data.photos?.map((p,i)=><button key={p} className={i===idx?'active':''} onClick={()=>setIdx(i)}/>)}</div>}{data.photos?.length>1&&<React.Fragment><button className="member-prev" onClick={()=>setIdx(i=>(i+data.photos.length-1)%data.photos.length)}>‹</button><button className="member-next" onClick={()=>setIdx(i=>(i+1)%data.photos.length)}>›</button></React.Fragment>}<div className="member-thumbnails">{(data.photos||[]).slice(0,7).map((photo,i)=><button key={photo} type="button" aria-label={'Фото '+(i+1)} className={i===idx?'selected':''} onClick={()=>setIdx(i)}><Photo id={photo} alt=""/></button>)}</div>
 </div>
 <div className="member-summary">
  <div className="member-summary-title"><h2>{data.name}, {data.age}</h2>{data.test_profile?<span className="vx-demo-member-label">ДЕМО</span>:<Icon name="verified" tone="pink" size={21}/>}</div>
  {data.test_profile&&<p className="vx-demo-disclaimer">Это вымышленный персонаж для проверки дизайна VEYRA. Фотография иллюстративная.</p>}
  <div className="vx-member-place-goal"><p className="member-summary-location"><Icon name="pin" tone="pink" size={15}/><CountryFlag country={data.country}/> {data.city}</p><span className="vx-member-goal"><Heart size={14} strokeWidth={2.2} aria-hidden="true"/>{goalTitle(data.goal)}</span></div>
  {data.online&&<span className="member-summary-online"><DetailIcon name="online" size={12}/> в сети</span>}
  {data.bio&&<p className="member-summary-bio">{data.bio}</p>}
 </div>
 <div className="member-actions member-icon-actions">
 <button type="button" className="member-icon-control" onClick={()=>onGift(data)} aria-label="Подарить подарок"><Icon name="gift" tone="pink" size={26}/><span>подарок</span></button>
 <button type="button" className="member-icon-control main" onClick={()=>match?onChat(match):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><Icon name={match?'chat':'heart_filled'} tone="white" size={26}/><span>{match?'написать':'нравится'}</span></button>
 {!match&&<button type="button" className="member-icon-control vx-member-super" onClick={()=>like('super')} aria-label="Суперлайк"><Icon name="star" tone="pink" size={27}/><span>суперлайк</span></button>}
 {match&&<button type="button" className="member-icon-control" disabled={courtBusy||['active','payment_pending','pending'].includes(courtship?.mine?.status)} onClick={requestCourtship} aria-label={courtship?.mine?.status==='accepted'?'Оплатить ухаживание':'Стать ухажёром'}><Icon name="sparkle" tone="pink" size={26}/><span>{courtship?.mine?.status==='accepted'?'оплатить':'ухаживать'}</span></button>}
 </div>
 {match&&courtship?.mine?.status&&<p className="courtship-status">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение отправлено · ожидается согласие':courtship.mine.status==='accepted'?'Предложение принято · оплата 990 VEYS':courtship.mine.status==='payment_pending'?'Ожидается подтверждение оплаты':'Ухаживание: '+courtship.mine.status}</p>}
 {error==='Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.'&&<Button kind="outline" className="full" onClick={onWallet}>💎 Пополнить VEYS</Button>}
 {(courtship?.suitors||[]).length>0&&<section className="info-block"><h3>ухажёры <Icon name="heart" tone="pink" size={18}/></h3><p>{courtship.suitors.map(s=>s.sender_name).join(' · ')}</p></section>}
 <div className="profile-badges">{data.popular&&<span><Icon name="heart_filled" tone="pink" size={14}/> популярный</span>}{data.online&&<span><DetailIcon name="online" size={13}/> сейчас онлайн</span>}{data.new_member&&<span><Icon name="sparkle" tone="pink" size={14}/> новенький</span>}</div><section className="info-block vx-member-interests-card"><h3>интересы</h3><div className="interest-grid vx-member-interests-grid">{(data.interests||[]).map(label=><MemberInterest label={label} key={label}/>)}</div></section>
 <ProfileHighlights profile={data} viewer={viewer} showGoal={false}/><section className="info-block"><h3>о себе</h3><p>{data.bio||'Пока не рассказано'}</p></section><section className="info-block"><h3>коллекция подарков</h3><GiftCollection ownerId={id}/></section><section className="info-block"><h3>фото</h3><div className="photo-gallery-mini">{data.photos?.map((p,i)=><Photo key={p} id={p} onClick={()=>{setIdx(i);setGallery(true)}}/>)}</div></section>
 <InlineAlert>{error}</InlineAlert>
 {gallery&&<div className="gallery" onTouchStart={e=>touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}} onTouchEnd={e=>{if(!touch.current)return;const x=e.changedTouches[0].clientX-touch.current.x,y=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(y)>90&&Math.abs(y)>Math.abs(x))setGallery(false);else if(Math.abs(x)>40)setIdx(i=>(i+(x<0?1:-1)+data.photos.length)%data.photos.length);touch.current=null}}><button className="gallery-close" onClick={()=>setGallery(false)} aria-label="Закрыть"><Icon name="close" tone="white" size={21}/></button><Photo id={data.photos?.[idx]}/><small>{idx+1} / {data.photos.length}</small></div>}
 {reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
 {more&&createPortal(<div className="vx-member-menu-backdrop" role="presentation" onClick={()=>setMore(false)}><section className="vx-member-popup-menu" role="menu" aria-label="Действия с анкетой" onClick={e=>e.stopPropagation()}><strong>Действия с анкетой</strong><button type="button" role="menuitem" className="menu-item" onClick={share}><Icon name="share" tone="pink" size={20}/> Поделиться</button><button type="button" role="menuitem" className="menu-item" onClick={()=>{setMore(false);setReportOpen(true)}}><Icon name="info" tone="pink" size={20}/> Пожаловаться</button><button type="button" role="menuitem" className="menu-item danger" onClick={()=>{setMore(false);block()}}><Icon name="block" tone="pink" size={20}/> Заблокировать</button><button type="button" className="vx-member-menu-close" onClick={()=>setMore(false)}>Закрыть</button></section></div>,document.body)}
 </div>;
}
