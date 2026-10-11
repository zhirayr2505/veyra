import React,{useEffect,useState,useRef} from 'react';
import {MapPin,ShieldCheck} from 'lucide-react';
import './MemberFeed.css';
import {get,post} from './api.js';
import {openInvoice,GiftCollection} from './Extras.jsx';
import {Header,Icon,DetailIcon,InterestIcon,Photo,Button,Sheet,Empty,InlineAlert,Spinner} from './UI.jsx';
import {ProfileHighlights,CatalogueIcon} from './OnboardingOptions.jsx';
export function Member({id,onBack,onChat,onMatch,onGift,onPremium,onWallet,onPaid,initialMatch,viewer}){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[more,setMore]=useState(false),[courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false),[reportOpen,setReportOpen]=useState(false),[reportBusy,setReportBusy]=useState(false),[reportReason,setReportReason]=useState('fake'),[reportDetails,setReportDetails]=useState('');
 const touch=useRef(null),memberTouch=useRef(null),memberSwiped=useRef(false);
 useEffect(()=>{let ok=true;Promise.all([get('/profiles/'+id),get('/courtships/profile/'+id).catch(()=>null)]).then(([r,c])=>{if(ok){setData(r);setCourtship(c)}}).catch(e=>{if(ok)setError(e.message)}).finally(()=>ok&&setLoading(false));return()=>{ok=false}},[id]);
 const requestCourtship=async()=>{if(courtBusy)return;setCourtBusy(true);setError('');try{const mine=courtship?.mine;const r=mine?.status==='accepted'?await post('/courtships/'+mine.id+'/pay',{}):await post('/courtships/request',{target:String(id)});if(r.invoice_url){openInvoice(r.invoice_url)}else if(r.status==='pending'){window.alert('Приглашение отправлено. Статус появится только после согласия.')}if(r.status==='active')await onPaid?.();const c=await get('/courtships/profile/'+id);setCourtship(c)}catch(e){setError(e.message==='INSUFFICIENT_VEYS'?'Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.':e.message)}finally{setCourtBusy(false)}};
 const like=async()=>{try{const r=await post('/reactions',{target:String(id),kind:'like'});if(r.matched)onMatch(r.match_id,data);else onBack()}catch(e){setError(e.message)}};
 const report=async()=>{if(reportBusy)return;setReportBusy(true);setError('');try{await post('/reports',{target:String(id),reason:reportReason,details:reportDetails});setReportOpen(false);onBack()}catch(e){setError('Не удалось отправить жалобу: '+e.message)}finally{setReportBusy(false)}};
 const block=async()=>{if(!window.confirm('Заблокировать пользователя?'))return;try{await post('/blocks',{target:String(id)});onBack()}catch(e){setError(e.message)}};
 const share=async()=>{await navigator.share?.({title:'VEYRA',text:'Анкета в VEYRA'}).catch(()=>{});setMore(false)};
 if(loading)return <div className="page"><Header back={onBack}/><div className="center-loading"><Spinner/></div></div>;
 if(!data)return <div className="page"><Header back={onBack}/><Empty title="Анкета недоступна" body={error}/></div>;
 const match=data.match_id||initialMatch;
 return <div className="member page member-feed-profile"><Header back={onBack} side={<button className="quiet" onClick={()=>setMore(true)}><Icon name="more"/></button>}/>
 <div className="member-photos"
  onTouchStart={e=>{memberTouch.current=e.touches[0]?.clientX??null}}
  onTouchEnd={e=>{if(memberTouch.current===null)return;const dx=e.changedTouches[0].clientX-memberTouch.current;memberTouch.current=null;if(Math.abs(dx)>45&&data.photos?.length>1){memberSwiped.current=true;setIdx(i=>(i+(dx<0?1:-1)+data.photos.length)%data.photos.length);setTimeout(()=>{memberSwiped.current=false},150)}}}>
  <Photo className="member-hero" id={data.photos?.[idx]} onClick={()=>{if(!memberSwiped.current)setGallery(true)}} alt={data.name}/><div className="member-bars">{data.photos?.map((p,i)=><button key={p} className={i===idx?'active':''} onClick={()=>setIdx(i)}/>)}</div><button className="member-prev" onClick={()=>setIdx(i=>(i+data.photos.length-1)%data.photos.length)}>‹</button><button className="member-next" onClick={()=>setIdx(i=>(i+1)%data.photos.length)}>›</button><div className="member-thumbnails">{(data.photos||[]).slice(0,7).map((photo,i)=><button key={photo} type="button" aria-label={'Фото '+(i+1)} className={i===idx?'selected':''} onClick={()=>setIdx(i)}><Photo id={photo} alt=""/></button>)}</div>
 </div>
 <div className="member-summary">
  <div className="member-summary-title"><h2>{data.name}, {data.age}</h2><Icon name="verified" tone="pink" size={21}/></div>
  <p className="member-summary-location"><Icon name="pin" tone="pink" size={15}/>{[data.city,data.country].filter(Boolean).join(', ')}</p>
  {data.online&&<span className="member-summary-online"><DetailIcon name="online" size={12}/> в сети</span>}
  {data.bio&&<p className="member-summary-bio">{data.bio}</p>}
 </div>
 <div className="member-actions member-icon-actions">
 <button type="button" className="member-icon-control" onClick={()=>onGift(data)} aria-label="Подарить подарок"><Icon name="gift" tone="pink" size={26}/><span>подарок</span></button>
 <button type="button" className="member-icon-control main" onClick={()=>match?onChat(match):like()} aria-label={match?'Написать сообщение':'Поставить лайк'}><Icon name={match?'chat':'heart_filled'} tone="white" size={26}/><span>{match?'написать':'нравится'}</span></button>
 {match&&<button type="button" className="member-icon-control" disabled={courtBusy||['active','payment_pending','pending'].includes(courtship?.mine?.status)} onClick={requestCourtship} aria-label={courtship?.mine?.status==='accepted'?'Оплатить ухаживание':'Стать ухажёром'}><Icon name="sparkle" tone="pink" size={26}/><span>{courtship?.mine?.status==='accepted'?'оплатить':'ухаживать'}</span></button>}
 </div>
 {match&&courtship?.mine?.status&&<p className="courtship-status">{courtship.mine.status==='active'?'Ты ухаживаешь за этим человеком':courtship.mine.status==='pending'?'Предложение отправлено · ожидается согласие':courtship.mine.status==='accepted'?'Предложение принято · оплата 990 VEYS':courtship.mine.status==='payment_pending'?'Ожидается подтверждение оплаты':'Ухаживание: '+courtship.mine.status}</p>}
 {error==='Недостаточно VEYS. Пополни кошелёк, чтобы стать ухажёром.'&&<Button kind="outline" className="full" onClick={onWallet}>💎 Пополнить VEYS</Button>}
 {(courtship?.suitors||[]).length>0&&<section className="info-block"><h3>ухажёры <Icon name="heart" tone="pink" size={18}/></h3><p>{courtship.suitors.map(s=>s.sender_name).join(' · ')}</p></section>}
 <div className="profile-badges">{data.popular&&<span><Icon name="heart_filled" tone="pink" size={14}/> популярный</span>}{data.online&&<span><DetailIcon name="online" size={13}/> сейчас онлайн</span>}{data.new_member&&<span><Icon name="sparkle" tone="pink" size={14}/> новенький</span>}</div><section className="info-block"><h3>интересы</h3><div className="interest-grid">{(data.interests||[]).map(x=><span className="tag selected" key={x}><CatalogueIcon value={x} size={16}/>{x}</span>)}</div></section>
 <ProfileHighlights profile={data} viewer={viewer}/><section className="info-block"><h3>о себе</h3><p>{data.bio||'Пока не рассказано'}</p></section><section className="info-block"><h3>коллекция подарков</h3><GiftCollection ownerId={id}/></section><section className="info-block"><h3>фото</h3><div className="photo-gallery-mini">{data.photos?.map((p,i)=><Photo key={p} id={p} onClick={()=>{setIdx(i);setGallery(true)}}/>)}</div></section>
 <InlineAlert>{error}</InlineAlert>
 {gallery&&<div className="gallery" onTouchStart={e=>touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}} onTouchEnd={e=>{if(!touch.current)return;const x=e.changedTouches[0].clientX-touch.current.x,y=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(y)>90&&Math.abs(y)>Math.abs(x))setGallery(false);else if(Math.abs(x)>40)setIdx(i=>(i+(x<0?1:-1)+data.photos.length)%data.photos.length);touch.current=null}}><button className="gallery-close" onClick={()=>setGallery(false)} aria-label="Закрыть"><Icon name="close" tone="white" size={21}/></button><Photo id={data.photos?.[idx]}/><small>{idx+1} / {data.photos.length}</small></div>}
 {reportOpen&&<Sheet title="Пожаловаться" onClose={()=>setReportOpen(false)}><div className="fields"><label>Причина<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option value="fake">Фейковая анкета</option><option value="spam">Спам или реклама</option><option value="harassment">Оскорбления или домогательства</option><option value="underage">Пользователь младше 18 лет</option><option value="explicit">Неподходящие фотографии</option><option value="other">Другая причина</option></select></label><label>Подробности (необязательно)<textarea maxLength={2000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Что произошло?"/></label></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={reportBusy} onClick={report}>отправить жалобу</Button></Sheet>}
 {more&&<Sheet title="Анкета" onClose={()=>setMore(false)}><button className="menu-item" onClick={share}>Поделиться</button><button className="menu-item" onClick={()=>{setMore(false);setReportOpen(true)}}>Пожаловаться</button><button className="menu-item danger" onClick={block}>Заблокировать</button></Sheet>}
 </div>;
}
