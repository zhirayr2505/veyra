import React,{useEffect,useState,useRef} from 'react';
import {photoUrl,cachedPhoto} from './api.js';
import {Heart,MessageCircle,User,Gift,Camera,ArrowLeft,X,Crown,SlidersHorizontal,Send,ShieldCheck,Star,Undo2,Search,Settings,Plus,MoreHorizontal,MapPin,Sparkles,Layers,Check} from 'lucide-react';
const base='/assets/veyra/';
export function Logo({className='',width=125}){return <img draggable="false" className={'logo '+className} width={width} alt="veyra" src={base+'00_brand/veyra_logo.svg'}/>;}
const FALLBACKS={heart:Heart,heart_filled:Heart,chat:MessageCircle,chat_filled:MessageCircle,user:User,user_filled:User,gift:Gift,camera:Camera,back:ArrowLeft,close:X,crown:Crown,filters:SlidersHorizontal,send:Send,shield_check:ShieldCheck,star:Star,undo:Undo2,search:Search,settings:Settings,plus:Plus,more:MoreHorizontal,pin:MapPin,sparkle:Sparkles,cards:Layers,check:Check,verified:ShieldCheck};
export function Icon({name,tone='dark',size=24}){
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[name,tone]);
 if(broken){const F=FALLBACKS[name]||Heart;return <F size={size} aria-hidden="true" color={tone==='white'?'#fff':tone==='pink'?'#ff126b':'#191d39'}/>}
 return <img className="kit-icon" draggable="false" onError={()=>setBroken(true)} src={base+'01_icons/svg/'+tone+'/'+name+'.svg'} width={size} height={size} alt="" aria-hidden="true"/>;
}
export function Button({children,onClick,kind='primary',disabled=false,type='button',className=''}){return <button type={type} disabled={disabled} className={'btn '+kind+' '+className} onClick={onClick}>{children}</button>;}
export function Photo({id,className='',onClick,alt=''}){const element=useRef(null),[state,set]=useState(()=>({id,url:cachedPhoto(id),error:false}));
 const priority=/hero-photo|member-hero|own-photo|mini-avatar|chat-avatar/.test(className);
 useEffect(()=>{let live=true;const cached=cachedPhoto(id);set({id,url:cached,error:false});if(!id||cached)return;
  let observer;const load=()=>photoUrl(id).then(url=>{if(live)set({id,url,error:false})}).catch(()=>{if(live)set({id,url:'',error:true})});
  if(!priority&&element.current&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'180px 0px'});observer.observe(element.current);
  }else load();
  return()=>{live=false;observer?.disconnect()};
 },[id,priority]);
 const url=state.id===id?state.url:'',failed=!id||state.id===id&&state.error;
 return <div ref={element} className={'photo-box '+className} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick()}}:undefined}>{url?<img alt={alt} src={url} loading={priority?"eager":"lazy"} decoding="async" draggable="false"/>:failed?<span className="photo-unavailable" role="img" aria-label="Фото недоступно">♡</span>:<span className="photo-skeleton" aria-hidden="true"/>}</div>;
}
export function InlineAlert({children}){return children?<div role="alert" className="alert">{children}</div>:null;}
export function Empty({title,body,action}){return <section className="empty"><span className="empty-heart">♡</span><h3>{title}</h3><p>{body}</p>{action}</section>}
export function Spinner(){return <span className="spinner" role="status" aria-label="Загрузка"/>;}
export function Header({back,side}){return <header className="top-header">{back?<button className="quiet back" aria-label="Назад" onClick={back}><Icon name="back"/></button>:<span className="header-spacer"/>}<Logo/>{side||<span className="header-spacer"/>}</header>}
export function Tabs({items,value,onChange}){return <div className="tabs" role="tablist">{items.map(([k,label])=><button role="tab" aria-selected={value===k} className={value===k?'chosen':''} key={k} onClick={()=>onChange(k)}>{label}</button>)}</div>}
export function Sheet({title,onClose,children}){useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose]);return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-head"><h2>{title}</h2><button className="quiet" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></div>{children}</section></div>}
