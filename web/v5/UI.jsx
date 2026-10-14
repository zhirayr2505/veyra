import React,{useEffect,useState,useRef} from 'react';
import {LiquidLogo} from './LiquidLogo.jsx';
import {photoUrl,cachedPhoto,cachedPhotoAny} from './api.js';
import './PhotoReveal.css';
import './UiPrimitives.css';
// Approved Work asset pack: /VEYRA_ASSET_PACK/ in repo root; browser mirror: /veyra-approved/.
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
  :approvedBase+'01_icons/'+state+'/info.svg';
}
export function Logo(props){return <LiquidLogo {...props}/>;}
export function Icon({name,tone='dark',size=24,className=''}){return <img className={'kit-icon '+className} draggable="false" src={iconSrc(name,tone)} width={size} height={size} alt="" aria-hidden="true"/>;}
export function DetailIcon({name,size=20,className=''}){return <img className={'veyra-detail-icon '+className} src={iconSrc(name,'pink')} alt="" aria-hidden="true" draggable="false" width={size} height={size}/>;}
const interestSlugs={'музыка':'music','путешествия':'travel','кино':'movies','спорт':'sports','книги':'books','кофе':'coffee','технологии':'technology','животные':'pets','фото':'photography','прогулки':'travel','искусство':'art','вкусная еда':'food','танцы':'fitness','йога':'wellness','мода':'fashion'};
export function InterestIcon({name,size=16,selected=false}){
 const slug=interestSlugs[String(name||'').toLowerCase()];
 return slug?<img className="veyra-interest-icon" src={approvedBase+'02_interest_icons/svg/'+(selected?'selected':'normal')+'/'+slug+'.svg'} width={size} height={size} alt="" aria-hidden="true" draggable="false"/>:null;
}
export function Button({children,onClick,kind='primary',variant,size='large',loading=false,disabled=false,type='button',className='',...rest}){
 const requested=variant||kind;
 const visual=requested==='outline'?'secondary':requested==='soft'?'ghost':requested;
 const classKind=requested==='secondary'?'outline':requested==='ghost'?'soft':requested;
 const inactive=disabled||loading;
 return <button {...rest} type={type} disabled={inactive} aria-busy={loading||undefined}
  className={'btn veyra-button '+classKind+' veyra-button-'+visual+' veyra-button-'+size+' '+className}
  onClick={onClick}>
  {loading&&<span className="veyra-button-spinner" aria-hidden="true"/>}
  {children}
 </button>;
}
export function Choice({children,selected=false,onClick,className='',disabled=false,...rest}){
 return <button {...rest} type="button" className={'choice veyra-choice'+(selected?' selected is-active':'')+' '+className}
  aria-pressed={selected} disabled={disabled} onClick={onClick}>{children}</button>;
}
export function InterestChip({tone='violet',label,common=false,selected=false,removable=false,onRemove,onClick,disabled=false,icon,className='',children}){
 const clickable=typeof onClick==='function'||(removable&&typeof onRemove==='function');
 const click=onClick||(removable?onRemove:undefined);
 const body=<>{icon||<InterestIcon name={label} size={17} selected={selected}/>}<span className="vx-interest-text">{label}</span>{common&&<span className="vx-profile-common-tag">общее</span>}{removable&&<span className="veyra-interest-remove" aria-hidden="true">×</span>}{children}</>;
 const props={className:'vx-member-interest veyra-interest-chip '+className,'data-tone':tone,'data-common':common?'true':undefined,'data-selected':selected?'true':undefined};
 return clickable?<button type="button" {...props} aria-label={removable?'Убрать '+label:label} aria-pressed={removable?undefined:selected} disabled={disabled} onClick={click}>{body}</button>:<span {...props}>{body}</span>;
}
export function Photo({id,className='',onClick,alt='',priority=false,resolution=0,placeholder=null}){
 const element=useRef(null),width=[256,640,960].includes(resolution)?resolution:0;
 const [retry,setRetry]=useState(0);
 const [state,set]=useState(()=>({id,width,url:cachedPhoto(id,{width}),error:false}));
 const [ready,setReady]=useState(()=>!!cachedPhoto(id,{width}));
 useEffect(()=>{
  let live=true,observer;
  const cached=cachedPhoto(id,{width});
  set({id,width,url:cached,error:false});setReady(!!cached);
  if(!id||cached)return;
  const load=()=>photoUrl(id,{width}).then(url=>{if(live)set({id,width,url,error:false})}).catch(()=>{if(live)set({id,width,url:'',error:true})});
  if(!priority&&element.current&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'180px 0px'});
   observer.observe(element.current);
  }else load();
  return()=>{live=false;observer?.disconnect()};
 },[id,width,priority,retry]);
 const correct=state.id===id&&state.width===width;
 const url=correct?state.url:'',failed=!id||(correct&&state.error);
 const blurSrc=cachedPhotoAny(id)||(typeof placeholder==='string'?placeholder:placeholder?.lqip)||'';
 const candidate=typeof placeholder==='object'?placeholder?.dominant:'';
 const color=/^#[0-9a-fA-F]{6}$/.test(candidate)?candidate:'#ded0ef';
 const decoded=async e=>{const img=e.currentTarget;try{await img.decode?.()}catch{}if(img.isConnected&&img.src===url)setReady(true)};
 return <div ref={element} className={'photo-box photo-progressive '+className} style={{'--photo-dominant':color}}
  onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined}
  onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick()}}:undefined}>
  {url&&<img key={url} className={'photo-sharp'+(ready?' photo-revealed':'')} alt={alt} src={url} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" draggable="false" onLoad={decoded} onError={()=>set(old=>old.id===id?{...old,url:'',error:true}:old)}/>}
  <span className="photo-blur" aria-hidden="true">{blurSrc&&<img src={blurSrc} alt="" draggable="false"/>}</span>
  {failed&&!url?<span className="photo-unavailable photo-retry-state" role="group" aria-label={id?'Ошибка загрузки фотографии':'Фото пока нет'}>
   <Icon name="camera" tone="pink" size={32}/>
   <strong>{id?'Не удалось загрузить':'Фото пока нет'}</strong>
   {id&&<button type="button" className="photo-retry-button" onClick={event=>{event.stopPropagation();setReady(false);setRetry(n=>n+1)}} onKeyDown={event=>event.stopPropagation()}><Icon name="refresh" tone="pink" size={18}/> Повторить</button>}
  </span>:null}
 </div>;
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
