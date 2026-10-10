import React,{useState,useEffect,useRef} from 'react';
import {get,put,post,request,photoOrder} from './api.js';
import {Button,Logo,Icon,Photo,InlineAlert,Spinner,Header} from './UI.jsx';

const MAX_PHOTOS=7,MIN_PHOTOS=3;
const interests=['музыка','путешествия','кино','спорт','книги','кофе','технологии','животные','фото','прогулки','искусство','вкусная еда','танцы','йога','мода'];
const empty={name:'',birth_date:'',gender:'',looking_for:['woman'],min_age:18,max_age:40,radius_km:50,city:'',country:'',lat:null,lon:null,interests:[],bio:'',goal:'relationship',smoking:'',leisure:''};
const age=b=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(b))return 0;const d=new Date(b+'T00:00:00Z'),n=new Date();if(Number.isNaN(+d))return 0;let y=n.getUTCFullYear()-d.getUTCFullYear();if(n.getUTCMonth()<d.getUTCMonth()||(n.getUTCMonth()===d.getUTCMonth()&&n.getUTCDate()<d.getUTCDate()))y--;return y;};
const progress=(value,min,max)=>Math.max(0,Math.min(100,100*(value-min)/(max-min)));
function Slider({value,min,max,step=1,onChange,label}){return <div className="veyra-slider"><input aria-label={label} type="range" min={min} max={max} step={step} value={value} style={{'--slider-fill':progress(value,min,max)+'%'}} onChange={e=>onChange(+e.target.value)}/></div>}
function AgeRange({min,max,onChange}){const start=Math.min(90,Math.max(18,min)),end=Math.min(90,Math.max(start,max));return <div className="age-range">
 <div className="range-labels"><span>Возраст от <strong>{start}</strong></span><span>до <strong>{end}</strong></span></div>
 <div className="age-range-rails" style={{'--range-start':progress(start,18,90)+'%','--range-end':progress(end,18,90)+'%'}}>
 <div className="age-range-bar"/><input type="range" aria-label="Возраст от" min="18" max="90" value={start} onChange={e=>onChange(Math.min(+e.target.value,end),end)}/>
 <input type="range" aria-label="Возраст до" min="18" max="90" value={end} onChange={e=>onChange(start,Math.max(+e.target.value,start))}/></div>
 <div className="range-ends"><span>18 лет</span><span>90 лет</span></div>
 </div>}

export function Registration({me,refresh}){
 const start=me?.registration?.data||{},draftKey='veyra.registration.v5.'+String(me?.user?.id||'anonymous');
 const [step,setStep]=useState(Math.min(5,Math.max(1,me?.registration?.step||1))),[direction,setDirection]=useState('forward');
 const [f,setF]=useState({...empty,...start,...(me?.profile||{}),birth_date:String(start.birth_date||me?.profile?.birth_date||'').slice(0,10)});
 const [photos,setPhotos]=useState(me?.photos||[]),[jobs,setJobs]=useState([]),[uploading,setUploading]=useState(false);
 const [cityEdit,setCityEdit]=useState(!start.city&&!me?.profile?.city),[places,setPlaces]=useState([]),[query,setQuery]=useState(''),[searching,setSearching]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState(''),[consent,setConsent]=useState(false),[preview,setPreview]=useState(false);
 const photoInput=useRef(null),dragFrom=useRef(null),hintTimer=useRef(null),uploadRunning=useRef(false);
 const change=(key,val)=>setF(old=>({...old,[key]:val}));
 const toast=message=>{setHint(message);clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(''),3400)};
 useEffect(()=>{localStorage.removeItem('veyra.registration.v5');const saved=localStorage.getItem(draftKey);if(saved&&!me?.registration){try{const d=JSON.parse(saved);setF(old=>({...old,...d.data}));setStep(Math.min(5,Math.max(1,d.step||1)));if(d.data?.city)setCityEdit(false)}catch{localStorage.removeItem(draftKey)}}return()=>clearTimeout(hintTimer.current)},[draftKey]);
 useEffect(()=>{localStorage.setItem(draftKey,JSON.stringify({step,data:f}))},[draftKey,step,f]);
 useEffect(()=>{if(!cityEdit||query.trim().length<2){setPlaces([]);setSearching(false);return;}let alive=true;setSearching(true);
  const timer=setTimeout(()=>get('/geo?q='+encodeURIComponent(query.trim())+'&autocomplete=true').then(r=>{if(alive)setPlaces(r||[])}).catch(()=>{if(alive){setPlaces([]);setError('Поиск городов пока недоступен')}}).finally(()=>{if(alive)setSearching(false)}),330);
  return()=>{alive=false;clearTimeout(timer)};
 },[query,cityEdit]);
 const fail=e=>setError(e.message==='AGE_18_REQUIRED'?'VEYRA доступна с 18 лет':e.message==='VALIDATION_ERROR'?'Проверь заполненные поля':e.message);
 const work=async fn=>{if(busy||uploading)return;setBusy(true);setError('');try{await fn()}catch(e){fail(e)}finally{setBusy(false)}};
 const valid=()=>{if(step===1){if(!f.name.trim()||!f.gender)throw Error('Укажи имя и пол');if(age(f.birth_date)<18||age(f.birth_date)>110)throw Error('VEYRA доступна с 18 лет')}
 if(step===2&&(!f.city||!f.country||f.lat==null||f.lon==null))throw Error('Выбери реальный город из предложенного списка');
 if(step===3&&(!f.looking_for.length||Number(f.min_age)<18||Number(f.max_age)<Number(f.min_age)||Number(f.max_age)>90))throw Error('Проверь возраст и предпочтения поиска')};
 const go=(n,dir)=>{setDirection(dir);setStep(Math.min(5,Math.max(1,n)));window.scrollTo({top:0,behavior:'instant'})};
 const next=()=>work(async()=>{valid();const data={...f,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km};
  if(step===4){await put('/registration/profile',data);await refresh()}else await put('/registration',{step:step+1,data});
  go(step+1,'forward');
 });
 const choosePlace=p=>{setF(old=>({...old,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('');setCityEdit(false);setError('')};
 const locate=()=>{setError('');if(!navigator.geolocation){setCityEdit(true);setError('Геолокация недоступна. Выбери город из списка.');return}
 navigator.geolocation.getCurrentPosition(pos=>work(async()=>{const found=await get('/geo?lat='+pos.coords.latitude+'&lon='+pos.coords.longitude);if(!found.length)throw Error('Не удалось определить город');choosePlace(found[0])}),()=>{setCityEdit(true);setError('Разрешение на геолокацию не получено. Выбери город вручную.')},{enableHighAccuracy:false,timeout:12000,maximumAge:90000});
 };
 const upload=async fileList=>{if(uploadRunning.current||busy)return;const files=Array.from(fileList||[]);const remaining=MAX_PHOTOS-photos.length;
 if(!remaining){toast('Можно добавить максимум 7 фото');return}
 if(files.length>remaining)toast('Можно добавить максимум 7 фото — добавляем первые '+remaining);
 const selected=files.slice(0,remaining),bad=selected.find(file=>!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024);
 if(bad){setError('Каждое фото должно быть JPG, PNG или WEBP, до 5 МБ');return}
 if(!selected.length)return;
 uploadRunning.current=true;setUploading(true);setError('');
 const initial=selected.map((file,i)=>({id:'upload-'+i+'-'+Date.now(),file,preview:URL.createObjectURL(file),status:'waiting',serverId:null}));
 setJobs(initial);
 try{for(const item of initial){
  setJobs(old=>old.map(x=>x.id===item.id?{...x,status:'loading'}:x));
  try{const fd=new FormData();fd.append('photo',item.file);const result=await post('/photos',fd);
   setPhotos(old=>[...old,{id:result.id,position:old.length}]);
   setJobs(old=>old.map(x=>x.id===item.id?{...x,status:'done',serverId:result.id}:x));
  }catch(e){setJobs(old=>old.map(x=>x.id===item.id?{...x,status:'failed'}:x));setError('Не удалось загрузить «'+item.file.name+'»: '+e.message)}
 }
 await refresh();
 await new Promise(resolve=>setTimeout(resolve,700));
 }finally{initial.forEach(x=>URL.revokeObjectURL(x.preview));setJobs([]);uploadRunning.current=false;setUploading(false)}
 };
 const reorder=async(from,to)=>{if(uploading||busy||from===to||from<0||to<0||from>=photos.length||to>=photos.length)return;
 const before=photos,arr=[...photos],moved=arr.splice(from,1)[0];arr.splice(to,0,moved);setPhotos(arr);
 try{await photoOrder(arr.map(p=>p.id))}catch(e){setPhotos(before);fail(e)}
 };
 const pointerUp=e=>{const from=dragFrom.current;dragFrom.current=null;if(from==null)return;
  const els=document.elementsFromPoint(e.clientX,e.clientY),slot=els.map(el=>el.closest?.('[data-slot-index]')).find(el=>el&&Number(el.dataset.slotIndex)!==from);
  if(slot)reorder(from,+slot.dataset.slotIndex);
 };
 const remove=i=>work(async()=>{await request('/photos/'+photos[i].id,{method:'DELETE'});setPhotos(old=>old.filter((_,j)=>j!==i));await refresh()});
 const send=()=>work(async()=>{if(photos.length<MIN_PHOTOS)throw Error('Нужно минимум 3 фотографии');if(!consent)throw Error('Прими правила VEYRA');await post('/profile/submit',{consent:true});localStorage.removeItem(draftKey);await refresh()});
 const display=[...photos.filter(p=>!jobs.some(job=>job.serverId===p.id)),...jobs];
 const selectedCity=!!f.city&&!!f.country&&f.lat!=null&&f.lon!=null;
 if(preview)return <div className="page"><Header back={()=>setPreview(false)}/><h1>Твоя анкета</h1><div className="preview-card"><Photo className="preview-photo" id={photos[0]?.id}/><h2>{f.name}, {age(f.birth_date)}</h2><p>{f.city}, {f.country}</p><p>{f.bio}</p><p>{f.interests.join(' · ')}</p></div><Button className="full" onClick={()=>setPreview(false)}>вернуться к фото</Button></div>;
 return <div className="page registration registration-v6">
  <div className="step-top"><button aria-label="Назад" className="quiet" onClick={()=>!busy&&!uploading&&go(step-1,'backward')} disabled={step===1||busy||uploading}><Icon name="back"/></button><small>шаг {step} из 5</small><span/></div>
  <div className="progress" aria-label={'Шаг '+step+' из 5'}>{[1,2,3,4,5].map(n=><span key={n} className={n<=step?'done':''}/>)}</div>
  <div className="center-logo"><Logo width={128}/></div>
  <div className={'registration-step '+direction} key={step}>
   <h1>{['расскажите о себе','где вы ищете?','кого хотите встретить?','ваши интересы','добавьте фото'][step-1]}</h1>
   <p className="subheading">{['Начнём знакомство с тебя','Будем показывать людей из твоего города','Настрой комфортный поиск','Что делает тебя тобой?','Главная слева, ещё шесть справа · максимум 7'][step-1]}</p>
   {step===1&&<div className="fields">
    <label>Имя<input maxLength={50} value={f.name} onChange={e=>change('name',e.target.value)} placeholder="Как тебя зовут?"/></label>
    <label>Дата рождения<input type="date" max={new Date().toISOString().slice(0,10)} value={f.birth_date} onChange={e=>change('birth_date',e.target.value)}/></label>
    <p className="field-label">Пол</p><div className="choices">{[['man','мужчина'],['woman','женщина']].map(([k,v])=><button type="button" key={k} className={'choice '+(f.gender===k?'selected':'')} onClick={()=>{setF(old=>({...old,gender:k,looking_for:!old.gender?(k==='man'?['woman']:['man']):old.looking_for}))}}>{v}</button>)}</div>
   </div>}
   {step===2&&<div className="fields">
    {selectedCity&&!cityEdit?<div className="location-card">
     <span className="location-mark"><Icon name="pin" tone="pink" size={32}/></span><small>Твоё местоположение</small><h2>{f.city}</h2><p>{f.country}</p><button className="location-change" onClick={()=>{setCityEdit(true);setQuery('')}}>изменить город</button>
    </div>:<><Button onClick={locate} disabled={busy}><Icon name="pin" tone="white" size={18}/> использовать моё местоположение</Button>
     <p className="or">или найди свой город</p>
     <div className="city-search"><Icon name="search" size={19}/><input aria-label="Поиск города" autoComplete="off" placeholder="Начни вводить название города" value={query} onChange={e=>{setQuery(e.target.value);setF(old=>({...old,city:'',country:'',lat:null,lon:null}))}}/>{searching&&<span className="city-spinner"/>}</div>
     {places.length>0&&<div className="city-results" role="listbox" aria-label="Результаты поиска городов">{places.map((p,i)=><button type="button" role="option" aria-selected="false" key={p.label+'-'+i} onClick={()=>choosePlace(p)}><Icon name="pin" tone="pink" size={17}/><span><b>{p.city}</b><small>{p.country}</small></span></button>)}</div>}
     {!searching&&query.trim().length>=2&&!places.length&&<p className="city-empty">Не нашли такой город. Проверь написание.</p>}
    </>}
    {selectedCity&&<div className="distance-control"><div className="range-labels"><span>Радиус поиска</span><strong>{f.radius_km>=20000?'весь мир':f.radius_km+' км'}</strong></div>
      <Slider min={5} max={500} step={5} label="Радиус поиска" value={Math.min(500,f.radius_km)} onChange={v=>change('radius_km',v)}/>
      <div className="range-ends"><span>5 км</span><span>500 км</span></div>
      <label className="checkline"><input type="checkbox" checked={f.radius_km===20000} onChange={e=>change('radius_km',e.target.checked?20000:50)}/>Искать по всему миру</label>
     </div>}
   </div>}
   {step===3&&<div className="fields"><p className="field-label">Кого ищешь?</p><div className="choices">{[['woman','женщин'],['man','мужчин'],['all','всех']].map(([k,v])=><button key={k} className={'choice '+((k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k)?'selected':'')} onClick={()=>change('looking_for',k==='all'?['man','woman']:[k])}>{v}</button>)}</div>
    <AgeRange min={f.min_age} max={f.max_age} onChange={(min,max)=>setF(old=>({...old,min_age:min,max_age:max}))}/>
   </div>}
   {step===4&&<div className="fields"><p className="field-label">Интересы <span>{f.interests.length}/7</span></p><div className="interest-grid">{interests.map(v=><button key={v} className={'tag '+(f.interests.includes(v)?'selected':'')} onClick={()=>change('interests',f.interests.includes(v)?f.interests.filter(x=>x!==v):f.interests.length<7?[...f.interests,v]:f.interests)}>{v}</button>)}</div>
    <label>О себе<textarea maxLength={1000} value={f.bio} onChange={e=>change('bio',e.target.value)} placeholder="Люблю вечерние прогулки, хорошее кино и живое общение"/></label>
    <label>Цель знакомства<select value={f.goal} onChange={e=>change('goal',e.target.value)}><option value="relationship">отношения</option><option value="dating">свидания</option><option value="friends">дружба</option><option value="unsure">пока не знаю</option></select></label>
   </div>}
   {step===5&&<div className="fields">
    <p className="tip">Фото с настоящим лицом, без чужих людей. Зажми фотографию и перетащи в нужное место.</p>
    <div className="photo-layout" aria-label="Фотографии профиля">
     {Array.from({length:MAX_PHOTOS},(_,i)=>{const item=display[i],loading=!!item?.file;
      return item?<div key={item.id} className={'photo-slot '+(i===0?'primary ':'')+(loading?'uploading ':'')} data-slot-index={i} draggable={!uploading&&!busy&&!loading}
       onDragStart={e=>{if(uploading||busy){e.preventDefault();return}dragFrom.current=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i))}}
       onDragOver={e=>{if(!uploading&&!busy)e.preventDefault()}} onDrop={e=>{e.preventDefault();const from=dragFrom.current;dragFrom.current=null;if(from!=null)reorder(from,i)}}
       onPointerDown={e=>{if(e.target.closest('button')||uploading||busy)return;dragFrom.current=i;e.currentTarget.setPointerCapture?.(e.pointerId);e.currentTarget.classList.add('dragging')}}
       onPointerUp={e=>{e.currentTarget.classList.remove('dragging');pointerUp(e)}}
       onPointerCancel={e=>{e.currentTarget.classList.remove('dragging');dragFrom.current=null}}
       tabIndex={!loading?0:-1} aria-label={'Фотография '+(i+1)+', перетащи для смены позиции'}
       onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();reorder(i,i+(e.key==='ArrowRight'?1:-1))}}}>
        {loading?<img className="upload-preview" alt="" src={item.preview}/>:<Photo id={item.id}/>}
        {i===0&&<span className="cover-label">главное фото</span>}
        {loading?<span className={'upload-state '+item.status}>{item.status==='done'?<Icon name="check" tone="white" size={23}/>:item.status==='failed'?'!':<span className="spinner-ring"/>}</span>:
        <button className="thumb-delete" aria-label={'Удалить фотографию '+(i+1)} disabled={busy||uploading} onPointerDown={e=>e.stopPropagation()} onClick={()=>remove(i)}>×</button>}
       </div>:<button key={'empty'+i} className={'photo-slot photo-slot-add '+(i===0?'primary':'')} onClick={()=>photoInput.current?.click()} disabled={busy||uploading}>
        <Icon name={i===0?'camera':'plus'} tone="pink" size={i===0?31:23}/>{i===0&&<span>главное фото</span>}
       </button>})}
    </div>
    <input ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={e=>{const selected=e.target.files;upload(selected);e.target.value=''}}/>
    <p className="photo-footnote">{uploading?'Загружаем фотографии по очереди…':'Загружено '+photos.length+' из '+MAX_PHOTOS+' · минимум '+MIN_PHOTOS}</p>
    {photos.length>0&&!uploading&&<button className="text-link" onClick={()=>setPreview(true)}>посмотреть анкету</button>}
    <label className="checkline"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Мне 18+, согласен с правилами и политикой конфиденциальности</label>
   </div>}
  </div>
  {hint&&<div className="registration-toast" role="status">{hint}</div>}
  <InlineAlert>{error}</InlineAlert>
  <div className="registration-actions">{busy?<Spinner/>:<Button className="full" disabled={uploading||(step===5&&(photos.length<MIN_PHOTOS||!consent))} onClick={step===5?send:next}>{step===5?'отправить на проверку':step===4?'добавить фото':'далее'}</Button>}</div>
 </div>;
}
