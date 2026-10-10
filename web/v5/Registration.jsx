import React,{useState,useEffect,useRef} from 'react';
import {get,put,post,request,photoOrder} from './api.js';
import {Button,Logo,Icon,Photo,InlineAlert,Spinner,Header} from './UI.jsx';
const interests=['музыка','путешествия','кино','спорт','книги','кофе','технологии','животные','фото','прогулки','искусство','вкусная еда','танцы','йога','мода'];
const empty={name:'',birth_date:'',gender:'',looking_for:['woman'],min_age:18,max_age:40,radius_km:50,city:'',country:'',lat:null,lon:null,interests:[],bio:'',goal:'relationship',smoking:'',leisure:''};
const age=b=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(b))return 0;const d=new Date(b+'T00:00:00Z'),n=new Date();if(Number.isNaN(+d))return 0;let y=n.getUTCFullYear()-d.getUTCFullYear();if(n.getUTCMonth()<d.getUTCMonth()||(n.getUTCMonth()===d.getUTCMonth()&&n.getUTCDate()<d.getUTCDate()))y--;return y;};
export function Registration({me,refresh}){
 const start=me?.registration?.data||{};
 const draftKey='veyra.registration.v5.'+String(me?.user?.id||'anonymous');
 const [step,setStep]=useState(Math.min(5,Math.max(1,me?.registration?.step||1)));
 const[f,setF]=useState({...empty,...start,...(me?.profile||{}),birth_date:String(start.birth_date||me?.profile?.birth_date||'').slice(0,10)});
 const[photos,setPhotos]=useState(me?.photos||[]);
 const[places,setPlaces]=useState([]),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false),[preview,setPreview]=useState(false);
 const photoInput=useRef(null),touch=useRef(null);
 const change=(key,val)=>setF(old=>({...old,[key]:val}));
 useEffect(()=>{localStorage.removeItem('veyra.registration.v5');const draft=localStorage.getItem(draftKey);if(draft&&!me?.registration){try{const d=JSON.parse(draft);setF(old=>({...old,...d.data}));setStep(d.step||1)}catch{localStorage.removeItem(draftKey)}}},[draftKey]);
 useEffect(()=>{localStorage.setItem(draftKey,JSON.stringify({step,data:f}))},[draftKey,step,f]);
 const fail=e=>setError(e.message==='AGE_18_REQUIRED'?'VEYRA доступна с 18 лет':e.message==='VALIDATION_ERROR'?'Проверь заполненные поля':e.message);
 const work=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn()}catch(e){fail(e)}finally{setBusy(false)}};
 const valid=()=>{if(step===1){if(!f.name.trim()||!f.gender)throw Error('Укажи имя и пол');if(age(f.birth_date)<18||age(f.birth_date)>110)throw Error('VEYRA доступна с 18 лет');}if(step===2&&(!f.city||!f.country||f.lat==null||f.lon==null))throw Error('Выбери город из списка');if(step===3&&(!f.looking_for.length||Number(f.min_age)<18||Number(f.max_age)<Number(f.min_age)||Number(f.max_age)>110))throw Error('Проверь предпочтения поиска');};
 const next=()=>work(async()=>{valid();if(step===4){await put('/registration/profile',{...f,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km});await refresh()}else await put('/registration',{step:step+1,data:{...f,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km}});setStep(x=>Math.min(5,x+1));window.scrollTo(0,0)});
 const find=()=>work(async()=>{if(query.trim().length<2)return;const r=await get('/geo?q='+encodeURIComponent(query));setPlaces(r);if(!r.length)throw Error('Город не найден')});
 const locate=()=>{if(!navigator.geolocation){setError('Выбери город вручную');return;}navigator.geolocation.getCurrentPosition(p=>work(async()=>{const r=await get('/geo?lat='+p.coords.latitude+'&lon='+p.coords.longitude);if(!r.length)throw Error('Город не найден');setF(x=>({...x,city:r[0].city,country:r[0].country,lat:r[0].lat,lon:r[0].lon}))}),()=>setError('Нет доступа к геолокации. Выбери город вручную.'),{enableHighAccuracy:false,timeout:12000})};
 const upload=files=>work(async()=>{for(const file of [...files].slice(0,10-photos.length)){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5e6)throw Error('Фото должно быть JPG, PNG или WEBP не больше 5 МБ');const fd=new FormData();fd.append('photo',file);const added=await post('/photos',fd);setPhotos(old=>[...old,{id:added.id,position:old.length}]);}await refresh()});
 const swap=async(from,to)=>{if(to<0||to>=photos.length)return;const a=[...photos];[a[from],a[to]]=[a[to],a[from]];setPhotos(a);try{await photoOrder(a.map(p=>p.id))}catch(e){setPhotos(photos);fail(e)}};
 const remove=i=>work(async()=>{await request('/photos/'+photos[i].id,{method:'DELETE'});setPhotos(x=>x.filter((_,j)=>j!==i));await refresh()});
 const send=()=>work(async()=>{if(photos.length<3)throw Error('Нужно минимум 3 фотографии');if(!consent)throw Error('Прими правила VEYRA');await post('/profile/submit',{consent:true});localStorage.removeItem(draftKey);await refresh()});
 if(preview)return <div className="page"><Header back={()=>setPreview(false)}/><h1>Твоя анкета</h1><div className="preview-card"><Photo className="preview-photo" id={photos[0]?.id}/><h2>{f.name}, {age(f.birth_date)}</h2><p>{f.city}, {f.country}</p><p>{f.bio}</p><p>{f.interests.join(' · ')}</p></div><Button className="full" onClick={()=>setPreview(false)}>вернуться к фото</Button></div>;
 return <div className="page registration">
  <div className="step-top"><button aria-label="Назад" className="quiet" onClick={()=>setStep(Math.max(1,step-1))}><Icon name="back"/></button><small>шаг {step} из 5</small><span/></div>
  <div className="progress">{[1,2,3,4,5].map(n=><span key={n} className={n<=step?'done':''}/>)}</div>
  <div className="center-logo"><Logo width={128}/></div>
  <h1>{['расскажите о себе','где вы ищете?','кого хотите встретить?','ваши интересы','добавьте фото'][step-1]}</h1>
  <p className="subheading">{['Это поможет подобрать подходящих людей','Местоположение поможет находить людей рядом','Выбери, с кем хочется познакомиться','Выбери до 7 интересов и расскажи о себе','Минимум 3 фото, максимум 10. Первое фото — главное'][step-1]}</p>
  {step===1&&<div className="fields">
   <label>Имя<input maxLength={50} value={f.name} onChange={e=>change('name',e.target.value)} placeholder="Как тебя зовут?"/></label>
   <label>Дата рождения<input type="date" max={new Date().toISOString().slice(0,10)} value={f.birth_date} onChange={e=>change('birth_date',e.target.value)}/></label>
   <p className="field-label">Пол</p><div className="choices">{[['man','мужчина'],['woman','женщина']].map(([k,v])=><button type="button" key={k} className={'choice '+(f.gender===k?'selected':'')} onClick={()=>{change('gender',k);if(!f.gender)change('looking_for',k==='man'?['woman']:['man'])}}>{v}</button>)}</div>
  </div>}
  {step===2&&<div className="fields">
   <Button onClick={locate}><Icon name="pin" tone="white" size={18}/> использовать моё местоположение</Button>
   <p className="or">или выберите город вручную</p><div className="search-row"><input placeholder="Город, страна" value={query} onChange={e=>setQuery(e.target.value)}/><button className="quiet" onClick={find}><Icon name="search"/></button></div>
   {places.map(p=><button key={p.label} className="place" onClick={()=>{setF(old=>({...old,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('')}}>{p.label}</button>)}
   {f.city&&<div className="selected-place"><Icon name="pin" tone="pink"/> {f.city}, {f.country}</div>}
   <label>Радиус поиска <b>{f.radius_km>=20000?'без ограничений':f.radius_km+' км'}</b><input type="range" min={5} max={200} value={Math.min(200,f.radius_km)} onChange={e=>change('radius_km',+e.target.value)}/></label>
   <label className="checkline"><input type="checkbox" checked={f.radius_km===20000} onChange={e=>change('radius_km',e.target.checked?20000:50)}/> без ограничения расстояния</label>
  </div>}
  {step===3&&<div className="fields"><p className="field-label">Кого ищешь?</p><div className="choices">{[['woman','женщин'],['man','мужчин'],['all','всех']].map(([k,v])=><button key={k} className={'choice '+((k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k)?'selected':'')} onClick={()=>change('looking_for',k==='all'?['man','woman']:[k])}>{v}</button>)}</div>
  <div className="row"><label>Возраст от<input type="number" min="18" max="110" value={f.min_age} onChange={e=>change('min_age',Number(e.target.value))}/></label><label>Возраст до<input type="number" min="18" max="110" value={f.max_age} onChange={e=>change('max_age',Number(e.target.value))}/></label></div>
  </div>}
  {step===4&&<div className="fields"><p className="field-label">Интересы <span>{f.interests.length}/7</span></p><div className="interest-grid">{interests.map(v=><button key={v} className={'tag '+(f.interests.includes(v)?'selected':'')} onClick={()=>change('interests',f.interests.includes(v)?f.interests.filter(x=>x!==v):f.interests.length<7?[...f.interests,v]:f.interests)}>{v}</button>)}</div>
  <label>О себе<textarea maxLength={1000} value={f.bio} onChange={e=>change('bio',e.target.value)} placeholder="Люблю вечерние прогулки, хорошее кино и живое общение"/></label>
  <label>Цель знакомства<select value={f.goal} onChange={e=>change('goal',e.target.value)}><option value="relationship">отношения</option><option value="dating">свидания</option><option value="friends">дружба</option><option value="unsure">пока не знаю</option></select></label></div>}
  {step===5&&<div className="fields"><p className="tip">Добавь чёткие фото, где видно лицо. На снимках должен быть только ты.</p><div className="upload-grid">{photos.map((p,i)=><div className="upload-thumb" key={p.id} onTouchStart={e=>touch.current={i,x:e.touches[0].clientX}} onTouchEnd={e=>{if(touch.current?.i===i){const dx=e.changedTouches[0].clientX-touch.current.x;if(Math.abs(dx)>50)swap(i,i+(dx>0?1:-1))}}}><Photo id={p.id}/>{i===0&&<span className="cover-label">главное</span>}<button className="thumb-delete" aria-label="Удалить фотографию" onClick={()=>remove(i)}>×</button><div className="thumb-order"><button aria-label="Переместить влево" onClick={()=>swap(i,i-1)} disabled={!i}>‹</button><button aria-label="Переместить вправо" onClick={()=>swap(i,i+1)} disabled={i===photos.length-1}>›</button></div></div>)}{photos.length<10&&<button className="upload-add" onClick={()=>photoInput.current?.click()}><Icon name="plus" tone="pink"/><span>добавить</span></button>}</div>
  <input ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={e=>{upload(e.target.files);e.target.value=''}}/>
  <small>загружено {photos.length} фото · необходимо минимум 3</small>
  {photos.length>0&&<button className="text-link" onClick={()=>setPreview(true)}>посмотреть анкету</button>}
  <label className="checkline"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Мне 18+, согласен с правилами и политикой конфиденциальности</label>
  </div>}
  <InlineAlert>{error}</InlineAlert>
  <div className="registration-actions">{busy?<Spinner/>:<Button className="full" disabled={step===5&&(photos.length<3||!consent)} onClick={step===5?send:next}>{step===5?'отправить на проверку':step===4?'добавить фото':'далее'}</Button>}</div>
 </div>
}
