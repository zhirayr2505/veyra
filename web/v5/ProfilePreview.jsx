import React,{useRef,useState,useEffect,useLayoutEffect,useMemo} from 'react';
import {Member} from './Member.jsx';
import {photoUrl,cachedPhotoAny} from './api.js';
import {Icon,Button} from './UI.jsx';
import {FeedCardVisual} from './FeedCardVisual.jsx';
import {OnboardingHeader} from './OnboardingHeader.jsx';
import './MemberFeed.css';
import './ProfilePreview.css';
const ageOf=b=>{const date=new Date(b),now=new Date();return Number.isNaN(+date)?'':now.getFullYear()-date.getFullYear()-(now.getMonth()<date.getMonth()||(now.getMonth()===date.getMonth()&&now.getDate()<date.getDate())?1:0)};
export function ProfilePreview({profile={},photos=[],onBack,onEdit,onJump,onSubmit,submitting=false,error='',submitted=false}){
 const [mode,setMode]=useState('detail'),[index,setIndex]=useState(0),touch=useRef(null),scrollRef=useRef(null),stageRef=useRef(null),actionsRef=useRef(null);
 const ids=photos.map(p=>typeof p==='object'?p.id:p).filter(Boolean);
 const photoPlaceholders=Object.fromEntries(photos.filter(x=>typeof x==='object'&&x.id).map(x=>[String(x.id),{lqip:x.lqip||null,dominant:x.dominant||x.dominant_color||null}]));
  const photoKeys=ids.join('|');
  // Preload every approved photo before the person taps the next frame.
  // photoUrl de-duplicates network requests and caches blob URLs per session.
  useEffect(()=>{if(!photoKeys)return;for(const id of photoKeys.split('|'))if(!cachedPhotoAny(id))photoUrl(id,{width:960}).catch(()=>{});},[photoKeys]);
  // Different preview tabs have different scroll modes: always start at the top.
  useLayoutEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[mode]);
 const slide=dir=>setIndex(i=>(i+dir+ids.length)%ids.length);
  const selectMode=next=>{setIndex(0);setMode(next)};
 const swipeEnd=e=>{if(touch.current==null)return;const x=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(x)>40&&ids.length>1){e.preventDefault();slide(x<0?1:-1)}};
 const years=profile.age||ageOf(profile.birth_date);
 const readOnlyData=useMemo(()=>({...profile,id:'registration-preview',age:years,photos:ids,photo_placeholders:photoPlaceholders}),[profile,photos]);
 useLayoutEffect(()=>{
  if(mode!=='detail')return;
  const stage=stageRef.current,footer=actionsRef.current;
  if(!stage||!footer)return;
  const measure=()=>stage.style.setProperty('--vx-profile-bottom-clear',Math.ceil(footer.getBoundingClientRect().height+16)+'px');
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  ro?.observe(footer);measure();return()=>{ro?.disconnect();stage.style.removeProperty('--vx-profile-bottom-clear')};
 },[mode]);
 useEffect(()=>{if(!submitted)return;const back=window.Telegram?.WebApp?.BackButton;if(!back)return;back.show?.();back.onClick?.(onBack);return()=>{back.offClick?.(onBack);back.hide?.()};},[submitted,onBack]);
 return <main className={'veyra-profile-preview mode-'+mode}>
  <OnboardingHeader preview onBack={onBack}/>
  <nav role="tablist" aria-label="Вид профиля" className="vp-tabs"><button type="button" role="tab" aria-selected={mode==='feed'} className={mode==='feed'?'active':''} onClick={()=>selectMode('feed')}>В ленте</button><button type="button" role="tab" aria-selected={mode==='detail'} className={mode==='detail'?'active':''} onClick={()=>selectMode('detail')}>Полный профиль</button></nav>
  <div className="vp-scroll" data-preview-scroll={mode} ref={scrollRef}>
   {mode==='feed'&&<h1>Так тебя увидят в ленте</h1>}
   {mode==='feed'&&<p className="vp-subtitle">Первое впечатление начинается здесь ✨</p>}
   {mode==='feed'&&<>
   <section className="preview-surface preview-dating-card discover" aria-label="Так выглядит карточка в ленте">
    <div className="preview-gallery feed-photo" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={swipeEnd}>
     <FeedCardVisual card={readOnlyData} index={index} onIndex={setIndex} preview location={profile.city}/>
     {ids.length>1&&<><button type="button" className="preview-photo-tap left" aria-label="Предыдущее фото" onClick={()=>slide(-1)}/><button type="button" className="preview-photo-tap right" aria-label="Следующее фото" onClick={()=>slide(1)}/></>}
    </div>
   </section>
   </>}
   {mode==='detail'&&<div className="vx-preview-member-stage veyra-v2" ref={stageRef}><Member id="registration-preview" readOnly previewData={readOnlyData} onBack={onBack} onPreviewAction={onJump} viewer={{}}/></div>}
  </div>
  {error&&<p className="vp-error" role="alert">{error}</p>}
  <footer className="vp-actions" ref={actionsRef}>
   {onSubmit?<><Button variant="primary" className="vp-primary" disabled={submitting||ids.length<3} loading={submitting} onClick={onSubmit}>{submitting?'Отправляем…':<><Icon name="check" tone="white" size={22}/> отправить на проверку</>}</Button><Button variant="secondary" className="vp-secondary" onClick={onEdit||onBack}>редактировать</Button></>:
   <><Button variant="primary" className="vp-primary" disabled={submitting} loading={submitting} onClick={onEdit}>{submitting?'Открываем…':'Изменить профиль'}</Button><Button variant="secondary" className="vp-secondary" onClick={onBack}>Назад</Button></>}
  </footer>
 </main>;
}
