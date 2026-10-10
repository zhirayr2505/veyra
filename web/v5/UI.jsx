import React,{useEffect,useState} from 'react';
import {photoUrl} from './api.js';
const base='/assets/veyra/';
export function Logo({className='',width=125}){return <img draggable="false" className={'logo '+className} width={width} alt="veyra" src={base+'00_brand/veyra_logo.svg'}/>;}
export function Icon({name,tone='dark',size=24}){return <img className="kit-icon" draggable="false" src={base+'01_icons/svg/'+tone+'/'+name+'.svg'} width={size} height={size} alt="" aria-hidden="true"/>;}
export function Button({children,onClick,kind='primary',disabled=false,type='button',className=''}){return <button type={type} disabled={disabled} className={'btn '+kind+' '+className} onClick={onClick}>{children}</button>;}
export function Photo({id,className='',onClick,alt=''}){const[url,set]=useState('');useEffect(()=>{let ok=true;set('');photoUrl(id).then(x=>{if(ok)set(x)}).catch(()=>{});return()=>{ok=false}},[id]);return <div className={'photo-box '+className} onClick={onClick}>{url?<img alt={alt} src={url} loading="lazy" decoding="async" draggable="false"/>:<span className="photo-skeleton" aria-hidden="true"/>}</div>;}
export function InlineAlert({children}){return children?<div role="alert" className="alert">{children}</div>:null;}
export function Empty({title,body,action}){return <section className="empty"><span className="empty-heart">♡</span><h3>{title}</h3><p>{body}</p>{action}</section>}
export function Spinner(){return <span className="spinner" role="status" aria-label="Загрузка"/>;}
export function Header({back,side}){return <header className="top-header">{back?<button className="quiet back" aria-label="Назад" onClick={back}><Icon name="back"/></button>:<span className="header-spacer"/>}<Logo/>{side||<span className="header-spacer"/>}</header>}
export function Tabs({items,value,onChange}){return <div className="tabs" role="tablist">{items.map(([k,label])=><button role="tab" aria-selected={value===k} className={value===k?'chosen':''} key={k} onClick={()=>onChange(k)}>{label}</button>)}</div>}
export function Sheet({title,onClose,children}){useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose]);return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-head"><h2>{title}</h2><button className="quiet" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></div>{children}</section></div>}
