import React,{useEffect} from 'react';
import {Logo,Photo,Icon,Button} from './UI.jsx';
import './MatchCelebration.css';

/** Mutual match is a real event: both portraits are actual private VEYRA photo IDs. */
export function MatchCelebration({me,match,onWrite,onViewProfile,onContinue}){
 const myPhoto=me?.photos?.[0]?.id||me?.profile?.photos?.[0];
 const theirPhoto=match?.profile?.photos?.[0];
 useEffect(()=>{
  const escape=e=>{if(e.key==='Escape')onContinue?.()};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[onContinue]);
 return <div className="match-overlay vx-match-celebration" role="presentation">
  <section className="match-dialog vx-match-dialog" role="dialog" aria-modal="true" aria-labelledby="vx-match-title" aria-describedby="vx-match-description">
   <div className="vx-match-glow" aria-hidden="true"/>
   <Logo width={105} className="vx-match-wordmark"/>
   <div className="vx-match-portraits">
    <div className="vx-match-avatar vx-match-avatar-me"><Photo id={myPhoto} alt={me?.profile?.name||'Твоя фотография'}/></div>
    <div className="vx-match-heart" aria-hidden="true"><Icon name="heart_filled" tone="white" size={29}/></div>
    <div className="vx-match-avatar vx-match-avatar-them"><Photo id={theirPhoto} alt={match?.profile?.name||'Фотография симпатии'}/></div>
    <i className="vx-match-twinkle one" aria-hidden="true">✦</i>
    <i className="vx-match-twinkle two" aria-hidden="true">✧</i>
    <i className="vx-match-twinkle three" aria-hidden="true">✦</i>
   </div>
   <span className="vx-match-kicker">ВЗАИМНАЯ СИМПАТИЯ</span>
   <h2 id="vx-match-title">It's a <span>match!</span></h2>
   <p id="vx-match-description">Вы понравились друг другу.<br/>Возможно, это начало красивой истории.</p>
   <div className="vx-match-actions">
    <Button className="full vx-match-write" onClick={onWrite}><Icon name="chats" tone="white" size={23}/> написать</Button>
    <Button kind="outline" className="full vx-match-profile" onClick={onViewProfile}>посмотреть профиль</Button>
    <button type="button" className="vx-match-continue" onClick={onContinue}>продолжить знакомства</button>
   </div>
  </section>
 </div>;
}
