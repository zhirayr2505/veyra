import React,{useEffect,useState} from 'react';
import {Crown,Star,Heart,Check,Clock,X,LoaderCircle} from 'lucide-react';
import {api,post} from './api';
import {VeyraIcon} from './graphics';
import './courtship.css';

const cache=new Map();
const translate=(lang,ru,en)=>lang==='en'?en:ru;
const pathFor=target=>'/courtships/profile/'+target;
const keep=(target,data)=>cache.set(String(target),{data,time:Date.now()});
export function CourtshipPanel({targetId,lang='ru',showAction=false}){
 const L=(ru,en)=>translate(lang,ru,en);
 const [data,setData]=useState(()=>cache.get(String(targetId))?.data||null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [confirm,setConfirm]=useState(false),[payConfirm,setPayConfirm]=useState(false);
 const [waiting,setWaiting]=useState(false);
 const load=async(force=false)=>{
  const key=String(targetId),cached=cache.get(key);
  if(!force&&cached&&Date.now()-cached.time<15000){setData(cached.data);return;}
  try{const value=await api(pathFor(targetId));keep(targetId,value);setData(value);setError('');}
  catch{setError(L('Не удалось проверить статус.','Could not check status.'));}
 };
 useEffect(()=>{
  let mounted=true;
  const init=async()=>{const current=cache.get(String(targetId));if(current&&mounted)setData(current.data);await load();};
  init();
  const update=()=>{if(mounted)load(true);};
  window.addEventListener('veyra:courtship-changed',update);
  return()=>{mounted=false;window.removeEventListener('veyra:courtship-changed',update);};
 },[targetId]);
 const mine=data?.mine,suitors=data?.suitors||[];
 const refresh=async()=>{await load(true);window.dispatchEvent(new Event('veyra:courtship-changed'));};
 const apply=async(fn)=>{
  if(busy)return;
  setBusy(true);setError('');
  try{await fn();await refresh();}
  catch(e){setError(e.message==='PAYMENTS_DISABLED'?L('Оплата Stars пока отключена.','Stars payments are currently unavailable.'):
   e.message==='MATCH_REQUIRED'?L('Для ухаживания нужна взаимная симпатия.','A mutual match is required.'):
   L('Не удалось выполнить действие. Попробуй снова.','Could not complete the action. Please retry.'));}
  finally{setBusy(false);}
 };
 const request=()=>apply(async()=>{await post('/courtships/request',{target:String(targetId)});setConfirm(false);});
 const pay=()=>apply(async()=>{
  const result=await post('/courtships/'+mine.id+'/pay',{});
  if(result.status!=='payment_required'||!result.invoice_url)throw Error('INVOICE_UNAVAILABLE');
  setPayConfirm(false);setWaiting(true);
  const tg=window.Telegram?.WebApp;
  if(tg?.openInvoice)tg.openInvoice(result.invoice_url,status=>{
   if(status==='paid'){load(true);}else{setWaiting(false);load(true);}
  });
  else{window.open(result.invoice_url,'_blank','noopener');}
 });
 useEffect(()=>{
  if(!waiting||!mine?.id)return;
  let tries=0;
  const timer=setInterval(async()=>{
   try{
    const state=await api('/courtships/'+mine.id+'/status');
    if(state.status==='active'||state.status==='revoked'||state.status==='cancelled'){
     setWaiting(false);await load(true);window.dispatchEvent(new Event('veyra:courtship-changed'));
    }
   }catch{}
   if(++tries>=25){clearInterval(timer);setWaiting(false);await load(true);}
  },1500);
  return()=>clearInterval(timer);
 },[waiting,mine?.id,targetId]);
 const currentActive=mine?.status==='active'&&new Date(mine.expires_at)>new Date();
 return <div className="vc-courtship">
  {!!suitors.length&&<section className="vc-courtship-public" aria-label={L('Ухажёры','Suitors')}>
   <header><VeyraIcon icon={Crown} size={17}/><strong>{targetId==='me'?L('За мной ухаживают','My suitors'):L('За этим человеком ухаживают','People courting this member')}</strong><span>{suitors.length}</span></header>
   <div className="vc-courtship-list">{suitors.map(s=><span key={s.id} className="vc-courtship-person"><VeyraIcon icon={Heart} size={13}/>{s.sender_name}</span>)}</div>
   <small>{L('Ухаживание подтверждено владельцем профиля и оплачено. Это знак внимания, не отношения.','The profile owner approved this paid attention badge; it is not a relationship status.')}</small>
  </section>}
  {showAction&&<div className="vc-courtship-action">
   {(!mine||['declined','cancelled','revoked'].includes(mine.status)||(mine.status==='active'&&!currentActive))?
    <button className="vc-courtship-start" type="button" disabled={busy||!data} onClick={()=>setConfirm(true)}><VeyraIcon icon={Crown} size={18}/>{L('Стать ухажёром','Become a suitor')}<VeyraIcon icon={Star} size={15}/></button>
   :mine.status==='pending'?<span className="vc-courtship-state"><VeyraIcon icon={Clock} size={17}/>{L('Предложение отправлено. Ожидаем согласия.','Request sent. Waiting for consent.')}</span>
   :mine.status==='accepted'?<button type="button" disabled={busy} className="vc-courtship-start" onClick={()=>setPayConfirm(true)}><VeyraIcon icon={Star} size={18}/>{L('Активировать ухаживание за ','Activate for ')}{data?.stars||99} ⭐</button>
   :mine.status==='payment_pending'?<button type="button" disabled={busy} className="vc-courtship-state is-payment" onClick={()=>setPayConfirm(true)}><VeyraIcon icon={Clock} size={17}/>{L('Ожидаем оплату · открыть снова','Awaiting payment · reopen')}</button>
   :currentActive?<span className="vc-courtship-state is-active"><VeyraIcon icon={Check} size={18}/>{L('Ты ухаживаешь · до ','Courting until ')}{new Date(mine.expires_at).toLocaleDateString(lang==='en'?'en-GB':'ru-RU')}</span>
   :null}
   {['pending','accepted','active'].includes(mine?.status)&&<button type="button" className="vc-courtship-stop" disabled={busy} onClick={()=>apply(()=>post('/courtships/'+mine.id+'/stop',{}))}>{L('Завершить','End')}</button>}
  </div>}
  {error&&<p className="vc-courtship-error" role="alert">{error}</p>}
  {(confirm||payConfirm)&&<div className="vc-courtship-modal" role="dialog" aria-modal="true" aria-label={L('Ухаживание','Courtship')}>
   <div className="vc-courtship-sheet"><VeyraIcon icon={Crown} size={32}/><h3>{payConfirm?L('Подтверди оплату','Confirm payment'):L('Предложить ухаживание','Offer courtship')}</h3>
    <p>{payConfirm?L('После подтверждения Telegram Stars публичный знак внимания действует '+(data?.days||30)+' дней. Автопродления нет.','After Telegram Stars payment, the public badge stays for '+(data?.days||30)+' days. No auto-renewal.'):
     L('Отправим приватное предложение. После согласия можно оплатить звёздами и получить публичную отметку. Получатель может прекратить ухаживание в любое время.','We will send a private request. After acceptance, you can pay Stars to activate a public badge. The recipient can end it anytime.')}</p>
    {payConfirm&&<strong className="vc-courtship-price"><VeyraIcon icon={Star} size={18}/>{data?.stars||99} Stars · {data?.days||30} {L('дней','days')}</strong>}
    <div className="vc-courtship-confirm"><button onClick={()=>{setConfirm(false);setPayConfirm(false);}}>{L('Не сейчас','Not now')}</button>
     <button disabled={busy} onClick={payConfirm?pay:request}>{busy?<VeyraIcon icon={LoaderCircle} size={17} className="spin"/>:null}{payConfirm?L('Оплатить через Telegram','Pay with Telegram'):L('Отправить предложение','Send request')}</button></div>
   </div>
  </div>}
 </div>;
}

export function CourtshipInbox({lang='ru'}){
 const L=(ru,en)=>translate(lang,ru,en);
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(null),[error,setError]=useState('');
 const load=async()=>{try{setRows(await api('/courtships/inbox'));setError('');}catch{setError(L('Не удалось загрузить предложения','Could not load requests'));}};
 useEffect(()=>{load();const onUpdate=()=>load();window.addEventListener('veyra:courtship-changed',onUpdate);return()=>window.removeEventListener('veyra:courtship-changed',onUpdate);},[]);
 const stop=async(c)=>{
  if(busy)return;setBusy(c.id);
  try{await post('/courtships/'+c.id+'/stop',{});setRows(old=>old.filter(row=>row.id!==c.id));window.dispatchEvent(new Event('veyra:courtship-changed'));}
  catch{setError(L('Не удалось завершить ухаживание','Could not end courtship'));}
  finally{setBusy(null);}
 };
 const respond=async(c,accept)=>{
  if(busy)return;setBusy(c.id);
  try{await post('/courtships/'+c.id+'/respond',{accept});setRows(old=>old.filter(row=>row.id!==c.id));window.dispatchEvent(new Event('veyra:courtship-changed'));}
  catch{setError(L('Не удалось ответить','Could not respond'));}
  finally{setBusy(null);}
 };
 if(!rows.length&&!error)return null;
 return <section className="vc-inbox"><h3><VeyraIcon icon={Crown} size={20}/>{L('Предложения об ухаживании','Courtship requests')}</h3>
  <p>{L('Только после согласия и оплаты статус увидят другие. Ты можешь завершить активное ухаживание.','Only after consent and payment can others see a courtship. You can end active courtship.')}</p>
  {rows.map(c=><div key={c.id} className="vc-inbox-row"><div className="vc-inbox-person"><strong>{c.sender_name}</strong>{c.status!=='pending'&&<small>{c.status==='accepted'?L('Предложение принято · ожидаем оплату','Accepted · waiting for payment'):c.status==='payment_pending'?L('Платёж обрабатывается','Payment is processing'):L('Публичный ухажёр','Public suitor')}</small>}</div><div>{c.status==='pending'?<><button disabled={!!busy} onClick={()=>respond(c,false)}><VeyraIcon icon={X} size={15}/>{L('Отклонить','Decline')}</button><button disabled={!!busy} onClick={()=>respond(c,true)}><VeyraIcon icon={Check} size={15}/>{L('Принять','Accept')}</button></>:c.status==='payment_pending'?<span className="vc-inbox-processing">{L('Подтверждение…','Confirming…')}</span>:<button disabled={!!busy} onClick={()=>stop(c)}><VeyraIcon icon={X} size={15}/>{L('Завершить','End')}</button>}</div></div>)}
  {error&&<p className="vc-courtship-error" role="alert">{error}</p>}
 </section>;
}
