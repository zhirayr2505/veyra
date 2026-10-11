import React,{useEffect,useState,useCallback,useRef} from 'react';
import {get,post} from './api.js';
import {Button,Sheet,InlineAlert} from './UI.jsx';
import {openInvoice} from './Extras.jsx';
import './Veys.css';

export function Diamond({size=22,white=false,className=''}){return <img className={'veys-diamond '+className} src={'/veyra-approved/09_veys/veys-diamond'+(white?'-white':'')+'.svg'} alt="" aria-hidden="true" width={size} height={size} draggable="false"/>;}
const format=n=>new Intl.NumberFormat('ru-RU').format(Number(n)||0);
const explain=e=>String(e).includes('INSUFFICIENT_VEYS')?'Не хватает VEYS. Пополни баланс за Telegram Stars.':String(e).includes('PAYMENTS_DISABLED')?'Покупки временно отключены. Попробуй позже.':String(e).replace('Error: ','');
const actionLabel=row=>row.action==='topup'?'Пополнение за Stars':row.action==='owner_test'?'Тестовое пополнение':row.action==='refund'?'Возврат платежа':row.source==='gift'?'Отправка подарка':row.source==='courtship'?'Ухаживание':row.source==='purchase'?'Покупка функции':'Списание VEYS';

export function VeysWallet({onClose,onChanged}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[view,setView]=useState('topup');
 const pendingPurchases=useRef(new Map()); // Retain the same request ID after a failed or uncertain response.
 const load=useCallback(()=>get('/veys').then(x=>{setData(x);onChanged?.(x.balance)}).catch(e=>setError(explain(e))),[onChanged]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{const onVisible=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',onVisible);return()=>document.removeEventListener('visibilitychange',onVisible)},[load]);
 const buyPack=async p=>{if(busy)return;setBusy(p.sku);setError('');try{const r=await post('/veys/invoice',{sku:p.sku});if(r.status==='owner_granted'){await load();return;}
   openInvoice(r.url,status=>{if(status==='paid'){setTimeout(load,600);setTimeout(load,1600);setTimeout(load,3500);}});
  }catch(e){setError(explain(e))}finally{setBusy('')}};
 const buyItem=async p=>{if(busy)return;setBusy(p.sku);setError('');const client_id=pendingPurchases.current.get(p.sku)||crypto.randomUUID();pendingPurchases.current.set(p.sku,client_id);
  try{const result=await post('/veys/buy',{sku:p.sku,client_id});if(result.status!=='delivered')throw Error('PURCHASE_UNCONFIRMED');pendingPurchases.current.delete(p.sku);await load();}
  catch(e){setError(explain(e))}finally{setBusy('')}};
 return <Sheet title="Мои VEYS" onClose={onClose}>
  <div className="veys-wallet">
   <div className="veys-balance-card">
    <div className="veys-balance-label">Твой баланс</div>
    <div className="veys-balance-amount"><Diamond size={41} white/>{format(data?.balance)} <span>VEYS</span></div>
    <p>Твои бриллиантики для подарков и особенных действий в VEYRA.</p>
   </div>
   <div className="veys-tabs" role="tablist" aria-label="Разделы кошелька">{[['topup','Пополнить'],['spend','Магазин'],['history','История']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={view===key} className={view===key?'selected':''} onClick={()=>setView(key)}>{label}</button>)}</div>
   {view==='topup'&&<><p className="veys-exchange">Курс: <strong>1 ⭐ = {data?.rate||10} VEYS</strong>. VEYS нельзя вывести или обменять обратно.</p><div className="veys-packages">{(data?.packs||[]).map(p=><button key={p.sku} disabled={!!busy||(!data?.payments_enabled&&!data?.owner_free)} className="veys-package" onClick={()=>buyPack(p)}><span className="veys-package-icon"><Diamond size={26}/></span><span className="veys-package-name"><strong>{format(p.amount)} VEYS</strong><small>Пополнить баланс</small></span><b>{data?.owner_free?'Тест':format(p.stars)+' ⭐'}</b></button>)}</div>{data&&!data.payments_enabled&&!data.owner_free&&<p className="veys-hint">Покупки за Stars временно отключены администратором.</p>}</>}
   {view==='spend'&&<><p className="veys-exchange">Покупки списываются с баланса VEYS. Premium приобретается отдельно за Telegram Stars.</p><div className="veys-packages">{(data?.items||[]).map(p=><button key={p.sku} disabled={!!busy} className="veys-package" onClick={()=>buyItem(p)}><span className="veys-package-icon"><Diamond size={25}/></span><span className="veys-package-name"><strong>{p.title}</strong><small>Добавить в инвентарь</small></span><b>{data?.owner_free?'Тест':format(p.cost)+' 💎'}</b></button>)}</div></>}
   {view==='history'&&<div className="veys-history">{data?.history?.length?data.history.map(row=><div className="veys-history-item" key={row.id}><span><strong>{actionLabel(row)}</strong><small>{new Date(row.created_at).toLocaleDateString('ru-RU')}</small></span><b className={Number(row.delta)>0?'positive':'negative'}>{Number(row.delta)>0?'+':''}{format(row.delta)} 💎</b></div>):<div className="veys-history-empty">Пока нет операций. Твои покупки появятся здесь.</div>}</div>}
   <InlineAlert>{error}</InlineAlert>
   <p className="veys-footnote">Premium покупается только за ⭐ Stars. Покупки VEYS подтверждаются сервером VEYRA.</p>
  </div>
 </Sheet>;
}
