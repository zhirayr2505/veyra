import React,{useState,useRef} from 'react';
import {get,post,put,request,photoOrder} from './api.js';
import {Sheet,Button,Photo,InlineAlert,Icon} from './UI.jsx';
export function ProfileEditor({me,refresh,onClose}){
 const [f,setF]=useState({...me.profile,birth_date:String(me.profile.birth_date||'').slice(0,10)});
 const [photos,setPhotos]=useState(me.photos||[]);
 const [query,setQuery]=useState(''),[places,setPlaces]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const picker=useRef(null),touch=useRef(null);
 const change=(key,value)=>setF(x=>({...x,[key]:value}));
 const action=async(fn)=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const move=async(i,offset)=>{const j=i+offset;if(j<0||j>=photos.length||busy)return;const copy=[...photos];[copy[i],copy[j]]=[copy[j],copy[i]];setPhotos(copy);try{await photoOrder(copy.map(x=>x.id))}catch(e){setError(e.message);setPhotos(photos)}};
 const upload=e=>{const files=[...e.target.files];e.target.value='';action(async()=>{for(const file of files.slice(0,10-photos.length)){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024)throw Error('Используй фото JPG, PNG или WEBP до 5 МБ');const fd=new FormData();fd.append('photo',file);const r=await post('/photos',fd);setPhotos(x=>[...x,{id:r.id}]);}})};
 const remove=i=>action(async()=>{if(photos.length<=3)throw Error('В профиле должно оставаться минимум 3 фото');await request('/photos/'+photos[i].id,{method:'DELETE'});setPhotos(p=>p.filter((_,j)=>j!==i));});
 const find=()=>action(async()=>{const r=await get('/geo?q='+encodeURIComponent(query));setPlaces(r)});
 const save=()=>action(async()=>{if(photos.length<3)throw Error('Нужно минимум 3 фотографии');const data={name:f.name,birth_date:f.birth_date,gender:f.gender,looking_for:f.looking_for,bio:f.bio||'',interests:f.interests||[],smoking:f.smoking||'',leisure:f.leisure||'',goal:f.goal||'relationship',city:f.city,country:f.country,lat:+f.lat,lon:+f.lon,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km,consent:true};
 if(!window.confirm('Обновлённая анкета пройдет повторную модерацию. Продолжить?'))return;
 await put('/profile',data);await post('/profile/submit',{consent:true});await refresh();onClose();});
 return <Sheet title="редактировать анкету" onClose={onClose}><div className="fields">
 <label>Имя<input value={f.name||''} maxLength={50} onChange={e=>change('name',e.target.value)}/></label>
 <label>Дата рождения<input type="date" value={f.birth_date} onChange={e=>change('birth_date',e.target.value)}/></label>
 <label>О себе<textarea maxLength={1000} value={f.bio||''} onChange={e=>change('bio',e.target.value)}/></label>
 <label>Интересы (через запятую, не более 7)<input value={(f.interests||[]).join(', ')} onChange={e=>change('interests',e.target.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,7))}/></label>
 <label>Цель<select value={f.goal||'relationship'} onChange={e=>change('goal',e.target.value)}><option value="relationship">отношения</option><option value="dating">свидания</option><option value="friends">дружба</option><option value="unsure">пока не знаю</option></select></label>
 <p className="field-label">Город: {f.city}, {f.country}</p><div className="search-row"><input value={query} placeholder="Искать другой город" onChange={e=>setQuery(e.target.value)}/><Button disabled={busy||query.trim().length<2} onClick={find}>найти</Button></div>
 {places.map((p,i)=><button className="place" key={i} onClick={()=>{setF(v=>({...v,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('')}}>{p.label}</button>)}
 <h3>мои фотографии</h3><div className="upload-grid">{photos.map((p,i)=><div key={p.id} className="upload-thumb" onTouchStart={e=>touch.current={i,x:e.touches[0].clientX}} onTouchEnd={e=>{if(!touch.current)return;const delta=e.changedTouches[0].clientX-touch.current.x;if(Math.abs(delta)>50)move(i,delta>0?-1:1);touch.current=null}}><Photo id={p.id}/>{i===0&&<span className="cover-label">главное</span>}<button className="thumb-delete" disabled={busy||photos.length<=3} onClick={()=>remove(i)}>×</button><div className="thumb-order"><button disabled={busy||!i} onClick={()=>move(i,-1)}>‹</button><button disabled={busy||i===photos.length-1} onClick={()=>move(i,1)}>›</button></div></div>)}{photos.length<10&&<button className="upload-add" disabled={busy} onClick={()=>picker.current?.click()}><Icon name="plus" tone="pink"/><span>добавить</span></button>}</div>
 <input ref={picker} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={upload}/>
 <p className="tip">После публикации изменений анкета снова отправляется на ручную проверку.</p></div><InlineAlert>{error}</InlineAlert><Button className="full" disabled={busy} onClick={save}>сохранить и отправить на проверку</Button></Sheet>;
}
