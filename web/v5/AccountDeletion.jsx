import React,{useEffect,useState} from 'react';
import {Logo,Icon} from './UI.jsx';
import {CompletionArt} from './CompletionScene.jsx';
import './AccountDeletion.css';
export function DeleteAccountConfirm({onCancel,onConfirm}){
 const [agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const confirm=async()=>{if(!agreed||busy)return;setBusy(true);setError('');try{await onConfirm()}catch(e){setError(e?.message||'Не получилось отправить запрос');setBusy(false)}};
 return <main className="veyra-delete-page" role="dialog" aria-modal="true" aria-label="Удаление аккаунта VEYRA">
  <header><button type="button" aria-label="Назад" onClick={onCancel}><Icon name="back" size={23}/></button><span className="veyra-deletion-wordmark"><Logo width={136}/></span><span/></header>
  <div className="veyra-delete-main">
   <div className="veyra-delete-crystal" aria-hidden="true"><CompletionArt kind="deleted"/></div>
   <h1>Удалить аккаунт?</h1>
   <p>У тебя будет <strong>72 часа</strong>, чтобы передумать и вернуться в VEYRA.</p>
   <section className="veyra-delete-terms" aria-label="Последствия удаления"><div><span className="veyra-delete-term-icon"><Icon name="eye" tone="pink" size={23}/></span><p><strong>Твой профиль и фото исчезнут из поиска</strong><small>Никто больше не увидит твою анкету в VEYRA.</small></p></div><div><span className="veyra-delete-term-icon"><Icon name="chat" tone="pink" size={23}/></span><p><strong>Новые сообщения станут недоступны</strong><small>Писать тебе больше не смогут.</small></p></div><div><span className="veyra-delete-term-icon"><Icon name="clock" tone="pink" size={23}/></span><p><strong>Полное удаление через 72 часа</strong><small>До этого момента можно восстановить аккаунт.</small></p></div><div><span className="veyra-delete-term-icon"><Icon name="everyone" tone="pink" size={23}/></span><p><strong>Переписка сохранится у собеседников</strong><small>В чатах появится подпись «Удалённый аккаунт».</small></p></div></section>
   <label className="veyra-delete-check"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span className="veyra-delete-square" aria-hidden="true">{agreed?'✓':''}</span><span>Я понимаю последствия и хочу удалить свой аккаунт</span></label>
   {error&&<p role="alert" className="veyra-delete-error">{error}</p>}
  </div>
  <footer><button className="veyra-delete-main-action" type="button" disabled={!agreed||busy} onClick={confirm}>{busy?'Подождите…':'Удалить мой аккаунт'}</button><button className="veyra-delete-secondary" type="button" onClick={onCancel}>Остаться в VEYRA</button></footer>
 </main>;
}
export function DeletionPending({dueAt,onRestore}){
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 const seconds=Math.max(0,Math.ceil((new Date(dueAt).getTime()-now)/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),sec=seconds%60;
 const pad=n=>String(n).padStart(2,'0');
 const restore=async()=>{if(busy||seconds<=0)return;setBusy(true);setError('');try{await onRestore()}catch(e){setError(e?.message||'Не удалось восстановить аккаунт');setBusy(false)}};
 const exit=()=>{const tg=window.Telegram?.WebApp;if(typeof tg?.close==='function')tg.close();else window.location.assign('https://t.me/VeyraAppBot')};
 return <main className="veyra-delete-page veyra-delete-wait">
  <header><span/><span className="veyra-deletion-wordmark"><Logo width={136}/></span><span/></header>
  <div className="veyra-delete-main">
   <div className="veyra-delete-crystal" aria-hidden="true"><CompletionArt kind="deleted"/></div>
   <h1>Ещё можно вернуться</h1>
   <p>Твоя анкета уже скрыта от других людей. Но пока ещё можно восстановить профиль, фотографии и переписки.</p>
   <section className="veyra-delete-timer" role="status"><small>До окончательного удаления осталось</small><strong>{pad(hours)}:{pad(minutes)}:{pad(sec)}</strong><span>часов : минут : секунд</span></section>
   <p className="veyra-delete-note">Через 72 часа после запроса восстановление станет невозможным.</p>
   {error&&<p role="alert" className="veyra-delete-error">{error}</p>}
  </div>
  <footer><button className="veyra-delete-main-action" type="button" onClick={restore} disabled={busy||!seconds}>{busy?'Восстанавливаем…':seconds?'Восстановить аккаунт':'Время восстановления закончилось'}</button><button className="veyra-delete-secondary" type="button" onClick={exit}>Выйти из приложения</button></footer>
 </main>;
}
