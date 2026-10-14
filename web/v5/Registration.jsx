import React,{useState,useEffect,useRef,useLayoutEffect} from 'react';
import {flushSync} from 'react-dom';
import {Music2,Plane,Clapperboard,Dumbbell,BookOpen,Coffee,MonitorSmartphone,PawPrint,Camera,Footprints,Palette,UtensilsCrossed,Headphones,Flower2,Shirt,ChevronLeft,ChevronRight,MapPin,Check} from 'lucide-react';
import {get,put,post,request,photoOrder,uploadPhoto} from './api.js';
import {compressPortrait} from './compressPortrait.js';
import {haptic} from './haptics.js';
import {Button,Choice,Logo,Icon,Photo,InlineAlert,Spinner} from './UI.jsx';
import {GoalPicker,InterestPicker,CatalogueIcon,goalTitle} from './OnboardingOptions.jsx';
import {InterestReveal} from './InterestReveal.jsx';
import {BioStep} from './BioStep.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {ProfilePreview} from './ProfilePreview.jsx';
import {BrandedSlider,BrandedDualSlider} from './RangeControls.jsx';
import './Registration2026.css';
import './RegistrationTransitions.css';
import {LegalScreen} from './Legal.jsx';
import {OnboardingHeader} from './OnboardingHeader.jsx';

const MAX_PHOTOS=6,MIN_PHOTOS=3,MAX_BIO=250;
const NEXT_STEP_LABELS=['Указать возраст','Выбрать город','Настроить поиск','Выбрать цель знакомства','Выбрать интересы','Рассказать о себе'];

const truncateBio=value=>Array.from(String(value||'')).slice(0,MAX_BIO).join('');
const NAME_PATTERN=/^[\p{L}\p{M}]+(?:[-'’ ][\p{L}\p{M}]+)*$/u;
const cleanName=value=>String(value||'').replace(/[^\p{L}\p{M}\s'’\-]/gu,'').replace(/\s+/g,' ').slice(0,50);
const adultDate=()=>{const now=new Date();now.setFullYear(now.getFullYear()-18);return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')};
const empty={name:'',birth_date:'',gender:'',looking_for:['woman'],min_age:18,max_age:40,radius_km:50,city:'',country:'',lat:null,lon:null,interests:[],bio:'',goal:'relationship',smoking:'',leisure:'',languages:[],prompts:[],height_cm:null};
const age=b=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(b))return 0;const d=new Date(b+'T00:00:00Z'),n=new Date();if(Number.isNaN(+d)||d.toISOString().slice(0,10)!==b)return 0;let y=n.getUTCFullYear()-d.getUTCFullYear();if(n.getUTCMonth()<d.getUTCMonth()||(n.getUTCMonth()===d.getUTCMonth()&&n.getUTCDate()<d.getUTCDate()))y--;return y;};
const progress=(value,min,max)=>Math.max(0,Math.min(100,100*(value-min)/(max-min)));

function InterestSymbol({value,size=16}){return <CatalogueIcon value={value} size={size}/>;}
function Slider({value,min,max,step=1,onChange,label,disabled=false}){return <BrandedSlider min={min} max={max} step={step} value={value} onChange={onChange} ariaLabel={label} disabled={disabled}/>}
function AgeRange({min,max,onChange}){const start=Math.min(90,Math.max(18,min)),end=Math.min(90,Math.max(start,max));return <div className="age-range"><div className="range-labels"><span>Возраст от <strong>{start}</strong></span><span>до <strong>{end}</strong></span></div><BrandedDualSlider min={18} max={90} lower={start} upper={end} onChange={onChange}/><div className="range-ends"><span>18 лет</span><span>90 лет</span></div></div>}

export function Registration({me,refresh}){
 const draftKey='veyra.registration.v9.'+String(me?.user?.id||'anonymous');
 // Stage-0 reset is authoritative: never rehydrate stale data without a server draft.
 const localDraft=(()=>{if(!me?.registration)return null;try{return JSON.parse(localStorage.getItem(draftKey)||'null')}catch{return null}})();
 const start={...(me?.registration?.data||{}),...(localDraft?.data||{})};
 const savedStep=localDraft?.step||me?.registration?.step||1;
 const initialStep=start.registration_ui_version===3?savedStep:start.registration_ui_version===2?(savedStep>=7?8:savedStep):1; // Resume legacy drafts on their matching new step.
 const [step,setStep]=useState(Math.min(8,Math.max(1,initialStep))),[direction,setDirection]=useState('forward');
 const [transitioning,setTransitioning]=useState(false);
 const [f,setF]=useState({...empty,...start,...(me?.profile||{}),name:cleanName(start.name??me?.profile?.name??me?.user?.first_name??window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name??''),birth_date:String(start.birth_date||me?.profile?.birth_date||'').slice(0,10),bio:truncateBio(start.bio??me?.profile?.bio??'')});
 const [photos,setPhotos]=useState(me?.photos||[]),[jobs,setJobs]=useState([]),[uploading,setUploading]=useState(false);
 const [cityEdit,setCityEdit]=useState(!start.city&&!me?.profile?.city),[places,setPlaces]=useState([]),[query,setQuery]=useState(''),[searching,setSearching]=useState(false);
 const [fieldError,setFieldError]=useState(null);
 const [busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[nameNote,setNameNote]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState(''),[consent,setConsent]=useState(!!start.consent_to_terms),[preview,setPreview]=useState(false),[photoIndex,setPhotoIndex]=useState(0),[slideStep,setSlideStep]=useState(0);
 const [dragVisual,setDragVisual]=useState(null),[dragOver,setDragOver]=useState(-1);
 const [showDragHint,setShowDragHint]=useState(()=>{try{return !sessionStorage.getItem('veyra.photo-drag-hint.v1')}catch{return true}});

 const [legalOpen,setLegalOpen]=useState(false),[legalTab,setLegalTab]=useState('terms');

 const [telegramFull,setTelegramFull]=useState(()=>Boolean(window.Telegram?.WebApp?.isFullscreen));
 const [dobParts,setDobParts]=useState(()=>{const b=String(start.birth_date||me?.profile?.birth_date||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(b)?{day:b.slice(8,10),month:b.slice(5,7),year:b.slice(0,4)}:{day:'',month:'',year:''}});
 const dobRefs=useRef([]),scrollRef=useRef(null);
 const photoInput=useRef(null),dragRef=useRef(null),dragLayoutRects=useRef(null),hintTimer=useRef(null),nameTimer=useRef(null),swipeX=useRef(null),slideBusy=useRef(false),uploadRunning=useRef(false);
 const registrationRootRef=useRef(null),stepTransitionRef=useRef(false),stepTransitionTimerRef=useRef(null),stepAnimationsRef=useRef([]),exitCloneRef=useRef(null),workRunning=useRef(false),reorderRunning=useRef(false);
 const change=(key,val)=>setF(old=>({...old,[key]:val}));
 const toast=message=>{setHint(message);clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(''),3400)};
 // Follow the actual Android/Telegram visual viewport without React renders per keyboard frame.
 useEffect(()=>{
  const tg=window.Telegram?.WebApp,vv=window.visualViewport,root=registrationRootRef.current;
  let frame=0;
  const update=()=>{frame=0;if(!root)return;const lowerEdge=vv?vv.height+vv.offsetTop:(tg?.viewportHeight||window.innerHeight);root.style.setProperty('--veyra-nav-keyboard-gap',Math.round(Math.max(0,window.innerHeight-lowerEdge))+'px')};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  schedule();
  vv?.addEventListener('resize',schedule);vv?.addEventListener('scroll',schedule);
  window.addEventListener('resize',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  tg?.onEvent?.('viewportChanged',schedule);
  return()=>{if(frame)cancelAnimationFrame(frame);vv?.removeEventListener('resize',schedule);vv?.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);tg?.offEvent?.('viewportChanged',schedule);root?.style.removeProperty('--veyra-nav-keyboard-gap')};
 },[]);
 const setDobPart=(key,raw)=>{const max=key==='year'?4:2,val=String(raw).replace(/\D/g,'').slice(0,max),parts={...dobParts,[key]:val};setDobParts(parts);const {day,month,year}=parts;change('birth_date',day.length===2&&month.length===2&&year.length===4?year+'-'+month+'-'+day:'');if(val.length===max){
  if(key!=='year')dobRefs.current[key==='day'?1:2]?.focus();
  else if(day.length===2&&month.length===2){
   // Close the Android numeric keyboard only after all DOB fields are filled.
   dobRefs.current[2]?.blur();
   const miniApp=window.Telegram?.WebApp;
   try{if(miniApp?.isVersionAtLeast?.('9.1'))miniApp.hideKeyboard?.()}catch{}
  }
 }};
 useEffect(()=>{
  const tg=window.Telegram?.WebApp,back=tg?.BackButton;
  if(!back)return;
  const sync=()=>setTelegramFull(Boolean(tg.isFullscreen));
  const onBack=()=>{if(busy||uploading)return;if(preview){setPreview(false);go(8,'backward')}else if(step>1)go(step-1,'backward')};
  tg.onEvent?.('fullscreenChanged',sync);
  if(tg.isFullscreen&&((preview||step>1)&&!busy&&!uploading)){
   back.show?.();back.onClick?.(onBack);
  }else back.hide?.();
  return()=>{tg.offEvent?.('fullscreenChanged',sync);back.offClick?.(onBack);back.hide?.()};
 },[step,preview,busy,uploading,telegramFull]);
 useEffect(()=>{
  if(step!==8||!showDragHint)return;
  const timer=setTimeout(()=>{
   setShowDragHint(false);
   try{sessionStorage.setItem('veyra.photo-drag-hint.v1','1')}catch{}
  },3600);
  return()=>clearTimeout(timer);
 },[step,showDragHint]);
 const setName=value=>{setFieldError(null);const cleaned=cleanName(value);change('name',cleaned);if(cleaned!==value){setNameNote(true);clearTimeout(nameTimer.current);nameTimer.current=setTimeout(()=>setNameNote(false),2600)}};
 useEffect(()=>{try{localStorage.removeItem('veyra.registration.v5');if(!me?.registration)localStorage.removeItem(draftKey)}catch{}return()=>{clearTimeout(hintTimer.current);clearTimeout(nameTimer.current);if(dragRef.current?.timer)clearTimeout(dragRef.current.timer);dragRef.current?.cleanup?.()}},[draftKey]);
 useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify({step,data:f,consent}))}catch{}},[draftKey,step,f,consent]);
 useEffect(()=>{if(!cityEdit||query.trim().length<2){setPlaces([]);setSearching(false);return;}let alive=true;setSearching(true);
  const timer=setTimeout(()=>get('/geo?q='+encodeURIComponent(query.trim())+'&autocomplete=true').then(r=>{if(alive)setPlaces(r||[])}).catch(()=>{if(alive){setPlaces([]);setError('Поиск городов пока недоступен')}}).finally(()=>{if(alive)setSearching(false)}),330);
  return()=>{alive=false;clearTimeout(timer)};
 },[query,cityEdit]);
 const invalid=(field,message)=>{const problem=new Error(message);problem.field=field;throw problem};
 const fail=e=>{
  const message=e.message==='AGE_18_REQUIRED'?'VEYRA доступна с 18 лет':e.message==='VALIDATION_ERROR'?'Проверь заполненные поля':e.message==='BIO_TOO_LONG'?'Максимум 250 символов в описании. Сократи текст.':e.message;
  if(e.field){setFieldError({step,field:e.field,message});setError('')}
  else setError(message);
  haptic('error');
 };
 const work=async fn=>{if(workRunning.current||uploadRunning.current)return;workRunning.current=true;setBusy(true);setError('');try{await fn()}catch(e){fail(e)}finally{workRunning.current=false;setBusy(false)}};
 const valid=()=>{
  if(step===1){if(f.name.trim().length<2||!NAME_PATTERN.test(f.name.trim()))invalid('name','Имя: буквы, пробелы, дефис или апостроф между буквами');if(!consent)invalid('consent','Прими условия использования и политику конфиденциальности')}
  if(step===2){if(!f.gender)invalid('gender','Выбери свой пол');if(!age(f.birth_date))invalid('birth_date','Проверь дату рождения');if(age(f.birth_date)<18||age(f.birth_date)>110)invalid('birth_date','VEYRA доступна с 18 лет')}
  if(step===3&&(!f.city||!f.country||f.lat==null||f.lon==null||(cityEdit&&query.trim())))invalid('city','Выбери город из предложенного списка');
  if(step===4&&(!f.looking_for.length||Number(f.min_age)<18||Number(f.max_age)<Number(f.min_age)||Number(f.max_age)>90))invalid('looking_for','Проверь предпочтения поиска');
 };

 // Use WAAPI alone; header/CTA are outside the animated step.
 const go=(n,dir)=>{
  const target=Math.min(8,Math.max(1,n));if(target===step||stepTransitionRef.current)return;
  stepTransitionRef.current=true;setTransitioning(true);
  stepAnimationsRef.current.forEach(a=>a.cancel());stepAnimationsRef.current=[];exitCloneRef.current?.remove();
  const node=scrollRef.current,rect=node?.getBoundingClientRect(),clone=node?.cloneNode(true);
  if(clone&&rect){
   clone.inert=true;clone.setAttribute('aria-hidden','true');clone.dataset.exitSnapshot='true';
   clone.querySelectorAll('[id],[name]').forEach(el=>{el.removeAttribute('id');el.removeAttribute('name')});
   Object.assign(clone.style,{position:'fixed',top:rect.top+'px',left:rect.left+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',overflow:'hidden',pointerEvents:'none',zIndex:'250',animation:'none'});
   registrationRootRef.current?.appendChild(clone);exitCloneRef.current=clone;
  }
  setFieldError(null);setDirection(dir);
  flushSync(()=>setStep(target));scrollRef.current?.scrollTo({top:0,behavior:'instant'});
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,duration=reduced?0:290,sign=dir==='backward'?-1:1;
  const options={duration,easing:'cubic-bezier(.22,.78,.22,1)',fill:'both'},animations=[];
  if(duration&&scrollRef.current?.animate)animations.push(scrollRef.current.animate([{transform:'translate3d('+(sign*12)+'%,0,0)',opacity:.78},{transform:'translate3d(0,0,0)',opacity:1}],options));
  if(duration&&clone?.animate)animations.push(clone.animate([{transform:'translate3d(0,0,0)',opacity:1},{transform:'translate3d('+(-sign*12)+'%,0,0)',opacity:.72}],options));
  stepAnimationsRef.current=animations;
  const done=()=>{if(!stepTransitionRef.current)return;clearTimeout(stepTransitionTimerRef.current);animations.forEach(a=>a.cancel());stepAnimationsRef.current=[];exitCloneRef.current?.remove();exitCloneRef.current=null;stepTransitionRef.current=false;setTransitioning(false)};
  if(animations.length)Promise.allSettled(animations.map(a=>a.finished)).then(done);else done();
  stepTransitionTimerRef.current=setTimeout(done,duration+120);
 };
 const next=()=>work(async()=>{valid();haptic('light');const data={...f,bio:truncateBio(f.bio),min_age:+f.min_age,max_age:+f.max_age,radius_km:+f.radius_km};
  if(step===7){await put('/registration/profile',{...data,registration_ui_version:3});await refresh()}else await put('/registration',{step:step+1,data:{...data,registration_ui_version:3,consent_to_terms:consent}});
  go(step+1,'forward');
 });
 const choosePlace=p=>{setFieldError(null);setF(old=>({...old,city:p.city,country:p.country,lat:p.lat,lon:p.lon}));setPlaces([]);setQuery('');setCityEdit(false);setError('')};
 const locate=()=>{if(locating||busy)return;setError('');setLocating(true);if(!navigator.geolocation){setLocating(false);setCityEdit(true);setError('Геолокация недоступна. Выбери город из списка.');return}
 navigator.geolocation.getCurrentPosition(async pos=>{try{const found=await get('/geo?lat='+pos.coords.latitude+'&lon='+pos.coords.longitude);if(!found.length)throw Error('Не удалось определить город');choosePlace(found[0]);navigator.vibrate?.(15)}catch(e){fail(e);setCityEdit(true)}finally{setLocating(false)}},()=>{setLocating(false);setCityEdit(true);setError('Разрешение на геолокацию не получено. Выбери город вручную.')},{enableHighAccuracy:false,timeout:12000,maximumAge:90000});
 };
 const upload=async fileList=>{
  if(uploadRunning.current||busy)return;
  const files=Array.from(fileList||[]),remaining=MAX_PHOTOS-photos.length;
  if(!remaining){toast('Можно добавить максимум 6 фото');return}
  if(files.length>remaining)toast('Можно добавить максимум 6 фото — добавляем первые '+remaining);
  const selected=files.slice(0,remaining);
  if(!selected.length)return;
  uploadRunning.current=true;setUploading(true);setError('');
  const initial=selected.map((file,i)=>({id:'upload-'+i+'-'+Date.now(),file,preview:URL.createObjectURL(file),status:'waiting',progress:0,serverId:null}));
  setJobs(initial);
  let cursor=0;
  const results=Array(initial.length).fill(null);
  const update=(id,patch)=>setJobs(old=>old.map(job=>job.id===id?{...job,...patch}:job));
  const worker=async()=>{
   while(cursor<initial.length){
    const index=cursor++,item=initial[index];
    update(item.id,{status:'processing',progress:0});
    try{
     const compressed=await compressPortrait(item.file,{maxSide:2048,quality:.86});
     update(item.id,{status:'loading',progress:0});
     let result;
     for(let attempt=0;attempt<2;attempt++){
      try{
       result=await uploadPhoto(compressed,n=>update(item.id,{progress:n}));break;
      }catch(e){
       if(attempt||!/fetch|network|HTTP_502|HTTP_503|HTTP_504/i.test(e.message))throw e;
       await new Promise(resolve=>setTimeout(resolve,500));
      }
     }
     results[index]={id:result.id,lqip:result.lqip||null,dominant:result.dominant||null};
     update(item.id,{status:'done',progress:100,serverId:result.id});
    }catch(e){
     update(item.id,{status:'failed',progress:0});
     setError('Не удалось загрузить «'+item.file.name+'»: '+e.message);
    }
   }
  };
  try{
   // No more than two concurrent photo decodes/uploads on mobile.
   await Promise.all(Array.from({length:Math.min(2,initial.length)},()=>worker()));
   const successful=results.filter(Boolean);
   if(successful.length){
    setPhotos(old=>[...old,...successful.map((item,i)=>({...item,position:old.length+i}))]);
    await refresh();
   }
  }finally{
   initial.forEach(item=>URL.revokeObjectURL(item.preview));
   setJobs([]);uploadRunning.current=false;setUploading(false);
  }
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
   haptic('selection');
  },320);
  dragRef.current=state;
 };
 const dragMove=e=>{const s=dragRef.current;if(!s||s.id!==e.pointerId)return;s.x=e.clientX;s.y=e.clientY;
  if(!s.active){if(Math.hypot(s.x-s.originX,s.y-s.originY)>9){clearTimeout(s.timer);s.cleanup?.();dragRef.current=null}return}
  e.preventDefault();setDragVisual(v=>v?{...v,x:s.x,y:s.y}:null);const target=dragTarget(s.x,s.y);if(target>=0&&target<photos.length&&target!==s.target){dragLayoutRects.current=captureDragLayout();s.target=target;setDragOver(target);haptic('selection')}
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
 const send=()=>work(async()=>{if(photos.length<MIN_PHOTOS)throw Error('Нужно минимум 3 фотографии');if(!consent)throw Error('Прими правила VEYRA');await post('/profile/submit',{consent:true});haptic('success');localStorage.removeItem(draftKey);await refresh()});
 const uploaded=[...photos.filter(p=>!jobs.some(job=>job.serverId===p.id)),...jobs];
 const display=dragVisual&&dragOver>=0&&!uploading?(()=>{const ordered=[...uploaded];ordered.splice(dragOver,0,ordered.splice(dragVisual.index,1)[0]);return ordered})():uploaded;
 const selectedCity=!!f.city&&!!f.country&&f.lat!=null&&f.lon!=null;
 const stepValid=step===1?f.name.trim().length>=2&&NAME_PATTERN.test(f.name.trim())&&consent
  :step===2?!!f.gender&&age(f.birth_date)>=18&&age(f.birth_date)<=110
  :step===3?selectedCity&&(!cityEdit||!query.trim())
  :step===4?f.looking_for.length>0&&+f.min_age>=18&&+f.max_age>=+f.min_age&&+f.max_age<=90
  :step===8?photos.length>=MIN_PHOTOS:true;
 useEffect(()=>()=>{clearTimeout(stepTransitionTimerRef.current);stepAnimationsRef.current.forEach(a=>a.cancel());exitCloneRef.current?.remove()},[]);
 const primaryAction=()=>{
  if(busy||uploading||stepTransitionRef.current)return;
  if(step===8){
   haptic('light');
   if(photos.length<MIN_PHOTOS)return;
   setPhotoIndex(0);setSlideStep(0);slideBusy.current=false;setError('');setPreview(true);return;
  }
  next();
 };
 const galleryPhotos=photos.length?[photos[(photoIndex-1+photos.length)%photos.length],photos[photoIndex],photos[(photoIndex+1)%photos.length]]:[];
 if(preview)return <ProfilePreview profile={f} photos={photos} onBack={()=>{setPreview(false);go(8,'backward')}} onEdit={()=>{setPreview(false);go(8,'backward')}} onSubmit={send} submitting={busy||uploading} error={error}/>;
 return <div ref={registrationRootRef} className="page registration registration-v6 registration-v7 veyra-registration-2026" >
  <OnboardingHeader step={step} onBack={()=>!busy&&!uploading&&!transitioning&&go(step-1,'backward')} disabled={step===1||busy||uploading||transitioning}/>
  <div className={'registration-step '+direction} key={step} ref={scrollRef}>
   <h1 tabIndex={-1} data-step-heading>{['Как вас зовут?','Когда ваш день рождения?','Разрешите доступ к геолокации','Кого вы ищете?','Каких отношений вы хотите?','Ваши интересы','Немного о себе','Добавьте свои фото'][step-1]}</h1>
   <p className="subheading">{['','Укажите дату рождения и пол, чтобы находить подходящих людей.','Покажем людей рядом. Город можно определить или выбрать вручную.','Настройте предпочтения, чтобы видеть подходящие анкеты.','Выбирайте то, что ближе вам.','Найдите людей с общими увлечениями.','Пара слов о себе помогут начать интересное знакомство.','От 3 до 6 фотографий. Удерживайте фото и перетаскивайте, чтобы менять порядок.'][step-1]}</p>
   {step===1&&<div className="fields">
     <label className="registration-name-field">Ваше имя<input maxLength={50} value={f.name} onChange={e=>setName(e.target.value)} placeholder="Как вас зовут?" autoComplete="given-name"/>{nameNote&&<span className="name-feedback" role="status">Можно использовать буквы, пробел, дефис и апостроф</span>}</label>
     {fieldError?.step===1&&fieldError.field==='name'&&<p className="veyra-field-error" role="alert">{fieldError.message}</p>}
     <p className="registration-telegram-hint">Имя подставлено из Telegram. Вы можете изменить его.</p>
     <div className="registration-consent"><label className="registration-checkline"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} aria-label="Согласие с условиями VEYRA"/><span className="consent-square" aria-hidden="true">{consent&&<Icon name="check" tone="pink" size={15}/>}</span><span>Мне исполнилось 18 лет. Я принимаю <button type="button" className="legal-inline-link" onClick={e=>{e.preventDefault();setLegalTab('terms');setLegalOpen(true)}}>Условия использования</button> и <button type="button" className="legal-inline-link" onClick={e=>{e.preventDefault();setLegalTab('privacy');setLegalOpen(true)}}>Политику конфиденциальности</button> VEYRA.</span></label></div>
     {fieldError?.step===1&&fieldError.field==='consent'&&<p className="veyra-field-error" role="alert">{fieldError.message}</p>}
    </div>}
    {step===2&&<div className="fields">
     <div className="veyra-dob"><div className="veyra-dob-label">Дата рождения</div><div className="veyra-dob-fields">{[['day','День','ДД',2],['month','Месяц','ММ',2],['year','Год','ГГГГ',4]].map(([key,title,placeholder,len],index)=><label key={key}>{title}<input ref={node=>{dobRefs.current[index]=node}} aria-label={title+' рождения'} inputMode="numeric" autoComplete="off" maxLength={len} placeholder={placeholder} value={dobParts[key]} onChange={e=>setDobPart(key,e.target.value)}/></label>)}</div>{age(f.birth_date)>0&&<p className={'veyra-age-feedback '+(age(f.birth_date)<18?'underage':'')}>{age(f.birth_date)<18?'Регистрация доступна только с 18 лет':'Вам '+age(f.birth_date)+' лет'}</p>}</div>
     <p className="field-label">Ваш пол</p><div className="choices">{[['man','мужчина'],['woman','женщина']].map(([k,v])=><Choice key={k} selected={f.gender===k} className="gender-choice" onClick={()=>{setF(old=>({...old,gender:k,looking_for:!old.gender?(k==='man'?['woman']:['man']):old.looking_for}))}}><Icon name={k==='man'?'man':'woman'} tone={f.gender===k?'pink':'dark'} size={34}/>{v}</Choice>)}</div>
     {fieldError?.step===2&&<p className="veyra-field-error" role="alert">{fieldError.message}</p>}
    </div>}
    {step===3&&<div className="fields">
    {selectedCity&&<div className="location-card veyra-city-row"><span className="location-mark"><Icon name="location" tone="pink" size={27}/></span><div className="veyra-city-info"><small>ТВОЁ МЕСТОПОЛОЖЕНИЕ</small><h2>{f.city}</h2><p><CountryFlag country={f.country}/> {f.country}</p></div><button type="button" className="location-change" onClick={()=>{setCityEdit(v=>!v);setQuery('')}}>{cityEdit?'Закрыть':'Изменить город'}</button></div>}
    {(!selectedCity||cityEdit)&&<Button className="locate-button" onClick={locate} disabled={locating||busy}>{locating?<><span className="spinner-ring"/> определяем город…</>:<><Icon name="pin" tone="white" size={18}/> использовать моё местоположение</>}</Button>}
    {(cityEdit||!selectedCity)&&<><p className="or">{selectedCity?'выбери другой город':'или найди свой город'}</p>
     <div className="city-search"><Icon name="search" size={21}/><input aria-label="Поиск города" autoComplete="off" placeholder="Начни вводить название города" value={query} onChange={e=>{setQuery(e.target.value)}}/>{searching&&<span className="city-spinner"/>}</div>
     {places.length>0&&<div className="city-results" role="listbox" aria-label="Результаты поиска городов">{places.map((p,i)=><button type="button" role="option" aria-selected="false" key={p.label+'-'+i} onClick={()=>choosePlace(p)}><Icon name="pin" tone="pink" size={17}/><span><b>{p.city}</b><small><CountryFlag country={p.country}/> {p.country}</small></span></button>)}</div>}
     {!searching&&query.trim().length>=2&&!places.length&&<p className="city-empty">Не нашли такой город. Проверь написание.</p>}
    </>}
    {fieldError?.step===3&&<p className="veyra-field-error" role="alert">{fieldError.message}</p>}
    {selectedCity&&<div className="distance-control"><div className="range-labels"><span>Радиус поиска</span><strong>{f.radius_km>=20000?'весь мир':f.radius_km+' км'}</strong></div>
      <Slider min={1} max={1000} step={1} label="Радиус поиска" value={Math.max(1,Math.min(1000,f.radius_km))} onChange={v=>change('radius_km',v)} disabled={f.radius_km===20000}/>
      <div className="range-ends"><span>1 км</span><span>1000 км</span></div>
      <label className="veyra-world-switch"><span>Искать по всему миру</span><input type="checkbox" role="switch" aria-label="Искать по всему миру" checked={f.radius_km===20000} onChange={e=>change('radius_km',e.target.checked?20000:100)}/><span className="veyra-switch-track" aria-hidden="true"><span/></span></label>
     </div>}
   </div>}
   {step===4&&<div className="fields"><p className="field-label">Кого ищешь?</p><div className="choices">{[['woman','женщин'],['man','мужчин'],['all','всех']].map(([k,v])=><Choice key={k} className="looking-choice" selected={k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k} onClick={()=>change('looking_for',k==='all'?['man','woman']:[k])}><Icon name={k==='man'?'man':k==='woman'?'woman':'everyone'} tone={(k==='all'?f.looking_for.length===2:f.looking_for.length===1&&f.looking_for[0]===k)?'pink':'dark'} size={42}/><span>{v}</span></Choice>)}</div>
    {fieldError?.step===4&&<p className="veyra-field-error" role="alert">{fieldError.message}</p>}
    <AgeRange min={f.min_age} max={f.max_age} onChange={(min,max)=>setF(old=>({...old,min_age:min,max_age:max}))}/>
   </div>}
   {step===5&&<div className="fields veyra-goal-step"><GoalPicker value={f.goal} onChange={v=>change('goal',v)}/></div>}
   {step===6&&<div className="fields"><InterestPicker value={f.interests||[]} onChange={v=>change('interests',v)}/></div>}
   {step===7&&<BioStep value={f.bio||''} onChange={v=>change('bio',v)}/>}
   {step===8&&<div className="fields">
     <div className="photo-guidelines"><p><Icon name="camera" tone="pink" size={20}/> Чёткие фото, на которых вас хорошо видно</p><p><Icon name="image" tone="pink" size={20}/> Портрет, прогулка, хобби — покажите себя разным</p><p><Icon name="verified" tone="pink" size={20}/> Только ваши собственные фотографии</p></div>
     <span className={'registration-photo-count '+(photos.length>=MIN_PHOTOS&&!uploading?'is-ready':'')} role="status" aria-live="polite">{uploading?'Загружаем фото · '+photos.length+' из 6':photos.length<MIN_PHOTOS?photos.length+' из 6 · Добавь ещё '+(MIN_PHOTOS-photos.length)+' фото, чтобы продолжить':photos.length+' из 6 · Можно посмотреть анкету'}</span>
      <p className={"tip veyra-photo-drag-guide"+(showDragHint?" is-first-visit":"")}><span className="veyra-drag-hand" aria-hidden="true">☝️</span> Первое фото станет главным. Удерживай фото, чтобы изменить порядок.</p>
    <div className="photo-layout" aria-label="Фотографии профиля">
     {display.map((item,i)=>{const loading=!!item?.file;
      return <div key={item.id} className={'photo-slot '+(i===0?'primary ':'')+(loading?'uploading ':'')+(dragVisual&&photos[dragVisual.index]?.id===item.id?' drag-origin':'')+(dragOver===i&&dragVisual?.index!==i?' drop-target':'')} data-slot-index={i} data-photo-id={item.id} draggable={false}
       onContextMenuCapture={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} onPointerDown={e=>{if(e.target.closest('button')||uploading||busy||loading)return;dragStart(e,i)}}
       onPointerMove={dragMove} onPointerUp={dragFinish} onPointerCancel={dragCancel}
       tabIndex={!loading?0:-1} aria-label={'Фотография '+(i+1)+', перетащи для смены позиции'}
       onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();reorder(i,i+(e.key==='ArrowRight'?1:-1))}}}>
        {loading?<img className="upload-preview" alt="" src={item.preview}/>:<div draggable={false} onContextMenu={e=>e.preventDefault()}><Photo id={item.id} placeholder={{lqip:item.lqip||null,dominant:item.dominant||item.dominant_color||null}}/></div>}
        {i===0&&<span className="cover-label">Главное</span>}{!loading&&<span className="photo-order-number">{i+1}</span>}
        {loading?<><div className="veyra-upload-progress" role="progressbar" aria-label={'Загрузка фотографии '+(i+1)} aria-valuenow={item.progress||0} aria-valuemin="0" aria-valuemax="100"><span style={{transform:'scaleX('+((item.progress||0)/100)+')'}}/></div><span className={'upload-state '+item.status}>{item.status==='done'?<span className="veyra-photo-upload-tick"><Icon name="check" tone="white" size={24}/></span>:item.status==='failed'?<Icon name="close" tone="white" size={20}/>:<span className="veyra-upload-circle" style={{'--upload-angle':(item.progress||0)+'%'}}><span className="veyra-upload-circle-inner"><strong>{item.progress||0}%</strong><small>{item.status==='waiting'?'в очереди':item.status==='processing'?'обработка':'загрузка'}</small></span></span>}</span></>:
        <><button className="thumb-delete" aria-label={'Удалить фотографию '+(i+1)} disabled={busy||uploading} onPointerDown={e=>e.stopPropagation()} onClick={()=>remove(i)}><Icon name="close" tone="pink" size={16}/></button></>}
       </div>})}
     {uploaded.length<MAX_PHOTOS&&<button type="button" aria-label="Добавить фото" className={'photo-slot photo-slot-add'+(uploaded.length===0?' primary':'')} onClick={()=>photoInput.current?.click()} disabled={busy||uploading}><Icon name="plus" tone="pink" size={30}/></button>}
    </div>
    <input ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={e=>{const selected=e.target.files;upload(selected);e.target.value=''}}/>

    
   </div>}
  </div>
  {dragVisual&&photos[dragVisual.index]&&<div className="photo-drag-ghost" aria-hidden="true" style={{left:dragVisual.x-dragVisual.width/2,top:dragVisual.y-dragVisual.height/2,width:dragVisual.width,height:dragVisual.height}}><Photo id={photos[dragVisual.index].id}/></div>}
  {hint&&<div className="registration-toast" role="status">{hint}</div>}
  <InlineAlert>{error}</InlineAlert>
   <nav className="registration-actions veyra-glass-navigation" aria-label="Навигация регистрации">
    {step>1&&<button type="button" className="veyra-glass-arrow veyra-glass-back" aria-label="Предыдущий шаг" disabled={busy||uploading||transitioning} onClick={()=>{haptic('light');go(step-1,'backward')}}><ChevronLeft size={27} strokeWidth={2.4}/></button>}
    <button type="button" className="veyra-glass-arrow veyra-glass-next" aria-label={step===8?'Предпросмотр анкеты':'Следующий шаг'} title={step===8?'Предпросмотр анкеты':'Следующий шаг'} disabled={!stepValid||busy||uploading||transitioning} aria-busy={busy||undefined} onClick={primaryAction}>
     {busy?<span className="veyra-glass-spinner" role="status" aria-label="Сохраняем"/>:step===8?<Check size={26} strokeWidth={2.5}/>:<ChevronRight size={27} strokeWidth={2.4}/>}
    </button>
   </nav>
 {legalOpen&&<LegalScreen asModal initialTab={legalTab} onClose={()=>setLegalOpen(false)} onAccept={()=>{setConsent(true);setLegalOpen(false)}}/>}
 </div>;
}
