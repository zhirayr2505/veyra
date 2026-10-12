import React,{useEffect,useRef,useState} from 'react';
import {Smile,Lightbulb,PenLine,X} from 'lucide-react';
import './BioStep.css';

const LIMIT=250;
const cps=text=>Array.from(String(text||''));
const CATEGORIES=[
 {id:'smile',label:'Эмоции',icon:'😊',items:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','🥰','😘','😉','😎','🥹','😭','😌','🤩','😋','😇','🤗','🤔','😏','😴']},
 {id:'love',label:'Любовь',icon:'💜',items:['💜','❤️','💕','💖','💗','💘','💝','💞','💟','🫶','💌','💋','🥰','😍','❤️‍🔥','🌹','🌷','💐','🩷','💙','🤍','💛']},
 {id:'hands',label:'Жесты',icon:'🫶',items:['👍','👋','🙌','👏','🙏','👌','🤝','💪','🤞','✌️','🫶','🤟','🤘','👊','✋','👐','☝️','🤌','👉','👈']},
 {id:'nature',label:'Природа',icon:'🌿',items:['🌿','🌸','🌻','🌺','🌼','🌞','🌙','⭐','✨','🌈','☀️','🌊','🌴','🍀','🌹','🦋','🐈','🐕','🍃','🌲']},
 {id:'food',label:'Еда',icon:'🍕',items:['🍕','🍔','🍟','🍓','🍣','🍦','🍫','🍉','🍒','🥑','🍝','🥐','☕','🍵','🍹','🎂','🍩','🍪','🍇','🍋']},
 {id:'travel',label:'Поездки',icon:'✈️',items:['✈️','🌍','🌎','🌏','🗺️','🏖️','🏔️','🚗','🚆','🚲','⛺','🌅','🌃','🛳️','🏝️','🏕️','🎒','📸','🛫','🏙️']},
 {id:'hobby',label:'Хобби',icon:'🎨',items:['🎶','🎧','🎸','🎹','🎤','🎮','📚','🎨','🎬','🎭','🎯','🎲','⚽','🏀','🏋️','🏃','🧘','📷','💻','🪩']},
 {id:'symbols',label:'Символы',icon:'✨',items:['✨','💫','🔥','💯','✅','💎','🎉','🎁','🎀','🎈','🔮','☮️','♾️','❣️','‼️','❓','💬','🔆','🕊️','🪄']}
];
export function BioStep({value='',onChange}){
 const [open,setOpen]=useState(false),[category,setCategory]=useState(CATEGORIES[0].id),[limitNote,setLimitNote]=useState(false);
 const field=useRef(null),popup=useRef(null),toggle=useRef(null),sel=useRef({start:value.length,end:value.length}),noteTimer=useRef(null);
 const warnLimit=()=>{setLimitNote(true);clearTimeout(noteTimer.current);noteTimer.current=setTimeout(()=>setLimitNote(false),2800)};
 useEffect(()=>()=>clearTimeout(noteTimer.current),[]);
 const remember=()=>{if(field.current)sel.current={start:field.current.selectionStart,end:field.current.selectionEnd}};
 useEffect(()=>{if(!open)return;const outside=e=>{if(!popup.current?.contains(e.target)&&!toggle.current?.contains(e.target))setOpen(false)};
  const escape=e=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[open]);
 const insert=emoji=>{
  const a=Math.min(sel.current.start,value.length),b=Math.min(sel.current.end,value.length);
  const attempted=cps(value.slice(0,a)+emoji+value.slice(b));
  if(attempted.length>LIMIT)warnLimit();
  const text=attempted.slice(0,LIMIT).join('');
  onChange(text);const pos=Math.min(text.length,a+emoji.length);sel.current={start:pos,end:pos};
 };
 const current=CATEGORIES.find(c=>c.id===category)||CATEGORIES[0];
 return <section className="veyra-bio-step" aria-label="Немного о себе">
  <div className="veyra-bio-intro"><div className="veyra-bio-symbol"><PenLine size={23}/></div><h2>Твоя история начинается здесь</h2><p>Пара искренних предложений помогут начать знакомство.</p></div>
  <div className="veyra-bio-panel">
   <div className="veyra-bio-topline"><strong>О себе</strong><span>Необязательно</span></div>
   <div className="veyra-bio-editor">
    <textarea ref={field} aria-label="О себе" rows={5} value={value} onChange={e=>{const attempted=cps(e.target.value);if(attempted.length>LIMIT)warnLimit();onChange(attempted.slice(0,LIMIT).join(''));remember()}} onSelect={remember} onClick={remember} onKeyUp={remember} placeholder="Чем увлекаешься? Как проводишь свободное время? Что тебя вдохновляет?" spellCheck/>
    <button ref={toggle} type="button" className={'veyra-bio-emoji-button'+(open?' active':'')} onPointerDown={remember} onClick={()=>setOpen(v=>!v)} aria-label="Добавить эмодзи" aria-expanded={open} aria-controls="veyra-emoji-compact"><Smile size={20}/></button>
    {open&&<div id="veyra-emoji-compact" className="veyra-bio-emoji-panel" ref={popup} role="group" aria-label="Выбор эмодзи">
     <div className="veyra-bio-emoji-header"><div className="veyra-bio-emoji-categories" role="tablist" aria-label="Категории эмодзи">{CATEGORIES.map(cat=><button key={cat.id} type="button" role="tab" title={cat.label} aria-label={cat.label} aria-selected={category===cat.id} className={category===cat.id?'active':''} onClick={()=>setCategory(cat.id)}>{cat.icon}</button>)}</div><button type="button" className="veyra-bio-emoji-close" aria-label="Закрыть эмодзи" onClick={()=>setOpen(false)}><X size={15}/></button></div>
     <div className="veyra-bio-emoji-rail" role="group" aria-label={'Эмодзи: '+current.label}>{current.items.map((emoji,i)=><button key={i} type="button" aria-label={'Вставить '+emoji} onPointerDown={e=>e.preventDefault()} onClick={()=>insert(emoji)}>{emoji}</button>)}</div>
    </div>}
   </div>
   {limitNote&&<div className="veyra-bio-limit-bubble" role="status">Максимум 250 символов, включая эмодзи</div>}
   <div className="veyra-bio-tools"><span>Расскажи о себе в своём стиле</span><span className="veyra-bio-counter" aria-live="polite">{cps(value).length}/{LIMIT}</span></div>
  </div>
  <div className="veyra-bio-inspiration"><Lightbulb size={17}/><p><strong>О чём можно рассказать?</strong><span>Хобби, любимый отдых или то, что делает тебя тобой.</span></p></div>
 </section>;
}
