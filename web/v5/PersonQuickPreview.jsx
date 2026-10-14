import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Photo,Icon,Logo} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {CardPhotoBars} from './DatingCardLayers.jsx';
import './PersonQuickPreview.css';

/** Quick look only — actual reactions stay on feed or full profile. */
export function PersonQuickPreview({person,kind='nearby',onClose,onOpenProfile}){
 const [index,setIndex]=useState(0),touch=useRef(null);
 const images=person?.photos||[];
 useEffect(()=>{setIndex(0)},[person?.id]);
 useEffect(()=>{
  const prev=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const key=e=>{if(e.key==='Escape')onClose?.()};
  window.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key)};
 },[onClose]);
 if(!person)return null;
 const switchPhoto=step=>{if(images.length>1)setIndex(n=>(n+step+images.length)%images.length)};
 const distance=person.distance_km!=null&&Number.isFinite(Number(person.distance_km))?'~'+Math.max(1,Math.round(Number(person.distance_km)))+' км':'';
 return createPortal(<div className="vx-quick-overlay" role="presentation" onClick={onClose}>
  <section className="vx-quick-sheet" role="dialog" aria-modal="true" aria-label={'Предпросмотр анкеты '+person.name} onClick={e=>e.stopPropagation()}>
   <div className="vx-quick-grabber" aria-hidden="true"/>
   <div className="vx-quick-hero" onTouchStart={e=>touch.current=e.touches[0]?.clientX??null} onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>45)switchPhoto(dx<0?1:-1)}}>
    <Photo id={images[index]} alt={person.name} className="vx-quick-portrait" placeholder={person.photo_placeholders?.[String(images[index])]} resolution={640}/>
    <div className="vx-quick-image-scrim" aria-hidden="true"/>
    <CardPhotoBars photos={images} index={index} onSelect={setIndex}/>
    <button type="button" className="vx-quick-close" onClick={onClose} aria-label="Закрыть предпросмотр"><Icon name="close" tone="white" size={21}/></button>
    {person.test_profile&&<span className="vx-quick-demo">ДЕМО</span>}
    {images.length>1&&<div className="vx-quick-tap-zones">
     <button type="button" onClick={()=>switchPhoto(-1)} aria-label="Предыдущее фото"/>
     <button type="button" onClick={()=>switchPhoto(1)} aria-label="Следующее фото"/>
    </div>}
    <div className="vx-quick-hero-caption"><strong>{person.name}, {person.age}</strong><small><CountryFlag country={person.country}/> {person.city}</small></div>
   </div>
   <div className="vx-quick-body">
    <div className="vx-quick-intro"><span className="vx-quick-location-icon"><Icon name="location" tone="pink" size={17}/></span>
      <div><strong>{kind==='nearby'?'Рядом с вами':'Подходит тебе'}</strong><small>{kind==='nearby'?(distance?'Всего '+distance+' от вас':'Новые знакомства неподалёку'):'Возможно, у вас много общего'}</small></div>
      <Logo width={80} className="vx-quick-wordmark"/>
    </div>
    {person.bio&&<p className="vx-quick-bio">{person.bio}</p>}
    {(person.interests||[]).length>0&&<div className="vx-quick-interests">{person.interests.slice(0,3).map(x=><span key={x}>{x}</span>)}</div>}
    <button type="button" className="vx-quick-open-profile" onClick={()=>onOpenProfile(person.id)}>посмотреть полный профиль <Icon name="chevron-right" tone="white" size={20}/></button>
   </div>
  </section>
 </div>,document.body);
}
