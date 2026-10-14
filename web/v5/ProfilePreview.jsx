import React,{useRef,useState,useEffect,useLayoutEffect} from 'react';
import {photoUrl} from './api.js';
import {Logo,Photo,Icon,Button,InterestChip} from './UI.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import {CatalogueIcon,ProfileHighlights,INTEREST_GROUPS} from './OnboardingOptions.jsx';
import {interestTone} from './profilePolishLogic.js';
import {CountryFlag} from './CountryFlag.jsx';
import {OnboardingHeader} from './OnboardingHeader.jsx';
import {CardCaption,CardGoalBadge} from './DatingCardLayers.jsx';
import {PhotoSegments} from './PhotoSegments.jsx';
import './MemberFeed.css';
import './ProfilePreview.css';
const ageOf=b=>{const date=new Date(b),now=new Date();return Number.isNaN(+date)?'':now.getFullYear()-date.getFullYear()-(now.getMonth()<date.getMonth()||(now.getMonth()===date.getMonth()&&now.getDate()<date.getDate())?1:0)};
export function ProfilePreview({profile={},photos=[],onBack,onEdit,onSubmit,submitting=false,error='',submitted=false}){
 const [mode,setMode]=useState('feed'),[index,setIndex]=useState(0),touch=useRef(null),scrollRef=useRef(null);
 const ids=photos.map(p=>typeof p==='object'?p.id:p).filter(Boolean),current=ids[Math.min(index,ids.length-1)];
 const photoPlaceholders=Object.fromEntries(photos.filter(x=>typeof x==='object'&&x.id).map(x=>[String(x.id),{lqip:x.lqip||null,dominant:x.dominant||x.dominant_color||null}]));
 const galleryIds=ids.length?[ids[(index-1+ids.length)%ids.length],ids[index],ids[(index+1)%ids.length]]:[];
  const photoKeys=ids.join('|');
  // Preload every approved photo before the person taps the next frame.
  // photoUrl de-duplicates network requests and caches blob URLs per session.
  useEffect(()=>{if(!photoKeys)return;for(const id of photoKeys.split('|'))photoUrl(id).catch(()=>{});},[photoKeys]);
  // Different preview tabs have different scroll modes: always start at the top.
  useLayoutEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[mode]);
 const slide=dir=>setIndex(i=>(i+dir+ids.length)%ids.length);
 const swipeEnd=e=>{if(touch.current==null)return;const x=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(x)>40&&ids.length>1){e.preventDefault();slide(x<0?1:-1)}};
 const years=profile.age||ageOf(profile.birth_date),interests=profile.interests||[];
 useEffect(()=>{if(!submitted)return;const back=window.Telegram?.WebApp?.BackButton;if(!back)return;back.show?.();back.onClick?.(onBack);return()=>{back.offClick?.(onBack);back.hide?.()};},[submitted,onBack]);
 return <main className={'veyra-profile-preview mode-'+mode}>
  <OnboardingHeader preview onBack={onBack}/>
  <nav role="tablist" aria-label="Вид профиля" className="vp-tabs"><button type="button" role="tab" aria-selected={mode==='feed'} className={mode==='feed'?'active':''} onClick={()=>setMode('feed')}>В ленте</button><button type="button" role="tab" aria-selected={mode==='detail'} className={mode==='detail'?'active':''} onClick={()=>setMode('detail')}>Полный профиль</button></nav>
  <div className="vp-scroll" data-preview-scroll={mode} ref={scrollRef}>
   <h1>{mode==='feed'?'Так тебя увидят в ленте':'Твой полный профиль'}</h1>
   <p className="vp-subtitle">Первое впечатление начинается здесь ✨</p>
   <section className="preview-surface preview-dating-card">
    <div className="preview-gallery" aria-label="Предпросмотр карточки знакомств" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={swipeEnd}>
     {galleryIds.length?<div className="preview-gallery-track" style={{transform:'translate3d(-33.3333333%,0,0)'}}>{galleryIds.map((id,i)=><div className="preview-gallery-slide" key={id+'-'+i}><Photo id={id} placeholder={photoPlaceholders[String(id)]} className="preview-photo" alt={'Фото '+(i===0?(index-1+ids.length)%ids.length+1:i===1?index+1:(index+1)%ids.length+1)}/></div>)}</div>:<div className="vp-empty-photo"><Icon name="camera" tone="pink" size={44}/></div>}
     {mode==='feed'&&<><div className="veyra-card-shade" aria-hidden="true"/><span className="preview-card-flag">{submitted?'твоя анкета':'твоя карточка'}</span><CardGoalBadge goal={profile.goal} compact top/></>}
     {ids.length>1&&<><button type="button" className="preview-photo-tap left" aria-label="Предыдущее фото" onClick={()=>slide(-1)}/><button type="button" className="preview-photo-tap right" aria-label="Следующее фото" onClick={()=>slide(1)}/></>}
     {mode==='feed'&&<CardCaption profile={profile} age={years} location={profile.city} preview/>}
     <PhotoSegments count={ids.length} index={index} className="preview-photo-segments"/>
     {mode==='detail'&&ids.length>1&&<div className="preview-member-thumbnails" aria-label="Выбор фотографии">{ids.map((id,i)=><button type="button" key={id} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={'Показать фото '+(i+1)}><Photo id={id} alt="" placeholder={photoPlaceholders[String(id)]}/></button>)}</div>}
    </div>
   </section>
   {mode==='detail'&&<div className="vp-detail vp-member-detail member-feed-profile" aria-label="Полная анкета">
    <section className="member-summary vp-member-summary">
     <div className="member-summary-title"><h2>{profile.name||'Имя'}{years?', '+years:''}</h2></div>
     <p className="member-summary-location"><Icon name="pin" tone="pink" size={17}/><span>{profile.city||'Город не указан'}{profile.country?', ':''}{profile.country&&<><CountryFlag country={profile.country}/> {profile.country}</>}</span></p>
    </section>
    <div className="vp-member-info">
     <ProfileHighlights profile={profile}/>
     <section className="info-block vp-member-card"><h3><Icon name="user" tone="pink" size={20}/> Немного о себе</h3><p>{profile.bio?.trim()||'О себе пока ничего не написано'}</p></section>
     <section className="info-block vp-member-card"><h3><Icon name="sparkle" tone="pink" size={20}/> Интересы <small>{interests.length}/12</small></h3><div className="vp-interests">{interests.map(x=><InterestChip key={x} label={x} tone={interestTone(x,INTEREST_GROUPS)} icon={<CatalogueIcon value={x} size={17}/>}/>)}{!interests.length&&<p>Интересы пока не выбраны</p>}</div></section>
     {ids.length>1&&<section className="info-block vp-member-card"><h3><Icon name="image" tone="pink" size={20}/> Фотографии <small>{ids.length}</small></h3><div className="vp-thumbnails">{ids.map((id,i)=><button type="button" key={id} onClick={()=>{setIndex(i);scrollRef.current?.scrollTo({top:0,behavior:'smooth'})}} aria-label={'Посмотреть фотографию '+(i+1)}><Photo id={id} alt={'Фото '+(i+1)} placeholder={photoPlaceholders[String(id)]}/></button>)}</div></section>}
    </div>
   </div>}
  </div>
  {error&&<p className="vp-error" role="alert">{error}</p>}
  <footer className="vp-actions">
   {onSubmit?<><button type="button" className="vp-primary" disabled={submitting||ids.length<3} onClick={onSubmit}>{submitting?'Отправляем…':<><Icon name="check" tone="white" size={22}/> отправить на проверку</>}</button><button type="button" className="vp-secondary" onClick={onEdit||onBack}>редактировать</button></>:
   <><button type="button" className="vp-primary" disabled={submitting} onClick={onEdit}>{submitting?'Открываем…':'Изменить профиль'}</button><button type="button" className="vp-secondary" onClick={onBack}>Назад</button></>}
  </footer>
 </main>;
}
