import React,{useEffect,useState,useRef} from 'react';
import {photoUrl,cachedPhoto} from './api.js';
const base='/assets/veyra/';
export function Logo({className='',width=125}){return <img draggable="false" className={'logo '+className} width={width} alt="veyra" src={base+'00_brand/veyra_logo.svg'}/>;}
export function Icon({name,tone='dark',size=24,className=''}){return <img className={'kit-icon '+className} draggable="false" src={base+'05_premium_icons/'+tone+'/'+name+'.svg'} width={size} height={size} alt="" aria-hidden="true"/>;}
export function DetailIcon({name,size=20,className=''}){return <img className={'veyra-detail-icon '+className} src={base+'05_premium_icons/pink/'+name+'.svg'} alt="" aria-hidden="true" draggable="false" width={size} height={size}/>;}
const interestSlugs={'музыка':'music','путешествия':'travel','кино':'cinema','спорт':'sport','книги':'books','кофе':'coffee','технологии':'technology','животные':'pets','фото':'camera','прогулки':'walk','искусство':'art','вкусная еда':'food','танцы':'dance','йога':'yoga','мода':'fashion'};
export function InterestIcon({name,size=16}){const slug=interestSlugs[String(name||'').toLowerCase()];return slug?<img className="veyra-interest-icon" src={base+'05_premium_icons/interests/'+slug+'.svg'} width={size} height={size} alt="" aria-hidden="true" draggable="false"/>:null;}
export function Button({children,onClick,kind='primary',disabled=false,type='button',className=''}){return <button type={type} disabled={disabled} className={'btn '+kind+' '+className} onClick={onClick}>{children}</button>;}
export function Photo({id,className='',onClick,alt=''}){const element=useRef(null),[state,set]=useState(()=>({id,url:cachedPhoto(id),error:false}));
 useEffect(()=>{let live=true;const cached=cachedPhoto(id);set({id,url:cached,error:false});if(!id||cached)return;
  let observer;const load=()=>photoUrl(id).then(url=>{if(live)set({id,url,error:false})}).catch(()=>{if(live)set({id,url:'',error:true})});
  if(element.current&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'180px 0px'});observer.observe(element.current);
  }else load();
  return()=>{live=false;observer?.disconnect()};
 },[id]);
 const url=state.id===id?state.url:'',failed=!id||state.id===id&&state.error;
 return <div ref={element} className={'photo-box '+className} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick()}}:undefined}>{url?<img alt={alt} src={url} loading="lazy" decoding="async" draggable="false"/>:failed?<span className="photo-unavailable" role="img" aria-label="Фото недоступно"><img src="/graphics/placeholders/avatar-neutral.svg" width="64" height="64" alt="" decoding="async"/></span>:<span className="photo-skeleton" aria-hidden="true"/>}</div>;
}
export function InlineAlert({children}){return children?<div role="alert" className="alert">{children}</div>:null;}
const emptyIllustrations=new Set(["match","incoming","chat","profile","discover","nearby","gift","default"]);
export function Empty({title,body,action,art="default"}){const illustration=emptyIllustrations.has(art)?art:"default";return <section className={'empty veyra-empty veyra-empty-'+illustration}><span className="veyra-empty-art" aria-hidden="true"><img src={'/assets/veyra/06_duotone_art/'+illustration+'.svg'} alt="" decoding="async" loading="eager"/></span><h3>{title}</h3><p>{body}</p>{action}</section>}
export function Spinner(){return <span className="spinner" role="status" aria-label="Загрузка"/>;}
export function Header({back,side}){return <header className="top-header">{back?<button className="quiet back" aria-label="Назад" onClick={back}><Icon name="back"/></button>:<span className="header-spacer"/>}<Logo/>{side||<span className="header-spacer"/>}</header>}
export function Tabs({items,value,onChange}){return <div className="tabs" role="tablist">{items.map(([k,label])=><button role="tab" aria-selected={value===k} className={value===k?'chosen':''} key={k} onClick={()=>onChange(k)}>{label}</button>)}</div>}
export function Sheet({title,onClose,children}){useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose]);return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-head"><h2>{title}</h2><button className="quiet" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></div>{children}</section></div>}
