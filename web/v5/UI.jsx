import React,{useEffect,useState,useRef} from 'react';
import {photoUrl,cachedPhoto} from './api.js';
// Approved Work asset pack: /VEYRA_ASSET_PACK/ in repo root; browser mirror: /veyra-approved/.
const oldBase='/veyra-v2/';
const approvedBase='/veyra-approved/';
const base=approvedBase; // only the approved Work asset pack powers branded UI
const iconAliases={
  filter:'filters',pin:'location',shield_check:'verified',
  crown:'premium',crown_filled:'premium',star:'rating',star_filled:'rating',
  heart_filled:'heart',chat:'chats',chat_filled:'chats',user:'profile',user_filled:'profile',
  home:'feed',home_filled:'feed',encounters:'cards',cards_filled:'cards',
  match:'matches',people:'everyone',views:'eye',missing_photo:'image',
  'arrow-right':'forward',down:'chevron-down',checks:'double-check',
  sparkle:'superlike'
};
const approvedNames=new Set(["back","birthday","block","broken_heart","calendar","camera","cards","chats","close","copy","edit","everyone","favorite","feed","filters","flirt","gallery","gift","heart","info","like","location","lock","man","map","matches","message","moderation","more","notifications","online","pass","phone","pin","premium","profile","rating","refresh","reply","report","search","send","settings","share","superlike","translation","unread","verified","video","view_profile","wallet","woman","chevron-left","chevron-right","chevron-down","plus","check","double-check","undo","sparkle","forward","eye","image","clock"]);
function iconSrc(name,tone='dark'){
 const normalized=String(name||'').replace(/_filled$/,'');
 const id=iconAliases[name]||iconAliases[normalized]||normalized;
 const state=tone==='white'?'on_dark':tone==='pink'||name.endsWith('_filled')?'active':'inactive';
 return approvedNames.has(id)
  ?approvedBase+'01_icons/'+state+'/'+id+'.svg'
  :oldBase+'icons/'+(state==='inactive'?'outline':state==='on_dark'?'on-dark':'active')+'/'+normalized+'.svg';
}
export function Logo({className='',width=125}){return <img draggable="false" className={'logo '+className} width={width} alt="VEYRA" src={approvedBase+'00_brand/veyra_logo_primary.svg'}/>;}
export function Icon({name,tone='dark',size=24,className=''}){return <img className={'kit-icon '+className} draggable="false" src={iconSrc(name,tone)} width={size} height={size} alt="" aria-hidden="true"/>;}
export function DetailIcon({name,size=20,className=''}){return <img className={'veyra-detail-icon '+className} src={iconSrc(name,'pink')} alt="" aria-hidden="true" draggable="false" width={size} height={size}/>;}
const interestSlugs={'музыка':'music','путешествия':'travel','кино':'movies','спорт':'sports','книги':'books','кофе':'coffee','технологии':'technology','животные':'pets','фото':'photography','прогулки':'travel','искусство':'art','вкусная еда':'food','танцы':'fitness','йога':'wellness','мода':'fashion'};
export function InterestIcon({name,size=16,selected=false}){
 const slug=interestSlugs[String(name||'').toLowerCase()];
 return slug?<img className="veyra-interest-icon" src={approvedBase+'02_interest_icons/svg/'+(selected?'selected':'normal')+'/'+slug+'.svg'} width={size} height={size} alt="" aria-hidden="true" draggable="false"/>:null;
}
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
 return <div ref={element} className={'photo-box '+className} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick()}}:undefined}>{url?<img alt={alt} src={url} loading="lazy" decoding="async" draggable="false"/>:failed?<span className="photo-unavailable" role="img" aria-label="Фото недоступно"><Icon name="camera" tone="dark" size={34}/></span>:<span className="photo-skeleton" aria-hidden="true"/>}</div>;
}
export function InlineAlert({children}){return children?<div role="alert" className="alert">{children}</div>:null;}
const emptyIllustrations={match:'no_matches_yet',incoming:'no_incoming_likes',chat:'no_messages_yet',profile:'nothing_here_yet',discover:'no_results',nearby:'no_nearby_people',gift:'empty_gifts',default:'nothing_here_yet'};
export function Empty({title,body,action,art="default"}){return <section className={'empty veyra-empty veyra-empty-'+art}><span className="veyra-empty-art" aria-hidden="true"><img src={base+'04_empty_states/svg/'+(emptyIllustrations[art]||emptyIllustrations.default)+'.svg'} alt="" decoding="async" loading="lazy"/></span><h3>{title}</h3><p>{body}</p>{action}</section>}
export function Spinner(){return <span className="spinner" role="status" aria-label="Загрузка"/>;}
export function Header({back,side}){return <header className="top-header">{back?<button className="quiet back" aria-label="Назад" onClick={back}><Icon name="back"/></button>:<span className="header-spacer"/>}<Logo/>{side||<span className="header-spacer"/>}</header>}
export function Tabs({items,value,onChange}){return <div className="tabs" role="tablist">{items.map(([k,label])=><button role="tab" aria-selected={value===k} className={value===k?'chosen':''} key={k} onClick={()=>onChange(k)}>{label}</button>)}</div>}
export function Sheet({title,onClose,children}){
 const panel=useRef(null),closeRef=useRef(onClose);
 useEffect(()=>{closeRef.current=onClose},[onClose]);
 useEffect(()=>{
  const oldBody=document.body.style.overflow,oldHtml=document.documentElement.style.overflow;
  const previous=document.activeElement;
  document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();closeRef.current?.();return}
   if(e.key!=='Tab'||!panel.current)return;
   const items=[...panel.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
   if(!items.length)return;
   if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
   else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
  };
  document.addEventListener('keydown',key);
  panel.current?.querySelector('.sheet-head button')?.focus({preventScroll:true});
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=oldBody;document.documentElement.style.overflow=oldHtml;if(previous?.isConnected)previous.focus?.({preventScroll:true})}
 },[]);
 return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
   <div className="sheet-head"><h2>{title}</h2><button type="button" className="quiet" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></div>{children}
  </section>
 </div>;
}
