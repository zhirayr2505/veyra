import React from 'react';
import {Logo,Button,Icon} from './UI.jsx';
import './Moderation2026.css';
export function Moderation({profile,refresh}){
 const rejected=profile.moderation==='rejected';
 const close=()=>{const telegram=window.Telegram?.WebApp;if(telegram?.close)telegram.close();else window.location.assign('https://t.me/VeyraAppBot')};
 return <main className="moderation veyra-moderation-finish">
  <header className="veyra-finish-brand"><div className="veyra-finish-shine"><Logo width={161}/></div></header>
  <div className="veyra-finish-center">
   <div className={'veyra-finish-hero '+(rejected?'is-rejected':'')} aria-hidden="true">
    {!rejected&&<><i className="veyra-finish-star star-one"/><i className="veyra-finish-star star-two"/><i className="veyra-finish-star star-three"/><i className="veyra-finish-star star-four"/><i className="veyra-finish-star star-five"/></>}
    <div className="veyra-finish-halo"/><div className="veyra-finish-mark"><Icon name={rejected?'info':'check'} tone="white" size={60}/></div>
   </div>
   <h1>{rejected?'Давайте исправим анкету':'Анкета отправлена!'}</h1>
   <p>{rejected?(profile.moderation_reason||'Модератор оставил замечания к анкете.'):'Отличное начало! Мы проверяем вашу анкету перед публикацией. Как только она будет одобрена, бот VEYRA пригласит вас знакомиться.'}</p>
   <div className="veyra-finish-status"><span className="veyra-finish-status-icon"><Icon name={rejected?'info':'verified'} tone="pink" size={24}/></span><span><small>Статус анкеты</small><strong>{rejected?'Требуются изменения':'На модерации'}</strong></span><span className="veyra-finish-status-pulse" aria-hidden="true"/></div>
   {!rejected&&<div className="veyra-finish-telegram"><Icon name="notifications" tone="pink" size={20}/> Сообщим результат прямо в Telegram</div>}
  </div>
  <footer className="veyra-finish-actions">
   <Button className="full" onClick={close}>{rejected?'Закрыть приложение':'Закрыть приложение'}</Button>
   <button className="veyra-finish-refresh" onClick={refresh} type="button"><Icon name="refresh" size={16}/> Проверить статус</button>
  </footer>
 </main>;
}
