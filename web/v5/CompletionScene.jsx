import React,{useState} from 'react';
import {Logo,Icon,Button} from './UI.jsx';
import './OnboardingUnified.css';
import './CompletionScene.css';

/* Shared, resolution-independent VEYRA crystal scene for the two final screens. */
export function CompletionArt({kind='pending'}){
 const deleted=kind==='deleted',rejected=kind==='rejected';
 const id=deleted?'deleted':rejected?'rejected':'pending';
 const orb='vc-sphere-'+id,glow='vc-glow-'+id,orbital='vc-orbit-'+id,mark='vc-symbol-'+id;
 return <div className={'vc-art vc-art--'+id} aria-hidden="true">
  <svg className="vc-crystal" viewBox="0 0 430 410" xmlns="http://www.w3.org/2000/svg" focusable="false">
   <defs>
    <radialGradient id={glow}><stop stopColor="#C69EFF" stopOpacity=".55"/><stop offset=".42" stopColor="#E8C7FF" stopOpacity=".42"/><stop offset="1" stopColor="#FBF7FF" stopOpacity="0"/></radialGradient>
    <radialGradient id={orb} cx=".32" cy=".2" r=".96">
     <stop offset="0" stopColor="#FFFFFF"/>
     <stop offset=".22" stopColor="#FFFAFF"/>
     <stop offset=".54" stopColor="#F3D8FF"/>
     <stop offset=".77" stopColor="#DAC4FF"/>
     <stop offset="1" stopColor="#FAF2FF"/>
    </radialGradient>
    <linearGradient id={orbital} x1="0%" y1="70%" x2="100%" y2="23%">
     <stop stopColor="#EDCFFF" stopOpacity=".05"/><stop offset=".19" stopColor="#FAEAFF" stopOpacity=".96"/>
     <stop offset=".54" stopColor="#FFFFFF"/><stop offset=".79" stopColor="#E6C5FE"/><stop offset="1" stopColor="#FFFFFF" stopOpacity=".14"/>
    </linearGradient>
    <linearGradient id={mark} x1="6%" y1="0%" x2="100%" y2="100%">
     <stop stopColor="#B484FF"/><stop offset=".38" stopColor="#7227F0"/><stop offset=".73" stopColor="#9B53F9"/><stop offset="1" stopColor="#CB94FF"/>
    </linearGradient>
    <linearGradient id={'vc-shine-'+id} x1="0" y1="0" x2=".7" y2="1">
     <stop stopColor="#FFFFFF" stopOpacity=".94"/><stop offset=".52" stopColor="#FFFFFF" stopOpacity=".11"/><stop offset="1" stopColor="#FFFFFF" stopOpacity=".02"/>
    </linearGradient>
    <filter id={'vc-blur-'+id} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id={'vc-glimmer-'+id} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
   </defs>
   <circle cx="215" cy="202" r="188" fill={'url(#'+glow+')'} className="vc-glow"/>
   <g className="vc-orbit-back">
    <ellipse cx="215" cy="211" rx="204" ry="67" transform="rotate(-22 215 211)" fill="none" stroke={'url(#'+orbital+')'} strokeWidth="2.8" opacity=".73"/>
    <ellipse cx="215" cy="211" rx="200" ry="64" transform="rotate(-22 215 211)" fill="none" stroke="#FFFFFF" strokeWidth="9" opacity=".13" filter={'url(#vc-glimmer-'+id+')'}/>
   </g>
   <g className="vc-floating-orbs">
    <circle cx="55" cy="259" r="12.4" fill="#9958F1" opacity=".85"/>
    <circle cx="48" cy="252" r="4.4" fill="#F4DDFF" opacity=".7"/>
    <circle cx="370" cy="156" r="9.5" fill="#9562F4" opacity=".85"/>
    <circle cx="366" cy="152" r="3.1" fill="white" opacity=".65"/>
    <circle cx="292" cy="355" r="6" fill="#C3A0FE" opacity=".48"/>
    <circle cx="123" cy="345" r="4.8" fill="#BB8DF8" opacity=".65"/>
   </g>
   <circle className="vc-sphere-shadow" cx="215" cy="206" r="132" fill="#A678F1" opacity=".24" filter={'url(#vc-blur-'+id+')'}/>
   <circle cx="215" cy="201" r="129" fill={'url(#'+orb+')'} stroke="#FFFDFC" strokeWidth="3" className="vc-sphere"/>
   <ellipse cx="178" cy="132" rx="93" ry="34" transform="rotate(-25 178 132)" fill={'url(#vc-shine-'+id+')'} opacity=".63"/>
   <path d="M 111 158 Q 117 89 193 80" fill="none" stroke="#FFFFFF" strokeWidth="8" opacity=".49" strokeLinecap="round"/>
   <path d="M 275 292 Q 325 267 331 206" fill="none" stroke="#FFFFFF" strokeWidth="8" opacity=".25" strokeLinecap="round"/>
   <g className="vc-crystal-symbol">
    {!deleted&&!rejected&&<g className="vc-review-vector"><path d="M215 112 L295 142 L289 226 Q278 278 215 307 Q152 278 141 226 L135 142 Z" fill={'url(#'+mark+')'} stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round"/><path d="M180 203 L205 231 L258 179" fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/></g>}
    {deleted?<g stroke={'url(#'+mark+')'} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="208" cy="157" r="23"/><path d="M 159 237 V 223 C 159 189 172 183 208 183 C 242 183 256 189 256 223"/><circle cx="259" cy="228" r="21" fill="#F3DBFF" strokeWidth="7"/><path d="M 248 228 H 270" strokeWidth="8"/></g>:
      !deleted&&!rejected?null:<path d="M 158 207 L 192 244 L 275 158" fill="none" stroke={'url(#'+mark+')'} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round"/>}
   </g>
   <g className="vc-orbit-front">
    <path d="M 33 269 Q 181 301 397 140" fill="none" stroke={'url(#'+orbital+')'} strokeWidth="2.5" opacity=".93"/>
    <path d="M 44 271 Q 171 300 385 154" fill="none" stroke="white" strokeWidth="4" opacity=".18" filter={'url(#vc-glimmer-'+id+')'}/>
   </g>
   <g className="vc-crystal-twinkles" fill="#FFFFFF">
    <path className="vc-star-one" d="M 71 95 Q 75 125 101 128 Q 75 131 71 161 Q 68 132 42 128 Q 68 125 71 95Z"/>
    <path className="vc-star-two" d="M 351 270 Q 355 296 380 300 Q 355 304 351 326 Q 346 304 322 300 Q 346 296 351 270Z"/>
    <path className="vc-star-three" d="M 335 54 Q 337 69 350 71 Q 337 73 335 88 Q 333 73 320 71 Q 333 69 335 54Z"/>
    <circle className="vc-star-four" cx="113" cy="42" r="3.5"/>
    <circle className="vc-star-five" cx="398" cy="234" r="3"/>
   </g>
   <g className="vc-small-hearts" fill="#AF76F4" opacity=".74">
    <path d="M 326 91 C 326 81 339 79 345 90 C 351 79 364 82 364 92 C 364 103 349 113 345 117 C 339 110 326 102 326 91Z" transform="translate(-8 0) scale(.75)"/>
    <path d="M 75 192 C 75 184 85 182 90 190 C 95 182 105 184 105 192 C 105 199 94 207 90 210 C 85 206 75 200 75 192Z" transform="translate(-8 -14) scale(.72)"/>
   </g>
  </svg>
 </div>;
}

export function CompletionScreen({kind='pending',reason='',onClose,onRefresh,onPreview,onEdit,busy=false,error=''}){
 const [checking,setChecking]=useState(false);
 const deleted=kind==='deleted',rejected=kind==='rejected',pending=!deleted&&!rejected;
 const close=()=>{if(onClose){onClose();return;}const tg=window.Telegram?.WebApp;
  if(typeof tg?.close==='function')tg.close();else window.location.assign('https://t.me/VeyraAppBot');
 };
 const refresh=async()=>{if(checking||!onRefresh)return;setChecking(true);try{await onRefresh()}finally{setChecking(false)}};
 const status=deleted?'Аккаунт удалён':rejected?'Требуются изменения':'На модерации';
 return <main className={'vc-screen vc-screen--'+kind}>
  <header className="vc-header"><div className="vc-logo-sheen"><Logo width={151}/></div></header>
  <section className="vc-content">
   <CompletionArt kind={kind}/>
   <div className="vc-copy">
    <h1>{deleted?'Нам жаль, что ты уходишь':rejected?'Давайте исправим анкету':'Анкета отправлена'}</h1>
    <p>{deleted?'Твой аккаунт VEYRA удалён. Спасибо, что был частью нашей истории.':rejected?(reason||'Модератор оставил замечания к анкете.') :'Мы проверим её перед публикацией. Обычно это занимает несколько минут. Результат отправим в Telegram.'}</p>
    {deleted?<p className="vc-emotional">Мы будем рады встретиться снова</p>:pending?<span className="vc-telegram-hint"><Icon name="send" tone="pink" size={18}/> Ожидает проверки · сообщим в Telegram</span>:null}
   </div>
   <div className="vc-status" role="status"><div className="vc-status-icon"><Icon name={deleted?'broken_heart':rejected?'info':'verified'} tone="pink" size={29}/></div><div className="vc-status-info"><span>Статус</span><strong>{status}</strong></div>{pending&&<span className="vc-status-dot" aria-hidden="true"/>}</div>
  </section>
  <footer className="vc-actions">
   {!deleted&&onPreview&&<Button variant="primary" className="vc-preview-btn" onClick={onPreview}><Icon name="user" tone="white" size={19}/> Посмотреть профиль</Button>}
   <Button variant="secondary" className="vc-close-btn" onClick={close}>{deleted?'Выйти из приложения':'Закрыть приложение'}</Button>
   {!deleted&&<div className="vc-footer-links"><Button variant="ghost" size="small" className="vc-refresh-btn" disabled={checking} loading={checking} onClick={refresh}>{checking?'Проверяем…':'Обновить статус'}</Button>{onEdit&&<Button variant="ghost" size="small" className="vc-refresh-btn" disabled={busy} loading={busy} onClick={onEdit}>{busy?'Открываем…':'Изменить анкету'}</Button>}</div>}
   {error&&<p role="alert" className="vc-feedback-error">{error}</p>}
  </footer>
 </main>;
}
