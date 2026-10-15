import React from 'react';
import {Logo,Icon} from './UI.jsx';
import './TopZone.css';
/** One logical safe-area header; Telegram retains native navigation. */
export function TopZone({title='',logo=false,center=null,onBack=null,left=null,right=null,className='',floating=false}){
 const tg=typeof window==='undefined'?null:window.Telegram?.WebApp;
 const native=Boolean(tg?.initData&&tg.BackButton);
 return <header className={'vx-top-zone'+(floating?' vx-top-zone--floating':'')+(className?' '+className:'')} aria-label={title||'Навигация VEYRA'}>
  <div className="vx-top-zone__left">{left}{!native&&onBack&&<button type="button" className="vx-member-fallback-back" onClick={onBack} aria-label="Назад"><Icon name="back" tone="pink" size={21}/></button>}</div>
  <div className="vx-top-zone__center">{center||(logo?<Logo width={124}/>:<h1>{title}</h1>)}</div>
  <div className="vx-top-zone__right">{right}</div>
 </header>;
}
