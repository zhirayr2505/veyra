import React,{useState,useRef} from 'react';
import {get,post,put,request,photoOrder,uploadPhoto} from './api.js';
import {compressPortrait} from './compressPortrait.js';
import {haptic} from './haptics.js';
import './OnboardingUnified.css';
import {Sheet,Button,Photo,InlineAlert,Icon} from './UI.jsx';
import {GoalPicker,InterestPicker,LanguagesPicker,PromptsPicker} from './OnboardingOptions.jsx';
export function ProfileEditor({me,refresh,onClose}){
 const [f,setF]=useState({...me.profile,birth_date:String(me.profile.birth_date||'').slice(0,10)});
 const [photos,setPhotos]=useState(me.photos||[]);
 const [query,setQuery]=useState(''),[places,setPlaces]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const picker=useRef(null),touch=useRef(null);
 const [uploadProgress,setUploadProgress]=useState([]);
 const change=(key,value)=>setF(x=>({...x,[key]:value}));
 const action=async(fn)=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const move=async(i,offset)=>{const j=i+offset;if(j<0||j>=photos.length||busy)return;const copy=[...photos];[copy[i],copy[j]]=[copy[j],copy[i]];setPhotos(copy);try{await photoOrder(copy.map(x=>x.id))}catch(e){setError(e.message);setPhotos(photos)}};
 const upload=e=>{
  const files=[...e.target.files].slice(0,Math.max(0,7-photos.length));e.target.value='';
  if(!files.length)return;
  action(async()=>{
   const result=Array(files.length).fill(null),statuses=files.map(file=>({name:file.name,progress:0}));
   setUploadProgress(statuses);
   let cursor=0;
   const worker=async()=>{while(cursor<files.length){
    const i=cursor++,file=files[i];
    try{
     const compressed=await compressPortrait(file,{maxSide:2048,quality:.86});
     const item=await uploadPhoto(compressed,n=>setUploadProgress(old=>old.map((x,j)=>j===i?{...x,progress:n}:x)));
     result[i]={id:item.id,lqip:item.lqip||null,dominant:item.dominant||null};
     setUploadProgress(old=>old.map((x,j)=>j===i?{...x,progress:100}:x));
    }catch(err){
     setUploadProgress(old=>old.map((x,j)=>j===i?{...x,error:err.message}:x));
    }
   }};
   try{
    await Promise.all(Array.from({length:Math.min(2,files.length)},()=>worker()));
    const successful=result.filter(Boolean);
    if(successful.length){setPhotos(x=>[...x,...successful]);await refresh();haptic('success')}
    if(successful.length!==files.length)setError('Некоторые фото не загрузились. Выбери их снова для повтора.');
   }finally{setTimeout(()=>setUploadProgress([]),1800)}
  });
 };
 const remove=i=>action(async()=>{if(photos.length<=3)throw Error('В профиле должно оставаться минимум 3 фото');await request('/photos/'+photos[i].id,{method:'DELETE'});setPhotos(p=>p.filter((_,j)=>j!==i));});
 const find=()=>action(async()=>{const r=await get('/geo?q='+encodeURIComponent(query));setPlaces(r)});
 const save=()=>action(async()=>{if(photos.length<3)throw Error('Нужно минимум 3 фотографии');const data={name:f.name,birth_date:f.birth_date,gender:f.gender,looking_for:f.looking_for,bio:f.bio||'',interests:f.interests||[],smoking:f.smoking||'',leisure:f.leisure||'',goal:f.goal||'relationship',languages:f.languages||[],prompts:(f.prompts||[]).filter(x=>x.answer?.trim()),height_cm:f.height_cm?Number(f.height_cm):null,city:f.city,country:f.country,lat:+f.lat,lon:+f.lon,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km,consent:true};
 if(!window.confirm('Обновлённая анкета пройдет повторную модерацию. Продолжить?'))return;
 await put('/profile',data);await post('/profile/submit',{consent:true});await refresh();onClose();});
 return <Sheet title="Анкета" onClose={onClose}><div className="fields veyra-editor-unified">
 <label>Имя<input value={f.name||''} maxLength={50} onChange={e=>change('name',e.target.value)}/></label>
 <label>Дата рождения<input type="date" value={f.birth_date} onChange={e=>change('birth_date',e.target.value)}/></label>
 <label>О себе<textarea maxLength={1000} value={f.bio||''} onChange={e=>change('bio',e.target.value)}/></label>
 <div className="veyra-editor-group"><InterestPicker value={f.interests||[]} onChange={v=>change('interests',v)}/></div>
 <div className="veyra-editor-group"><h3>Цель знакомства</h3><GoalPicker value={f.goal||'relationship'} onChange={v=>change('goal',v)}/></div><div className="veyra-editor-group"><LanguagesPicker value={f.languages||[]} onChange={v=>change('languages',v)}/></div><div className="veyra-editor-group"><PromptsPicker value={f.prompts||[]} onChange={v=>change('prompts',v)}/></div><div className="veyra-editor-group"><h3>Немного о себе</h3><label>Рост, см (необязательно)<input type="number" min="120" max="230" value={f.height_cm||''} onChange={e=>change('height_cm',e.target.value||null)}/></label><label>Курение<select value={f.smoking||''} onChange={e=>change('smoking',e.target.value)}><option value="">Не указывать</option><option value="no">Не курю</option><option value="sometimes">Иногда</option><option value="yes">Курю</option></select></label><label>Отдых<select value={f.leisure||''} onChange={e=>change('leisure',e.target.value)}><option value="">Не указывать</option><option value="active">Активный</option><option value="quiet">Спокойный</option><option value="depends">По настроению</option></select></label></div>
 <p className="field-label">Город: {f.city}, {f.country}</p><div className="search-row"><input value={query} placeholder="Искать другой город" onChange={e=>setQuery(e.target.value)}/><Button disabled={busy||query.trim().length<2} onClick={find}>найти</Button></div>
 {places.map((p,i)=><button className="place" key={i} onClick={()=>{setF(v=>({...v,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('')}}>{p.label}</button>)}
 <h3>мои фотографии</h3><div className="upload-grid">{photos.map((p,i)=><div key={p.id} className="upload-thumb" onTouchStart={e=>touch.current={i,x:e.touches[0].clientX}} onTouchEnd={e=>{if(!touch.current)return;const delta=e.changedTouches[0].clientX-touch.current.x;if(Math.abs(delta)>50)move(i,delta>0?-1:1);touch.current=null}}><Photo id={p.id}/>{i===0&&<span className="cover-label">главное</span>}<button className="thumb-delete" disabled={busy||photos.length<=3} onClick={()=>remove(i)}>×</button><div className="thumb-order"><button disabled={busy||!i} onClick={()=>move(i,-1)}>‹</button><button disabled={busy||i===photos.length-1} onClick={()=>move(i,1)}>›</button></div></div>)}{photos.length<7&&<button className="upload-add" disabled={busy} onClick={()=>picker.current?.click()}><Icon name="plus" tone="pink"/><span>добавить</span></button>}</div>
 <input ref={picker} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={upload}/>{uploadProgress.length>0&&<div className="veyra-editor-upload-status" aria-live="polite">{uploadProgress.map((p,i)=><div key={i}><span>{p.name}</span><progress max={100} value={p.progress}/>{p.error?<small role="alert">{p.error}</small>:<small>{p.progress}%</small>}</div>)}</div>}
 <p className="tip">После публикации изменений анкета снова отправляется на ручную проверку.</p></div><InlineAlert>{error}</InlineAlert><Button variant="primary" className="full veyra-editor-save" disabled={busy} onClick={save}>сохранить и отправить на проверку</Button></Sheet>;
}
