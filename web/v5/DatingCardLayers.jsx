import React from 'react';
import {Icon} from './UI.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import {goalTitle} from './OnboardingOptions.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import './DatingCardLayers.css';

const goalIcons={relationship:'heart',dating:'flirt',friends:'chats',friendship:'everyone',unsure:'sparkle',flirt:'flirt',casual:'sparkle',travel:'map'};
export function CardGoalBadge({goal,compact=false,top=false}){
 if(!goal||goal==='unsure')return null;
 return <span className={'veyra-card-goal-badge'+(compact?' is-compact':'')+(top?' veyra-card-top-goal':'')}><span className="veyra-card-goal-mark"><Icon name={goalIcons[goal]||'sparkle'} tone="pink" size={compact?13:15}/></span><span className="veyra-card-goal-text">{goalTitle(goal)}</span></span>;
}
export function CardPhotoBars({photos=[],index=0,onSelect,preview=false}){
 if(photos.length<2)return null;
 return <div className={(preview?'preview-dots':'photo-bars')+' veyra-card-photo-bars'} role="group" aria-label="Фотографии анкеты">{photos.map((id,i)=><button type="button" key={id+'-'+i} aria-label={'Фото '+(i+1)} aria-current={index===i?'true':undefined} className={index===i?'active':''} onClick={e=>{e.stopPropagation();onSelect?.(i)}}/>)}</div>;
}
export function CardCaption({profile={},age,location,preview=false,showInterests=true,onProfile}){
 const interestList=Array.isArray(profile.interests)?profile.interests:[];
 const title=profile.name||'Имя';
 // Feed API may append distance to the city, but the registered country remains
 // distinct and always carries its flag.
 const city=profile.city||location?.split(' · ')[0]||'';
 const country=profile.country||'';
 const distance=location?.includes(' · ')?location.split(' · ').slice(1).join(' · '):'';
 return <div className={(preview?'preview-card-caption':'hero-info')+' veyra-card-caption'}>
  {!preview&&profile.online&&<span className="feed-online"><span className="feed-online-dot"/>в сети</span>}
  <div className="veyra-card-name-row">
   {preview?<h2>{title}{age?', '+age:''}</h2>:<><button type="button" className="hero-name" onClick={e=>{e.stopPropagation();onProfile?.()}}>{title}{age?', '+age:''}</button>{profile.test_profile?<span className="vx-demo-caption-label">демо</span>:<Icon name="verified" tone="white" size={20} className="feed-checked"/>}</>}
  </div>
  {(city||country||location)&&<p className={preview?'preview-card-location':'feed-location'}>
   <Icon name="pin" tone="white" size={16}/>
   <span>{city||location}{country?', ':''}{country&&<><CountryFlag country={country}/> {country}</>}{distance&&<span className="veyra-card-distance"> · {distance}</span>}</span>
  </p>}
  {profile.bio?.trim()&&<p className="hero-bio veyra-card-bio">{profile.bio.trim()}</p>}
  {showInterests&&interestList.length>0&&<div className={preview?'veyra-preview-tags veyra-card-tags':'hero-tags veyra-card-tags'}>
   <InterestReveal items={interestList} preview={preview} maxVisible={2}/>
  </div>}
 </div>;
}
