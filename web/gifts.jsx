import React,{useState,useEffect,useCallback} from 'react';
import {createPortal} from 'react-dom';
import {Gift,Star,Check,ArrowLeft,X,Heart,Lock,RefreshCw} from 'lucide-react';
import {api,post} from './api';
import './gifts.css';
const catalogCache={data:null,promise:null};
const collectionCache=new Map();
const apiCatalog=()=>catalogCache.data?Promise.resolve(catalogCache.data):catalogCache.promise||(catalogCache.promise=api('/gifts/catalog').then(r=>(catalogCache.data=r,catalogCache.promise=null,r)).catch(e=>{catalogCache.promise=null;throw e;}));
const language=(lang,ru,en)=>lang==='en'?en:ru;
function GiftArt({gift,size='normal'}){return <span className={'vg-art '+size+' rarity-'+(gift.rarity||'classic')} aria-hidden="true"><span className="vg-art-orbit"/><span className="vg-art-emoji">{gift.emoji||'🎁'}</span><span className="vg-art-shine"/></span>;}
export function GiftCollection({ownerId='me',lang='ru',compact=false}){
 const [state,setState]=useState(()=>collectionCache.get(String(ownerId))?.data||null);
 const [error,setError]=useState(false);
 const load=useCallback(async(force=false)=>{
  const key=String(ownerId),cached=collectionCache.get(key);
  if(!force&&cached&&Date.now()-cached.time<15000){setState(cached.data);return;}
  try{const data=await api('/gifts/collection/'+ownerId);collectionCache.set(key,{data,time:Date.now()});setState(data);setError(false);}
  catch{setError(true);}
 },[ownerId]);
 useEffect(()=>{let mounted=true;
  const cached=collectionCache.get(String(ownerId));if(mounted&&cached)setState(cached.data);
  load();
  const update=()=>load(true);
  window.addEventListener('veyra:gift-delivered',update);
  return()=>{mounted=false;window.removeEventListener('veyra:gift-delivered',update);};
 },[load,ownerId]);
 const L=(ru,en)=>language(lang,ru,en);
 return <section className={'vg-collection '+(compact?'compact':'')} aria-label={L('Коллекция подарков','Gift collection')}>
  <div className="vg-collection-heading"><div><span className="vg-eyebrow">VEYRA GIFTS</span><h2>{L('Коллекция подарков','Gift collection')}</h2><p>{L('Знаки внимания, которые остаются с тобой','Moments of affection to keep')}</p></div><span className="vg-total"><Gift size={19}/>{state?.total??0}</span></div>
  {!state&&!error?<div className="vg-collection-loading" role="status">{L('Открываем коллекцию…','Opening collection…')}</div>
  :error&&!state?<div className="vg-collection-empty"><p>{L('Не получилось загрузить подарки','Could not load gifts')}</p><button onClick={()=>load(true)}><RefreshCw size={16}/>{L('Повторить','Retry')}</button></div>
  :!state?.items.length?<div className="vg-collection-empty"><span className="vg-empty-heart">💝</span><strong>{L('Коллекция начинается с первого подарка','The first gift starts the collection')}</strong><p>{L('Подарки от других участников появятся здесь','Gifts from other members will appear here')}</p></div>
  :<div className="vg-collection-grid">{state.items.map(item=>{const gift=item.gift||{key:item.gift_key,emoji:'🎁',name:item.gift_key,en:item.gift_key,rarity:'classic'};return <article className="vg-collected" key={item.id} title={item.note||''}><GiftArt gift={gift}/><strong>{lang==='en'?gift.en:gift.name}</strong><small>{L('От ','From ')}{item.sender_name||'VEYRA'}</small>{item.note&&<p>{item.note}</p>}</article>;})}</div>}
 </section>;
}
export function GiftPicker({target,lang='ru',onClose,onDelivered}){
 const L=(ru,en)=>language(lang,ru,en);
 const [catalog,setCatalog]=useState(()=>catalogCache.data);
 const [selected,setSelected]=useState('spark'),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const [waiting,setWaiting]=useState(false);
 useEffect(()=>{let alive=true;apiCatalog().then(d=>{if(alive)setCatalog(d);}).catch(()=>{if(alive)setError(L('Не удалось загрузить витрину','Could not load the gift catalog'));});return()=>{alive=false;};},[]);
 useEffect(()=>{const escape=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[onClose]);
 const current=catalog?.gifts.find(g=>g.key===selected);
 const displayName=target?.name||L('пользователю','a member');
 const confirm=async()=>{
  if(busy||!current)return;setBusy(true);setError('');
  try{
   const result=await post('/gifts/send',{target:String(target.id),gift_key:current.key,note,client_id:crypto.randomUUID()});
   if(result.status==='delivered'){setDone(true);window.dispatchEvent(new Event('veyra:gift-delivered'));onDelivered?.();return;}
   if(result.status!=='payment_required'||!result.invoice_url)throw Error('BAD_INVOICE');
   const tg=window.Telegram?.WebApp;
   setWaiting(true);
   if(tg?.openInvoice){
    tg.openInvoice(result.invoice_url,status=>{
     if(status==='paid'){setDone(true);window.dispatchEvent(new Event('veyra:gift-delivered'));onDelivered?.();}
     else if(status==='cancelled'||status==='failed')setWaiting(false);
    });
   }else{window.open(result.invoice_url,'_blank','noopener');}
  }catch(e){
   setError(e.message==='PAYMENTS_DISABLED'?L('Оплата Stars временно недоступна. Бесплатный подарок отправить можно.','Stars payments are currently unavailable. The free gift still works.')
   :e.message==='FREE_GIFT_LIMIT'?L('Бесплатный подарок уже отправлен за последние 24 часа','Your free gift for the last 24 hours has been used')
   :e.message==='BLOCKED'?L('Нельзя отправить подарок этому участнику','You cannot send a gift to this member')
   :L('Не удалось отправить подарок. Попробуй ещё.','Could not send the gift. Please retry.'));
  }finally{setBusy(false);}
 };
 return createPortal(<section className="vg-picker-backdrop" role="dialog" aria-modal="true" aria-label={L('Подарить подарок','Send a gift')} onClick={onClose}>
  <div className="vg-picker" onClick={e=>e.stopPropagation()}>
   <header className="vg-picker-header"><div><span className="vg-eyebrow">VEYRA GIFTS</span><h2>{done?L('С любовью отправлено','Sent with love'):L('Подарок для ','A gift for ')+displayName}</h2></div><button aria-label={L('Закрыть','Close')} onClick={onClose}><X size={20}/></button></header>
   {done?<div className="vg-done"><GiftArt gift={current||{emoji:'💝',rarity:'rare'}} size="large"/><h3>{L('Подарок отправлен!','Gift sent!')}</h3><p>{L('Он появится в коллекции получателя','It will appear in their collection')}</p><button onClick={onClose}>{L('Готово','Done')}<Check size={17}/></button></div>:
   <><p className="vg-picker-hint">{L('Выбери знак внимания. Платные подарки оплачиваются через Telegram Stars.','Choose a little surprise. Paid gifts use Telegram Stars.')}</p>
   <div className="vg-catalog-grid" role="group" aria-label={L('Витрина подарков','Gift catalog')}>{catalog?.gifts.map(g=><button className={'vg-choice '+(selected===g.key?'selected':'')} key={g.key} aria-pressed={selected===g.key} onClick={()=>{setSelected(g.key);setError('');}}><GiftArt gift={g}/><strong>{lang==='en'?g.en:g.name}</strong><small>{g.stars===0?L('Бесплатно','Free'):'⭐ '+g.stars}</small></button>)||<div className="vg-collection-loading">{L('Загружаем подарки…','Loading gifts…')}</div>}</div>
   <label className="vg-message-label">{L('Небольшая записка (необязательно)','A note (optional)')}<textarea value={note} maxLength={140} rows={2} onChange={e=>setNote(e.target.value)} placeholder={L('Пусть этот день станет особенным…','A little something for you…')}/><small>{note.length}/140</small></label>
   {error&&<p className="vg-error" role="alert">{error}</p>}{waiting&&<p className="vg-wait" role="status">{L('Оплата открыта в Telegram. Подарок будет зачислен только после подтверждения.','Payment opened in Telegram. Delivery happens only after confirmation.')}</p>}
   <button className="vg-send" disabled={busy||!current||waiting} onClick={confirm}><Gift size={18}/>{busy?L('Отправляем…','Sending…'):current?.stars?L('Отправить за ','Send for ')+current.stars+' ⭐':L('Подарить бесплатно','Send free gift')}</button>
   </>}
  </div>
 </section>,document.body);
}
