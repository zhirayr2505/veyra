import React,{useState,useEffect,useRef,useLayoutEffect} from 'react';
import {Music2,Plane,Clapperboard,Dumbbell,BookOpen,Coffee,MonitorSmartphone,PawPrint,Camera,Footprints,Palette,UtensilsCrossed,Headphones,Flower2,Shirt,ChevronLeft,ChevronRight,MapPin,Check} from 'lucide-react';
import {get,put,post,request,photoOrder} from './api.js';
import {Button,Logo,Icon,Photo,InlineAlert,Spinner} from './UI.jsx';
import {GoalPicker,InterestPicker,CatalogueIcon,goalTitle} from './OnboardingOptions.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import './Registration2026.css';
import {LegalScreen} from './Legal.jsx';

const MAX_PHOTOS=7,MIN_PHOTOS=3;
const cleanName=value=>String(value||'').replace(/[^\p{L}\p{M}\s]/gu,'').replace(/\s+/g,' ').slice(0,50);
const adultDate=()=>{const now=new Date();now.setFullYear(now.getFullYear()-18);return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')};
const empty={name:'',birth_date:'',gender:'',looking_for:['woman'],min_age:18,max_age:40,radius_km:50,city:'',country:'',lat:null,lon:null,interests:[],bio:'',goal:'relationship',smoking:'',leisure:'',languages:[],prompts:[],height_cm:null};
const age=b=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(b))return 0;const d=new Date(b+'T00:00:00Z'),n=new Date();if(Number.isNaN(+d)||d.toISOString().slice(0,10)!==b)return 0;let y=n.getUTCFullYear()-d.getUTCFullYear();if(n.getUTCMonth()<d.getUTCMonth()||(n.getUTCMonth()===d.getUTCMonth()&&n.getUTCDate()<d.getUTCDate()))y--;return y;};
const progress=(value,min,max)=>Math.max(0,Math.min(100,100*(value-min)/(max-min)));
function DesignGlyph({name,active=false,size=34}){const image='url("/veyra-design/icons/'+name+'.svg")';return <span aria-hidden="true" className="veyra-brand-glyph" style={{width:size,height:size,WebkitMaskImage:image,maskImage:image,backgroundColor:active?'#9165F2':'#92899F'}}/>;}
function InterestSymbol({value,size=16}){return <CatalogueIcon value={value} size={size}/>;}
function Slider({value,min,max,step=1,onChange,label,disabled=false}){return <div className="veyra-slider"><input aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={disabled} style={{'--slider-fill':progress(value,min,max)+'%'}} onChange={e=>onChange(+e.target.value)}/></div>}
function AgeRange({min,max,onChange}){const start=Math.min(90,Math.max(18,min)),end=Math.min(90,Math.max(start,max));return <div className="age-range">
 <div className="range-labels"><span>Возраст от <strong>{start}</strong></span><span>до <strong>{end}</strong></span></div>
 <div className="age-range-rails" style={{'--range-start':progress(start,18,90)+'%','--range-end':progress(end,18,90)+'%'}}>
 <div className="age-range-bar"/><input type="range" aria-label="Возраст от" min="18" max="90" value={start} onChange={e=>onChange(Math.min(+e.target.value,end),end)}/>
 <input type="range" aria-label="Возраст до" min="18" max="90" value={end} onChange={e=>onChange(start,Math.max(+e.target.value,start))}/></div>
 <div className="range-ends"><span>18 лет</span><span>90 лет</span></div>
 </div>}

export function Registration({me,refresh}){
 const start=me?.registration?.data||{},draftKey='veyra.registration.v8.'+String(me?.user?.id||'anonymous');
 const savedStep=me?.registration?.step||1;
 const initialStep=start.registration_ui_version===2?savedStep:1; // Legacy drafts restart at terms consent; previous answers stay filled.
 const [step,setStep]=useState(Math.min(7,Math.max(1,initialStep))),[direction,setDirection]=useState('forward');
 const [f,setF]=useState({...empty,...start,...(me?.profile||{}),name:cleanName(start.name??me?.profile?.name??me?.user?.first_name??window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name??''),birth_date:String(start.birth_date||me?.profile?.birth_date||'').slice(0,10)});
 const [photos,setPhotos]=useState(me?.photos||[]),[jobs,setJobs]=useState([]),[uploading,setUploading]=useState(false);
 const [cityEdit,setCityEdit]=useState(!start.city&&!me?.profile?.city),[places,setPlaces]=useState([]),[query,setQuery]=useState(''),[searching,setSearching]=useState(false);
 const [busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[nameNote,setNameNote]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState(''),[consent,setConsent]=useState(!!start.consent_to_terms),[preview,setPreview]=useState(false),[photoIndex,setPhotoIndex]=useState(0),[slideStep,setSlideStep]=useState(0);
 const [dragVisual,setDragVisual]=useState(null),[dragOver,setDragOver]=useState(-1);
 const [legalOpen,setLegalOpen]=useState(false),[legalTab,setLegalTab]=useState('terms');
 const [goalScroll,setGoalScroll]=useState(0);
 const [dobParts,setDobParts]=useState(()=>{const b=String(start.birth_date||me?.profile?.birth_date||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(b)?{day:b.slice(8,10),month:b.slice(5,7),year:b.slice(0,4)}:{day:'',month:'',year:''}});
 const dobRefs=useRef([]);
 const photoInput=useRef(null),dragRef=useRef(null),dragLayoutRects=useRef(null),hintTimer=useRef(null),nameTimer=useRef(null),swipeX=useRef(null),slideBusy=useRef(false),uploadRunning=useRef(false);
 const change=(key,val)=>setF(old=>({...old,[key]:val}));
 const toast=message=>{setHint(message);clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(''),3400)};
 const setDobPart=(key,raw)=>{const max=key==='year'?4:2,val=String(raw).replace(/\D/g,'').slice(0,max),parts={...dobParts,[key]:val};setDobParts(parts);const {day,month,year}=parts;change('birth_date',day.length===2&&month.length===2&&year.length===4?year+'-'+month+'-'+day:'');if(val.length===max&&key!=='year')dobRefs.current[key==='day'?1:2]?.focus();};
 const setName=value=>{const cleaned=cleanName(value);change('name',cleaned);if(cleaned!==value){setNameNote(true);clearTimeout(nameTimer.current);nameTimer.current=setTimeout(()=>setNameNote(false),2600)}};
 useEffect(()=>{try{localStorage.removeItem('veyra.registration.v5');if(!me?.registration)localStorage.removeItem(draftKey)}catch{}return()=>{clearTimeout(hintTimer.current);clearTimeout(nameTimer.current);if(dragRef.current?.timer)clearTimeout(dragRef.current.timer);dragRef.current?.cleanup?.()}},[draftKey]);
 useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify({step,data:f,consent}))}catch{}},[draftKey,step,f,consent]);
 useEffect(()=>{if(!cityEdit||query.trim().length<2){setPlaces([]);setSearching(false);return;}let alive=true;setSearching(true);
  const timer=setTimeout(()=>get('/geo?q='+encodeURIComponent(query.trim())+'&autocomplete=true').then(r=>{if(alive)setPlaces(r||[])}).catch(()=>{if(alive){setPlaces([]);setError('Поиск городов пока недоступен')}}).finally(()=>{if(alive)setSearching(false)}),330);
  return()=>{alive=false;clearTimeout(timer)};
 },[query,cityEdit]);
 const fail=e=>setError(e.message==='AGE_18_REQUIRED'?'VEYRA доступна с 18 лет':e.message==='VALIDATION_ERROR'?'Проверь заполненные поля':e.message);
 const work=async fn=>{if(busy||uploading)return;setBusy(true);setError('');try{await fn()}catch(e){fail(e)}finally{setBusy(false)}};
 const valid=()=>{
  if(step===1){if(f.name.trim().length<2)throw Error('Имя должно содержать минимум 2 буквы');if(!consent)throw Error('Прими условия использования и политику конфиденциальности')}
  if(step===2){if(!f.gender)throw Error('Выбери свой пол');if(!age(f.birth_date))throw Error('Проверь дату рождения');if(age(f.birth_date)<18||age(f.birth_date)>110)throw Error('VEYRA доступна с 18 лет')}
  if(step===3&&(!f.city||!f.country||f.lat==null||f.lon==null||(cityEdit&&query.trim())))throw Error('Выбери город из предложенного списка');
  if(step===4&&(!f.looking_for.length||Number(f.min_age)<18||Number(f.max_age)<Number(f.min_age)||Number(f.max_age)>90))throw Error('Проверь предпочтения поиска');
 };
 useEffect(()=>{if(step!==5){setGoalScroll(0);return}const update=()=>setGoalScroll(Math.min(1,Math.max(0,window.scrollY/210)));window.addEventListener('scroll',update,{passive:true});update();return()=>window.removeEventListener('scroll',update)},[step]);
 const go=(n,dir)=>{setDirection(dir);setStep(Math.min(7,Math.max(1,n)));window.scrollTo({top:0,behavior:'instant'})};
 const next=()=>work(async()=>{valid();const data={...f,min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km};
  if(step===6){await put('/registration/profile',{...data,registration_ui_version:2});await refresh()}else await put('/registration',{step:step+1,data:{...data,registration_ui_version:2,consent_to_terms:consent}});
  go(step+1,'forward');
 });
 const choosePlace=p=>{setF(old=>({...old,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('');setCityEdit(false);setError('')};
 const locate=()=>{if(locating||busy)return;setError('');setLocating(true);if(!navigator.geolocation){setLocating(false);setCityEdit(true);setError('Геолокация недоступна. Выбери город из списка.');return}
 navigator.geolocation.getCurrentPosition(async pos=>{try{const found=await get('/geo?lat='+pos.coords.latitude+'&lon='+pos.coords.longitude);if(!found.length)throw Error('Не удалось определить город');choosePlace(found[0]);navigator.vibrate?.(15)}catch(e){fail(e);setCityEdit(true)}finally{setLocating(false)}},()=>{setLocating(false);setCityEdit(true);setError('Разрешение на геолокацию не получено. Выбери город вручную.')},{enableHighAccuracy:false,timeout:12000,maximumAge:90000});
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
  try{const fd=new FormData();fd.append('photo',item.file);let result;for(let attempt=0;attempt<2;attempt++){try{result=await post('/photos',fd);break}catch(e){if(attempt||!(/fetch|network|HTTP_502|HTTP_503|HTTP_504/i.test(e.message)))throw e;await new Promise(resolve=>setTimeout(resolve,850))}}
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
 const captureDragLayout=()=>new Map(Array.from(document.querySelectorAll('.registration-v7 .photo-slot[data-photo-id]')).map(el=>[el.dataset.photoId,el.getBoundingClientRect()]));
 useLayoutEffect(()=>{const before=dragLayoutRects.current;if(!before||!dragVisual)return;dragLayoutRects.current=null;
  for(const el of document.querySelectorAll('.registration-v7 .photo-slot[data-photo-id]')){const previous=before.get(el.dataset.photoId),now=el.getBoundingClientRect();if(!previous)continue;
   const dx=previous.left-now.left,dy=previous.top-now.top;if(Math.abs(dx)+Math.abs(dy)<2)continue;
   el.animate?.([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:260,easing:'cubic-bezier(.2,.75,.2,1)'});
  }
 },[dragOver]);
 const dragTarget=(x,y)=>{const target=document.elementFromPoint(x,y)?.closest?.('[data-slot-index]');return target?Number(target.dataset.slotIndex):-1};
 const dragStart=(e,i)=>{if(uploading||busy||(e.pointerType==='mouse'&&e.button!==0))return;
  dragRef.current?.cleanup?.();
  const rect=e.currentTarget.getBoundingClientRect();
  const state={index:i,target:i,id:e.pointerId,x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,width:rect.width,height:rect.height,node:e.currentTarget,active:false,timer:null};
  // Moving a keyed tile can disconnect it from the pointer capture target.
  // Document-level capture retains the gesture until the finger or mouse releases.
  const onMove=event=>dragMove(event),onUp=event=>dragFinish(event),onCancel=()=>dragCancel();
  state.cleanup=()=>{
   window.removeEventListener('pointermove',onMove,true);
   window.removeEventListener('pointerup',onUp,true);
   window.removeEventListener('pointercancel',onCancel,true);
   window.removeEventListener('blur',onCancel);
  };
  window.addEventListener('pointermove',onMove,{capture:true,passive:false});
  window.addEventListener('pointerup',onUp,true);
  window.addEventListener('pointercancel',onCancel,true);
  window.addEventListener('blur',onCancel);
  state.timer=setTimeout(()=>{
   if(dragRef.current!==state)return;
   state.active=true;
   try{state.node.setPointerCapture?.(state.id)}catch{}
   setDragVisual({index:i,x:state.x,y:state.y,width:state.width,height:state.height});setDragOver(i);
   window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  },320);
  dragRef.current=state;
 };
 const dragMove=e=>{const s=dragRef.current;if(!s||s.id!==e.pointerId)return;s.x=e.clientX;s.y=e.clientY;
  if(!s.active){if(Math.hypot(s.x-s.originX,s.y-s.originY)>9){clearTimeout(s.timer);s.cleanup?.();dragRef.current=null}return}
  e.preventDefault();setDragVisual(v=>v?{...v,x:s.x,y:s.y}:null);const target=dragTarget(s.x,s.y);if(target>=0&&target<photos.length&&target!==s.target){dragLayoutRects.current=captureDragLayout();s.target=target;setDragOver(target);window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.()}
 };
 const dragFinish=e=>{const s=dragRef.current;if(!s||s.id!==e.pointerId)return;clearTimeout(s.timer);s.cleanup?.();dragRef.current=null;
  if(!s.active)return;e.preventDefault();const target=s.target;dragLayoutRects.current=null;setDragVisual(null);setDragOver(-1);
  if(target>=0&&target<photos.length&&target!==s.index)reorder(s.index,target);
 };
 const dragCancel=()=>{if(dragRef.current?.timer)clearTimeout(dragRef.current.timer);dragRef.current?.cleanup?.();dragRef.current=null;dragLayoutRects.current=null;setDragVisual(null);setDragOver(-1)};
 const advancePhoto=direction=>{if(photos.length<2||slideBusy.current)return;slideBusy.current=true;setSlideStep(direction)};
 const finishPhotoSlide=e=>{if(e.target!==e.currentTarget||e.propertyName!=='transform'||!slideStep)return;setPhotoIndex(i=>(i+slideStep+photos.length)%photos.length);setSlideStep(0);slideBusy.current=false};
 const selectPhoto=i=>{if(slideBusy.current)return;setPhotoIndex(i)};
 const swipeEnd=e=>{if(swipeX.current==null)return;const delta=e.changedTouches[0].clientX-swipeX.current;swipeX.current=null;if(Math.abs(delta)>45)advancePhoto(delta<0?1:-1)};
 const remove=i=>work(async()=>{await request('/photos/'+photos[i].id,{method:'DELETE'});setPhotos(old=>old.filter((_,j)=>j!==i));await refresh()});
 const send=()=>work(async()=>{if(photos.length<MIN_PHOTOS)throw Error('Нужно минимум 3 фотографии');if(!consent)throw Error('Прими правила VEYRA');await post('/profile/submit',{consent:true});localStorage.removeItem(draftKey);await refresh()});
 const uploaded=[...photos.filter(p=>!jobs.some(job=>job.serverId===p.id)),...jobs];
 const display=dragVisual&&dragOver>=0&&!uploading?(()=>{const ordered=[...uploaded];ordered.splice(dragOver,0,ordered.splice(dragVisual.index,1)[0]);return ordered})():uploaded;
 const selectedCity=!!f.city&&!!f.country&&f.lat!=null&&f.lon!=null;
 const galleryPhotos=photos.length?[photos[(photoIndex-1+photos.length)%photos.length],photos[photoIndex],photos[(photoIndex+1)%photos.length]]:[];
 if(preview)return <main className="page registration registration-v7 registration-preview">
  <div className="step-top"><button className="quiet" aria-label="Назад к фотографиям" onClick={()=>setPreview(false)}><Icon name="back"/></button><small>так тебя увидят другие</small><span/></div>
  <div className="center-logo"><Logo width={136}/></div>
  <h1>твоя анкета</h1><p className="subheading">Первое впечатление начинается здесь ✨</p>
  <div className="preview-surface preview-dating-card">
   <div className="preview-gallery" aria-label="Предпросмотр карточки знакомств" onTouchStart={e=>swipeX.current=e.touches[0].clientX} onTouchEnd={swipeEnd}>
    <div className="preview-gallery-track" onTransitionEnd={finishPhotoSlide} style={{transform:'translate3d(-'+((slideStep+1)*100)+'%,0,0)',transition:slideStep?'transform .36s cubic-bezier(.2,.8,.2,1)':'none'}}>
     {galleryPhotos.map((p,i)=><div className="preview-gallery-slide" key={p.id+'-'+i}><Photo id={p.id} className="preview-photo" alt={'Фото '+(i===0?(photoIndex-1+photos.length)%photos.length+1:i===1?photoIndex+1:(photoIndex+1)%photos.length+1)}/></div>)}
    </div>
    <div className="preview-fade"/>
    <span className="preview-card-flag">твоя карточка</span>
    {photos.length>1&&<><button type="button" className="preview-arrow left" aria-label="Предыдущее фото" onClick={()=>advancePhoto(-1)}><Icon name="chevron-left" tone="dark" size={23}/></button><button type="button" className="preview-arrow right" aria-label="Следующее фото" onClick={()=>advancePhoto(1)}><Icon name="chevron-right" tone="dark" size={23}/></button></>}
    <div className="preview-card-caption">
     <h2>{f.name}, {age(f.birth_date)}</h2>
     <p className="preview-card-location"><Icon name="pin" tone="white" size={16}/>{f.city}, {f.country}</p>
     {f.bio?.trim()&&<p className="preview-card-bio">{f.bio}</p>}
     {f.interests.length>0&&<InterestReveal items={f.interests} preview/>}
     <p className="preview-card-goal">✨ {f.goal==='relationship'?'Ищу серьёзные отношения':f.goal==='dating'?'Открыт(а) к свиданиям':f.goal==='friends'?'Ищу общение':'Пока не определился'}</p>
    </div>
    {photos.length>1&&<div className="preview-dots" role="group" aria-label="Фотографии анкеты">{photos.map((p,i)=><button type="button" key={p.id} aria-label={'Фото '+(i+1)} aria-current={i===photoIndex?'true':undefined} className={i===photoIndex?'active':''} onClick={()=>selectPhoto(i)}/>)}</div>}
   </div>
  </div>
  <InlineAlert>{error}</InlineAlert>
  <div className="registration-actions preview-actions"><Button className="full" disabled={busy||uploading||photos.length<MIN_PHOTOS} onClick={send}>{busy?<Spinner/>:<><Icon name="check" tone="white" size={20}/> отправить на проверку</>}</Button><Button kind="outline" className="full" onClick={()=>{setPreview(false);go(7,'backward')}}><Icon name="back" tone="pink" size={17}/> редактировать</Button></div>
 </main>;
 return <div className="page registration registration-v6 registration-v7 veyra-registration-2026">
  <header className="veyra-onboarding-fixed-header"><div className="step-top"><button aria-label="Назад" className="quiet" onClick={()=>!busy&&!uploading&&go(step-1,'backward')} disabled={step===1||busy||uploading}><Icon name="back"/></button><span/><span/></div>
  <div className="center-logo veyra-shine-logo"><Logo width={136}/></div>
  <div className="progress" aria-label={'Шаг '+step+' из 7'}>{[1,2,3,4,5,6,7].map(n=><span key={n} className={n<=step?'done':''}/>)}</div></header>
  <div className={'registration-step '+direction} key={step}>
   <h1>{['Как вас зовут?','Когда ваш день рождения?','Разрешите доступ к геолокации','Кого вы ищете?','Каких отношений вы хотите?','Ваши интересы','Добавьте свои фото'][step-1]}</h1>
   <p className="subheading">{['','Укажите дату рождения и пол, чтобы находить подходящих людей.','Покажем людей рядом. Город можно определить или выбрать вручную.','Настройте предпочтения, чтобы видеть подходящие анкеты.','Выбирайте то, что ближе вам.','Найдите людей с общими увлечениями.','От 3 до 7 фотографий. Удерживайте фото и перетаскивайте, чтобы менять порядок.'][step-1]}</p>
   {step===1&&<div className="fields">
     <label className="registration-name-field">Ваше имя<input maxLength={50} value={f.name} onChange={e=>setName(e.target.value)} placeholder="Как вас зовут?" autoComplete="given-name"/>{nameNote&&<span className="name-feedback" role="status">Только буквы, без цифр и символов</span>}</label>
     <p className="registration-telegram-hint">Имя подставлено из Telegram. Вы можете изменить его.</p>
     <div className="registration-consent"><label className="registration-checkline"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} aria-label="Согласие с условиями VEYRA"/><span className="consent-square" aria-hidden="true">{consent&&<Icon name="check" tone="pink" size={15}/>}</span><span>Мне исполнилось 18 лет. Я принимаю <button type="button" className="legal-inline-link" onClick={e=>{e.preventDefault();setLegalTab('terms');setLegalOpen(true)}}>Условия использования</button> и <button type="button" className="legal-inline-link" onClick={e=>{e.preventDefault();setLegalTab('privacy');setLegalOpen(true)}}>Политику конфиденциальности</button> VEYRA.</span></label></div>
    </div>}
    {step===2&&<div className="fields">
     <div className="veyra-dob"><div className="veyra-dob-label">Дата рождения</div><div className="veyra-dob-fields">{[['day','День','ДД',2],['month','Месяц','ММ',2],['year','Год','ГГГГ',4]].map(([key,title,placeholder,len],index)=><label key={key}>{title}<input ref={node=>{dobRefs.current[index]=node}} aria-label={title+' рождения'} inputMode="numeric" autoComplete="off" maxLength={len} placeholder={placeholder} value={dobParts[key]} onChange={e=>setDobPart(key,e.target.value)}/></label>)}</div>{age(f.birth_date)>0&&<p className={'veyra-age-feedback '+(age(f.birth_date)<18?'underage':'')}>{age(f.birth_date)<18?'Регистрация доступна только с 18 лет':'Вам '+age(f.birth_date)+' лет'}</p>}</div>
     <p className="field-label">Ваш пол</p><div className="choices">{[['man','мужчина'],['woman','женщина']].map(([k,v])=><button type="button" key={k} aria-pressed={f.gender===k} className={'choice gender-choice '+(f.gender===k?'selected':'')} onClick={()=>{setF(old=>({...old,gender:k,looking_for:!old.gender?(k==='man'?['woman']:['man']):old.looking_for}))}}><DesignGlyph name={k==='man'?'male':'female'} active={f.gender===k} size={34}/>{v}</button>)}</div>
    </div>}
    {step===3&&<div className="fields">
    {selectedCity&&<div className="location-card veyra-city-row"><span className="location-mark"><DesignGlyph name="my-location" active size={27}/></span><div className="veyra-city-info"><small>ТВОЁ МЕСТОПОЛОЖЕНИЕ</small><h2>{f.city}</h2><p>{f.country}</p></div><button type="button" className="location-change" onClick={()=>{setCityEdit(v=>!v);setQuery('')}}>{cityEdit?'закрыть':'изменить'}</button></div>}
    {(!selectedCity||cityEdit)&&<Button className="locate-button" onClick={locate} disabled={locating||busy}>{locating?<><span className="spinner-ring"/> определяем город…</>:<><Icon name="pin" tone="white" size={18}/> использовать моё местоположение</>}</Button>}
    {(cityEdit||!selectedCity)&&<><p className="or">{selectedCity?'выбери другой город':'или найди свой город'}</p>
     <div className="city-search"><Icon name="search" size={21}/><input aria-label="Поиск города" autoComplete="off" placeholder="Начни вводить название города" value={query} onChange={e=>{setQuery(e.target.value)}}/>{searching&&<span className="city-spinner"/>}</div>
     {places.length>0&&<div className="city-results" role="listbox" aria-label="Результаты поиска городов">{places.map((p,i)=><button type="button" role="option" aria-selected="false" key={p.label+'-'+i} onClick={()=>choosePlace(p)}><Icon name="pin" tone="pink" size={17}/><span><b>{p.city}</b><small>{p.country}</small></span></button>)}</div>}
     {!searching&&query.trim().length>=2&&!places.length&&<p className="city-empty">Не нашли такой город. Проверь написание.</p>}
    </>}
    {selectedCity&&<div className="distance-control"><div className="range-labels"><span>Радиус поиска</span><strong>{f.radius_km>=20000?'весь мир':f.radius_km+' км'}</strong></div>
      <Slider min={5} max={500} step={5} label="Радиус поиска" value={Math.min(500,f.radius_km)} onChange={v=>change('radius_km',v)} disabled={f.radius_km===20000}/>
      <div className="range-ends"><span>5 км</span><span>500 км</span></div>
      <label className="checkline registration-check"><input type="checkbox" checked={f.radius_km===20000} onChange={e=>change('radius_km',e.target.checked?20000:50)}/><span className="custom-check"><Icon name="check" tone="pink" size={15}/></span><span>Искать по всему миру</span></label>
     </div>}
   </div>}
   {step===4&&<div className="fields"><p className="field-label">Кого ищешь?</p><div className="choices">{[['woman','женщин'],['man','мужчин'],['all','всех']].map(([k,v])=><button key={k} className={'choice looking-choice '+((k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k)?'selected':'')} onClick={()=>change('looking_for',k==='all'?['man','woman']:[k])}><DesignGlyph name={k==='man'?'male':k==='woman'?'female':'everyone'} active={k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k} size={42}/><span>{v}</span></button>)}</div>
    <AgeRange min={f.min_age} max={f.max_age} onChange={(min,max)=>setF(old=>({...old,min_age:min,max_age:max}))}/>
   </div>}
   {step===5&&<div className="fields"><div className="veyra-orb-stage" aria-hidden="true" style={{height:Math.round(158-goalScroll*99)+'px'}}><div className="veyra-orb-glow" style={{transform:'scale('+(1-goalScroll*.52)+')'}}><div className="veyra-orb-orbit"/><div className="veyra-orb-core"><Icon name="heart" tone="pink" size={48}/></div><span className="veyra-orb-spark first">✦</span><span className="veyra-orb-spark second">✦</span></div></div><GoalPicker value={f.goal} onChange={v=>change('goal',v)}/></div>}
   {step===6&&<div className="fields"><label className="veyra-bio-box">Немного о себе <small>Необязательно · до 200 символов</small><textarea aria-label="О себе" maxLength={200} rows={3} placeholder="Каким ты бываешь? Что любишь и кого хочешь встретить?" value={f.bio||''} onChange={e=>change('bio',e.target.value)}/><span>{(f.bio||'').length}/200</span></label><InterestPicker value={f.interests||[]} onChange={v=>change('interests',v)}/></div>}
   {step===7&&<div className="fields">
    <span className="registration-photo-count">{photos.length} из 7 фото · минимум 3</span>
     <p className="tip">Первое фото будет главным. Чтобы изменить порядок, удерживай фотографию и перетаскивай.</p>
    <div className="photo-layout" aria-label="Фотографии профиля">
     {Array.from({length:MAX_PHOTOS},(_,i)=>{const item=display[i],loading=!!item?.file;
      return item?<div key={item.id} className={'photo-slot '+(i===0?'primary ':'')+(loading?'uploading ':'')+(dragVisual&&photos[dragVisual.index]?.id===item.id?' drag-origin':'')+(dragOver===i&&dragVisual?.index!==i?' drop-target':'')} data-slot-index={i} data-photo-id={item.id} draggable={false}
       onContextMenuCapture={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} onPointerDown={e=>{if(e.target.closest('button')||uploading||busy||loading)return;dragStart(e,i)}}
       onPointerMove={dragMove} onPointerUp={dragFinish} onPointerCancel={dragCancel}
       tabIndex={!loading?0:-1} aria-label={'Фотография '+(i+1)+', перетащи для смены позиции'}
       onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();reorder(i,i+(e.key==='ArrowRight'?1:-1))}}}>
        {loading?<img className="upload-preview" alt="" src={item.preview}/>:<div draggable={false} onContextMenu={e=>e.preventDefault()}><Photo id={item.id}/></div>}
        {i===0&&<span className="cover-label">Главное</span>}{!loading&&<span className="photo-order-number">{i+1}</span>}
        {loading?<span className={'upload-state '+item.status}>{item.status==='done'?<Icon name="check" tone="white" size={23}/>:item.status==='failed'?<Icon name="close" tone="white" size={20}/>:<span className="spinner-ring"/>}</span>:
        <button className="thumb-delete" aria-label={'Удалить фотографию '+(i+1)} disabled={busy||uploading} onPointerDown={e=>e.stopPropagation()} onClick={()=>remove(i)}><Icon name="close" tone="pink" size={16}/></button>}
       </div>:<button key={'empty'+i} className={'photo-slot photo-slot-add '+(i===0?'primary':'')} onClick={()=>photoInput.current?.click()} disabled={busy||uploading}>
        <Icon name={i===0?'camera':'plus'} tone="pink" size={i===0?31:23}/>{i===0&&<span>главное фото</span>}
       </button>})}
    </div>
    <input ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={e=>{const selected=e.target.files;upload(selected);e.target.value=''}}/>
    <p className="photo-footnote">{uploading?'Загружаем фотографии по очереди…':'Загружено '+photos.length+' из '+MAX_PHOTOS+' · минимум '+MIN_PHOTOS}</p>
    <div className="photo-guidelines"><p><DesignGlyph name="camera" active size={20}/> Чёткие фото, на которых вас хорошо видно</p><p><Icon name="image" tone="pink" size={20}/> Портрет, прогулка, хобби — покажите себя разным</p><p><Icon name="verified" tone="pink" size={20}/> Только ваши собственные фотографии</p></div>
   </div>}
  </div>
  {dragVisual&&photos[dragVisual.index]&&<div className="photo-drag-ghost" aria-hidden="true" style={{left:dragVisual.x-dragVisual.width/2,top:dragVisual.y-dragVisual.height/2,width:dragVisual.width,height:dragVisual.height}}><Photo id={photos[dragVisual.index].id}/></div>}
  {hint&&<div className="registration-toast" role="status">{hint}</div>}
  <InlineAlert>{error}</InlineAlert>
  <div className="registration-actions">{busy?<Spinner/>:<Button className="full" disabled={busy||uploading||(step===7&&photos.length<MIN_PHOTOS)} onClick={step===7?()=>{setPhotoIndex(0);setSlideStep(0);slideBusy.current=false;setError('');setPreview(true)}:next}>{step===7?'посмотреть анкету':step===6?'добавить фото':'далее'}</Button>}</div>
 {legalOpen&&<LegalScreen asModal initialTab={legalTab} onClose={()=>setLegalOpen(false)} onAccept={()=>{setConsent(true);setLegalOpen(false)}}/>}
 </div>;
}
