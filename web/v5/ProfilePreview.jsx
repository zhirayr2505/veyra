import React,{useRef,useState,useEffect,useLayoutEffect} from 'react';
import {photoUrl} from './api.js';
import {Logo,Photo,Icon} from './UI.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import {CatalogueIcon,goalTitle} from './OnboardingOptions.jsx';
import './ProfilePreview.css';
const ageOf=b=>{const date=new Date(b),now=new Date();return Number.isNaN(+date)?'':now.getFullYear()-date.getFullYear()-(now.getMonth()<date.getMonth()||(now.getMonth()===date.getMonth()&&now.getDate()<date.getDate())?1:0)};
export function ProfilePreview({profile={},photos=[],onBack,onEdit,onSubmit,submitting=false,error='',submitted=false}){
 const [mode,setMode]=useState('feed'),[index,setIndex]=useState(0),touch=useRef(null),scrollRef=useRef(null);
 const ids=photos.map(p=>typeof p==='object'?p.id:p).filter(Boolean),current=ids[Math.min(index,ids.length-1)];
 const galleryIds=ids.length?[ids[(index-1+ids.length)%ids.length],ids[index],ids[(index+1)%ids.length]]:[];
  const photoKeys=ids.join('|');
  // Preload every approved photo before the person taps the next frame.
  // photoUrl de-duplicates network requests and caches blob URLs per session.
  useEffect(()=>{if(!photoKeys)return;for(const id of photoKeys.split('|'))photoUrl(id).catch(()=>{});},[photoKeys]);
  // Different preview tabs have different scroll modes: always start at the top.
  useLayoutEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[mode]);
 const slide=dir=>setIndex(i=>(i+dir+ids.length)%ids.length);
 const swipeEnd=e=>{if(touch.current==null)return;const x=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(x)>40&&ids.length>1)slide(x<0?1:-1)};
 const years=profile.age||ageOf(profile.birth_date),interests=profile.interests||[];
 return <main className={'veyra-profile-preview mode-'+mode}>
  <header className="vp-header"><button type="button" aria-label="Назад" onClick={onBack}><Icon name="back" size={23}/></button><Logo width={136}/><span/></header>
  <nav role="tablist" aria-label="Вид профиля" className="vp-tabs"><button type="button" role="tab" aria-selected={mode==='feed'} className={mode==='feed'?'active':''} onClick={()=>setMode('feed')}>В ленте</button><button type="button" role="tab" aria-selected={mode==='detail'} className={mode==='detail'?'active':''} onClick={()=>setMode('detail')}>Полный профиль</button></nav>
  <div className="vp-scroll" data-preview-scroll={mode} ref={scrollRef}>
   <h1>{mode==='feed'?'Так тебя увидят в ленте':'Твой полный профиль'}</h1>
   <p className="vp-subtitle">Первое впечатление начинается здесь ✨</p>
   <section className="preview-surface preview-dating-card">
    <div className="preview-gallery" aria-label="Предпросмотр карточки знакомств" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={swipeEnd}>
     {galleryIds.length?<div className="preview-gallery-track" style={{transform:'translate3d(-33.3333333%,0,0)'}}>{galleryIds.map((id,i)=><div className="preview-gallery-slide" key={id+'-'+i}><Photo id={id} className="preview-photo" alt={'Фото '+(i===0?(index-1+ids.length)%ids.length+1:i===1?index+1:(index+1)%ids.length+1)}/></div>)}</div>:<div className="vp-empty-photo"><Icon name="camera" tone="pink" size={44}/></div>}
     <div className="preview-fade"/><span className="preview-card-flag">{submitted?'твоя анкета':'твоя карточка'}</span>
     {ids.length>1&&<><button type="button" className="preview-arrow left" aria-label="Предыдущее фото" onClick={()=>slide(-1)}><Icon name="chevron-left" size={23} tone="white"/></button><button type="button" className="preview-arrow right" aria-label="Следующее фото" onClick={()=>slide(1)}><Icon name="chevron-right" size={23} tone="white"/></button></>}
     <div className="preview-card-caption"><h2>{profile.name||'Имя'}{years?', '+years:''}</h2>
      <p className="preview-card-location"><Icon name="pin" tone="white" size={16}/>{[profile.city,profile.country].filter(Boolean).join(', ')}</p>
      {mode==='feed'&&<><InterestReveal items={interests} preview/><p className="preview-card-goal">✨ {goalTitle(profile.goal)}</p></>}
     </div>
     {ids.length>1&&<div className="preview-dots" role="group" aria-label="Фотографии анкеты">{ids.map((id,i)=><button type="button" key={id} aria-label={'Фото '+(i+1)} aria-current={i===index?'true':undefined} className={i===index?'active':''} onClick={()=>setIndex(i)}/>)}</div>}
    </div>
   </section>
   {mode==='detail'&&<div className="vp-detail">
    <section><div className="vp-heading"><Icon name="heart" tone="pink" size={21}/> Цель знакомства</div><strong>{goalTitle(profile.goal)}</strong></section>
    <section><div className="vp-heading"><Icon name="user" tone="pink" size={21}/> Немного о себе</div><p>{profile.bio?.trim()||'Описание пока не заполнено'}</p></section>
    <section><div className="vp-heading"><Icon name="sparkle" tone="pink" size={21}/> Мои интересы <small>{interests.length}/12</small></div><div className="vp-interests">{interests.map(x=><span key={x}><CatalogueIcon value={x} size={16}/>{x}</span>)}{!interests.length&&<p>Интересы пока не выбраны</p>}</div></section>
    {ids.length>1&&<section><div className="vp-heading"><Icon name="image" tone="pink" size={21}/> Все фотографии</div><div className="vp-thumbnails">{ids.map((id,i)=><button type="button" key={id} onClick={()=>{setIndex(i);document.querySelector('.vp-scroll')?.scrollTo({top:0,behavior:'smooth'})}} aria-label={'Посмотреть фотографию '+(i+1)}><Photo id={id} alt={'Фото '+(i+1)}/></button>)}</div></section>}
   </div>}
  </div>
  {error&&<p className="vp-error" role="alert">{error}</p>}
  <footer className="vp-actions">
   {onSubmit?<><button type="button" className="vp-primary" disabled={submitting||ids.length<3} onClick={onSubmit}>{submitting?'Отправляем…':<><Icon name="check" tone="white" size={22}/> отправить на проверку</>}</button><button type="button" className="vp-secondary" onClick={onEdit||onBack}>редактировать</button></>:
   <><button type="button" className="vp-primary" disabled={submitting} onClick={onEdit}>{submitting?'Открываем…':'Изменить профиль'}</button><button type="button" className="vp-secondary" onClick={onBack}>Назад</button></>}
  </footer>
 </main>;
}
