import React,{useEffect,useState} from 'react';
import {get,post} from './api.js';
import {Sheet,Button,Empty,Spinner,InlineAlert,Icon} from './UI.jsx';
const categories=[['general','Общий вопрос'],['profile','Анкета'],['payment','Оплата'],['safety','Безопасность'],['bug','Ошибка приложения']];
const date=value=>{try{return new Date(value).toLocaleDateString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return ''}};
export function Support({onClose}){
 const [tickets,setTickets]=useState([]),[selected,setSelected]=useState(null),[category,setCategory]=useState('general'),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async(preferred)=>{const rows=await get('/support');setTickets(rows);if(preferred)setSelected(preferred);return rows};
 useEffect(()=>{let live=true;get('/support').then(rows=>{if(live){setTickets(rows);setError('')}}).catch(e=>{if(live)setError('Не удалось загрузить обращения: '+e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 const ticket=tickets.find(x=>x.id===selected);
 const send=async()=>{const text=body.trim();if(!text||busy)return;setBusy(true);setError('');
  try{const result=selected?await post('/support/'+selected+'/messages',{body:text}):await post('/support',{category,body:text});
   setBody('');await load(result.id||selected);
  }catch(e){setError('Не удалось отправить обращение: '+e.message)}finally{setBusy(false)}
 };
 const resolve=async()=>{if(!ticket||busy)return;setBusy(true);try{await post('/support/'+ticket.id+'/close',{});await load(ticket.id)}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <Sheet title="Поддержка VEYRA" onClose={onClose}><div className="support">
  <p className="tip">Вопросы о знакомствах, безопасности, оплате и работе VEYRA. Все обращения сохраняются и попадают настоящим модераторам.</p>
  <div className="support-head"><h3>{ticket?'Переписка с поддержкой':'Мои обращения'}</h3>{selected?<button className="text-link" onClick={()=>{setSelected(null);setBody('');setError('')}}>все обращения</button>:<button className="text-link" onClick={()=>{setSelected(null);setBody('')}}>новое обращение</button>}</div>
  {loading?<div className="center-loading"><Spinner/></div>:!ticket&&<div className="support-history">{tickets.length===0?<Empty title="Обращений пока нет" body="Напиши нам, если нужна помощь."/>:tickets.map(t=><button className="support-ticket" key={t.id} onClick={()=>{setSelected(t.id);setBody('');setError('')}}><strong>{categories.find(c=>c[0]===t.category)?.[1]||'Обращение'}</strong><span>{t.status==='resolved'?'✓ закрыто':'● открыто'} · {date(t.created_at)}</span><small>{t.body}</small></button>)}</div>}
  {ticket&&<div className="support-thread"><div className="support-message mine"><strong>Ты · {date(ticket.created_at)}</strong><p>{ticket.body}</p></div>{(ticket.messages||[]).map(m=><div key={m.id} className={'support-message '+(m.is_staff?'staff':'mine')}><strong>{m.is_staff?'Поддержка VEYRA':'Ты'} · {date(m.created_at)}</strong><p>{m.body}</p></div>)}</div>}
  <div className="fields">{!selected&&<label>Тема<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>}<label>{selected?'Новое сообщение':'Твоё обращение'}<textarea maxLength={3000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Расскажи, что произошло"/></label></div>
  <InlineAlert>{error}</InlineAlert><Button className="full" disabled={busy||!body.trim()} onClick={send}>{busy?'отправляем…':selected?'отправить ответ':'отправить обращение'}</Button>
  {ticket?.status!=='resolved'&&ticket&&<button className="text-link support-resolve" onClick={resolve} disabled={busy}>закрыть обращение</button>}
 </div></Sheet>;
}
