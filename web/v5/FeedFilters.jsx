import React,{useEffect,useState} from 'react';
import {Check,MapPin,Mars,UsersRound,Venus,X} from 'lucide-react';
import {get,patch} from './api.js';
import {Button,InlineAlert,Sheet} from './UI.jsx';
import './FeedFilters.css';

const allGenders=['man','woman','other'];
export function FeedFilters({profile,filters,onClose,onSave}){
 const [p,set]=useState({
  looking_for:profile.looking_for?.length?profile.looking_for:allGenders,
  min_age:profile.min_age??18,max_age:profile.max_age??40,radius_km:profile.radius_km??50,
  city:profile.filter_city||'',mode:filters.mode||'discover',
  only_online:!!filters.only_online,common_interests:!!filters.common_interests
 });
 const [query,setQuery]=useState(p.city),[places,setPlaces]=useState([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [searching,setSearching]=useState(false);
 const setP=(key,value)=>set(x=>({...x,[key]:value}));
 useEffect(()=>{
  let live=true;
  if(query.trim().length<2||query.trim()===profile.filter_city){setPlaces([]);setSearching(false);return;}
  setSearching(true);
  const timer=setTimeout(()=>get('/geo?q='+encodeURIComponent(query.trim())+'&autocomplete=true')
   .then(result=>{if(live)setPlaces(Array.isArray(result)?result:[])})
   .catch(()=>{if(live)setPlaces([])})
   .finally(()=>{if(live)setSearching(false)}),350);
  return()=>{live=false;clearTimeout(timer)};
 },[query,profile.filter_city]);
 const reset=()=>{
  set({...p,min_age:18,max_age:110,radius_km:20000,city:'',mode:'discover',
   only_online:false,common_interests:false,looking_for:allGenders});
  setQuery('');setPlaces([]);setError('');
 };
 const save=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   await patch('/preferences',{min_age:+p.min_age,max_age:+p.max_age,radius_km:+p.radius_km,
    looking_for:p.looking_for,city:p.city.trim()});
   await onSave({mode:p.mode,only_online:p.only_online,common_interests:p.common_interests});
   onClose();
  }catch(e){setError('Не удалось сохранить фильтры: '+e.message)}
  finally{setBusy(false)}
 };
 const selected=key=>key==='all'?p.looking_for.length===allGenders.length:
  p.looking_for.length===1&&p.looking_for[0]===key;
 return <Sheet title="фильтры" onClose={onClose}>
  <div className="feed-filter-sheet">
   <button type="button" className="feed-filter-reset" onClick={reset}>Сбросить</button>
   <section className="feed-filter-group">
    <h3>Кого показывать</h3>
    <div className="feed-filter-genders">
     {[['woman','Женщин',Venus],['man','Мужчин',Mars],['all','Всех',UsersRound]].map(([key,label,Symbol])=>
      <button type="button" key={key} aria-pressed={selected(key)} className={'feed-filter-gender '+(selected(key)?'selected':'')}
       onClick={()=>setP('looking_for',key==='all'?allGenders:[key])}><Symbol size={24} strokeWidth={1.9} aria-hidden="true"/><span>{label}</span></button>)}
    </div>
   </section>
   <section className="feed-filter-group">
    <div className="feed-filter-heading"><h3>Возраст</h3><span>{p.min_age} – {p.max_age} лет</span></div>
    <div className="feed-filter-two-range">
     <label>От <input type="range" min="18" max="110" value={p.min_age} aria-label="Возраст от"
      onChange={e=>setP('min_age',Math.min(Number(e.target.value),Number(p.max_age)))}/></label>
     <label>До <input type="range" min="18" max="110" value={p.max_age} aria-label="Возраст до"
      onChange={e=>setP('max_age',Math.max(Number(e.target.value),Number(p.min_age)))}/></label>
    </div>
   </section>
   <section className="feed-filter-group">
    <div className="feed-filter-heading"><h3>Расстояние</h3><span>{p.radius_km===20000?'Весь мир':'До '+p.radius_km+' км'}</span></div>
    <input aria-label="Расстояние" type="range" min="5" max="200" step="5" disabled={p.radius_km===20000}
     value={Math.min(p.radius_km,200)} onChange={e=>setP('radius_km',Number(e.target.value))}/>
    <label className="feed-filter-toggle"><span>По всему миру</span><input type="checkbox" checked={p.radius_km===20000}
     onChange={e=>setP('radius_km',e.target.checked?20000:50)}/><span className="feed-filter-switch"/></label>
   </section>
   <section className="feed-filter-group feed-filter-city-group">
    <h3>Город</h3>
    <div className="feed-filter-city"><MapPin size={18} aria-hidden="true"/><input value={query} placeholder="Любой город" aria-label="Город"
     onChange={e=>{setQuery(e.target.value);setP('city',e.target.value)}}/>
     {query&&<button type="button" aria-label="Очистить город" onClick={()=>{setQuery('');setP('city','');setPlaces([])}}><X size={16}/></button>}</div>
    {searching&&<p className="feed-filter-hint">Ищем город…</p>}
    {places.length>0&&<div className="feed-filter-city-options" role="listbox" aria-label="Найденные города">{places.slice(0,6).map((place,i)=>
     <button type="button" role="option" key={place.label+'-'+i} aria-selected="false" onClick={()=>{setQuery(place.city);setP('city',place.city);setPlaces([])}}>
      <MapPin size={16}/><span>{place.city}{place.country?' · '+place.country:''}</span></button>)}</div>}
   </section>
   <section className="feed-filter-group">
    <h3>Дополнительные фильтры</h3>
    <label className="feed-filter-toggle"><span><b>Сейчас онлайн</b><small>Показывать тех, кто недавно был в приложении</small></span>
     <input type="checkbox" checked={p.only_online} onChange={e=>setP('only_online',e.target.checked)}/><span className="feed-filter-switch"/></label>
    <label className="feed-filter-toggle"><span><b>С общими интересами</b><small>Хотя бы один интерес совпадает</small></span>
     <input type="checkbox" checked={p.common_interests} onChange={e=>setP('common_interests',e.target.checked)}/><span className="feed-filter-switch"/></label>
    <p className="feed-filter-hint"><Check size={15} aria-hidden="true"/> Все анкеты в ленте проходят модерацию и содержат фото</p>
   </section>
   <InlineAlert>{error}</InlineAlert>
   <Button className="full feed-filter-submit" disabled={busy||!p.looking_for.length} onClick={save}>{busy?'Сохраняем…':'Показать анкеты'}</Button>
  </div>
 </Sheet>;
}
