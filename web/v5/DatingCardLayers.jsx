import React from 'react';
import {Icon} from './UI.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import {goalTitle} from './OnboardingOptions.jsx';
import './DatingCardLayers.css';

const goalIcons={relationship:'heart',dating:'flirt',friends:'chats',friendship:'everyone',unsure:'sparkle',flirt:'flirt'};
export function CardGoalBadge({goal}){
 if(!goal)return null;
 return <span className="veyra-card-goal-badge"><span className="veyra-card-goal-mark"><Icon name={goalIcons[goal]||'sparkle'} tone="pink" size={15}/></span><span>{goalTitle(goal)}</span></span>;
}
export function CardPhotoBars({photos=[],index=0,onSelect,preview=false}){
 if(photos.length<2)return null;
 return <div className={(preview?'preview-dots':'photo-bars')+' veyra-card-photo-bars'} role="group" aria-label="Фотографии анкеты">{photos.map((id,i)=><button type="button" key={id+'-'+i} aria-label={'Фото '+(i+1)} aria-current={index===i?'true':undefined} className={index===i?'active':''} onClick={e=>{e.stopPropagation();onSelect?.(i)}}/>)}</div>;
}
export function CardCaption({profile={},age,location,preview=false,showInterests=true,onProfile}){
 const interestList=Array.isArray(profile.interests)?profile.interests:[];
 const title=profile.name||'Имя';
 return <div className={(preview?'preview-card-caption':'hero-info')+' veyra-card-caption'}>
  {!preview&&profile.online&&<span className="feed-online"><span className="feed-online-dot"/>в сети</span>}
  <div className="veyra-card-name-row">
   {preview?<h2>{title}{age?', '+age:''}</h2>:<><button type="button" className="hero-name" onClick={e=>{e.stopPropagation();onProfile?.()}}>{title}{age?', '+age:''}</button><Icon name="verified" tone="white" size={20} className="feed-checked"/></>}
  </div>
  <CardGoalBadge goal={profile.goal}/>
  {location&&<p className={preview?'preview-card-location':'feed-location'}><Icon name="pin" tone="white" size={16}/><span>{location}</span></p>}
  {!preview&&profile.bio&&<p className="hero-bio">{profile.bio}</p>}
  {showInterests&&interestList.length>0&&<div className={preview?'veyra-preview-tags':'hero-tags'}><InterestReveal items={interestList} preview={preview}/></div>}
 </div>;
}