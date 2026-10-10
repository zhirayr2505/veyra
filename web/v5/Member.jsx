import React,{useEffect,useState,useRef} from 'react';
import {get,post} from './api.js';
import {openInvoice} from './Extras.jsx';
import {Header,Icon,Photo,Button,Sheet,Empty,InlineAlert,Spinner} from './UI.jsx';
export function Member({id,onBack,onChat,onMatch,onGift,onPremium,initialMatch}){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[idx,setIdx]=useState(0),[gallery,setGallery]=useState(false),[more,setMore]=useState(false),[courtship,setCourtship]=useState(null),[courtBusy,setCourtBusy]=useState(false);
 const touch=useRef(null);
 useEffect(()=>{let ok=true;Promise.all([get('/profiles/'+id),get('/courtships/profile/'+id)]).then(([r,c])=>{if(ok){setData(r);setCourtship(c)}}).catch(e=>{if(ok)setError(e.message)}).finally(()=>ok&&setLoading(false));return()=>{ok=false}},[id]);
 const requestCourtship=async()=>{if(courtBusy)return;setCourtBusy(true);setError('');try{const mine=courtship?.mine;const r=mine?.status==='accepted'?await post('/courtships/'+mine.id+'/pay',{}):await post('/courtships/request',{target:String(id)});if(r.invoice_url){openInvoice(r.invoice_url)}else if(r.status==='pending'){window.alert('Приглашение отправлено. Статус появится только после согласия.')}const c=await get('/courtships/profile/'+id);setCourtship(c)}catch(e){setError(e.message)}finally{setCourtBusy(false)}};
 const like=async()=>{try{const r=await post('/reactions',{target:String(id),kind:'like'});if(r.matched)onMatch(r.match_id,data);else onBack()}catch(e){setError(e.message)}};
 const report=async()=>{const reason=window.prompt('Причина жалобы: fake, spam, harassment, underage, explicit, other','fake');if(!reason)return;try{await post('/reports',{target:String(id),reason,details:''});setMore(false);onBack()}catch(e){setError(e.message)}};
 const block=async()=>{if(!window.confirm('Заблокировать пользователя?'))return;try{await post('/blocks',{target:String(id)});onBack()}catch(e){setError(e.message)}};
 const share=async()=>{await navigator.share?.({title:'VEYRA',text:'Анкета в VEYRA'}).catch(()=>{});setMore(false)};
 if(loading)return <div className="page"><Header back={onBack}/><div className="center-loading"><Spinner/></div></div>;
 if(!data)return <div className="page"><Header back={onBack}/><Empty title="Анкета недоступна" body={error}/></div>;
 const match=data.match_id||initialMatch;
 return <div className="member page"><Header back={onBack} side={<button className="quiet" onClick={()=>setMore(true)}><Icon name="more"/></button>}/>
 <div className="member-photos"><Photo className="member-hero" id={data.photos?.[idx]} onClick={()=>setGallery(true)} alt={data.name}/><div className="member-bars">{data.photos?.map((p,i)=><button key={p} className={i===idx?'active':''} onClick={()=>setIdx(i)}/>)}</div><button className="member-prev" onClick={()=>setIdx(i=>Math.max(0,i-1))}>‹</button><button className="member-next" onClick={()=>setIdx(i=>Math.min(data.photos.length-1,i+1))}>›</button><div className="member-caption"><h2>{data.name}, {data.age}</h2><span>{data.city}, {data.country}</span></div></div>
 <div className="member-actions"><Button kind="outline" onClick={()=>onGift(data)}><Icon name="gift" tone="pink"/> подарок</Button><Button onClick={()=>match?onChat(match):like()}><Icon name={match?'chat':'heart_filled'} tone="white"/> {match?'сообщение':'лайк'}</Button></div>
 {match&&<div className="courtship-row"><button disabled={courtBusy||['active','payment_pending','pending'].includes(courtship?.mine?.status)} onClick={requestCourtship}>💜 {courtship?.mine?.status==='active'?'ухаживание активно':courtship?.mine?.status==='pending'?'ожидаем согласия':courtship?.mine?.status==='accepted'?'оплатить 99 ⭐':courtship?.mine?.status==='payment_pending'?'ожидается оплата':'стать ухажёром'}</button></div>}
 {(courtship?.suitors||[]).length>0&&<section className="info-block"><h3>ухажёры 💜</h3><p>{courtship.suitors.map(s=>s.sender_name).join(' · ')}</p></section>}
 <div className="profile-badges">{data.popular&&<span>💗 популярный</span>}{data.online&&<span>🟢 сейчас онлайн</span>}{data.new_member&&<span>✨ новенький</span>}</div><section className="info-block"><h3>интересы</h3><div className="interest-grid">{(data.interests||[]).map(x=><span className="tag selected" key={x}>{x}</span>)}</div></section>
 <section className="info-block"><h3>о себе</h3><p>{data.bio||'Пока не рассказано'}</p></section><section className="info-block"><h3>фото</h3><div className="photo-gallery-mini">{data.photos?.map((p,i)=><Photo key={p} id={p} onClick={()=>{setIdx(i);setGallery(true)}}/>)}</div></section>
 <InlineAlert>{error}</InlineAlert>
 {gallery&&<div className="gallery" onTouchStart={e=>touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}} onTouchEnd={e=>{if(!touch.current)return;const x=e.changedTouches[0].clientX-touch.current.x,y=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(y)>90&&Math.abs(y)>Math.abs(x))setGallery(false);else if(Math.abs(x)>40)setIdx(i=>Math.min(data.photos.length-1,Math.max(0,i+(x<0?1:-1))));touch.current=null}}><button className="gallery-close" onClick={()=>setGallery(false)} aria-label="Закрыть">×</button><Photo id={data.photos?.[idx]}/><small>{idx+1} / {data.photos.length}</small></div>}
 {more&&<Sheet title="Анкета" onClose={()=>setMore(false)}><button className="menu-item" onClick={share}>Поделиться</button><button className="menu-item" onClick={report}>Пожаловаться</button><button className="menu-item danger" onClick={block}>Заблокировать</button></Sheet>}
 </div>;
}
