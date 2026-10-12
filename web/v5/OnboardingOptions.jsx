import React,{useMemo,useState} from 'react';
import {Icon,InterestIcon} from './UI.jsx';
import './OnboardingOptions.css';

export const GOALS=[
 {value:'relationship',title:'Серьёзные отношения',subtitle:'Хочу найти своего человека',icon:'heart'},
 {value:'dating',title:'Свидания',subtitle:'Знакомиться, встречаться и узнавать друг друга',icon:'flirt'},
 {value:'friends',title:'Общение',subtitle:'Новые люди и интересные разговоры',icon:'chats'},
 {value:'unsure',title:'Пока не определился',subtitle:'Посмотрим, куда приведёт знакомство',icon:'sparkle'}
];
export const goalTitle=value=>GOALS.find(x=>x.value===value)?.title||'Пока не определился';
export const INTEREST_GROUPS=[
 {title:'Музыка',icon:'музыка',items:['музыка','концерты','поп','рок','рэп','электронная музыка','живые выступления','караоке','игра на гитаре']},
 {title:'Активность',icon:'спорт',items:['спорт','фитнес','бег','тренажёрный зал','плавание','велосипед','футбол','бокс','йога','походы','танцы']},
 {title:'Культура',icon:'кино',items:['кино','сериалы','аниме','театр','книги','психология','подкасты','искусство','музеи','фотография','фото']},
 {title:'Путешествия',icon:'путешествия',items:['путешествия','горы','море','поездки на машине','кемпинг','новые города','природа','прогулки']},
 {title:'Вкус и стиль',icon:'вкусная еда',items:['вкусная еда','кулинария','кофе','рестораны','уличная еда','мода','шопинг','уход за собой']},
 {title:'Образ жизни',icon:'технологии',items:['технологии','видеоигры','автомобили','бизнес','волонтёрство','семья','домашние животные','животные','настольные игры','изучение языков']},
 {title:"Кино и развлечения",icon:"кино",items:["документальные фильмы","комедии","триллеры","фантастика","мультфильмы","ужасы","настольные квизы","стендап","фестивали","стриминг"]},
 {title:"Спорт и движение",icon:"спорт",items:["баскетбол","волейбол","теннис","боевые искусства","сноуборд","лыжи","скейтборд","пилатес","растяжка","турник","марафоны"]},
 {title:"Искусство и творчество",icon:"искусство",items:["рисование","дизайн","иллюстрации","керамика","handmade","музыкальные инструменты","живопись","поэзия","архитектура","декор"]},
 {title:"Еда и напитки",icon:"вкусная еда",items:["азиатская кухня","итальянская кухня","выпечка","домашняя кухня","десерты","чай","бранчи","барбекю","правильное питание","новые вкусы"]},
 {title:"Природа и питомцы",icon:"животные",items:["кошки","собаки","лошади","эко-путешествия","садоводство","солнце и пляж","закаты","пикники","звёздное небо","рыбалка"]},
 {title:"Технологии и игры",icon:"технологии",items:["искусственный интеллект","разработка","гаджеты","киберспорт","компьютерные игры","консольные игры","мобильные игры","робототехника","космос","наука"]},
 {title:"Саморазвитие",icon:"книги",items:["самообразование","медитация","финансы","изучение культур","языковая практика","осознанность","история","публичные выступления","личный рост"]},
 {title:"Город и встречи",icon:"путешествия",items:["уютные кафе","городские прогулки","выставки","вечеринки","живая музыка","волонтёрские события","гастромаркеты","экскурсии","тематические встречи","квесты"]}
];
const interestIconMap=Object.fromEntries(INTEREST_GROUPS.flatMap(group=>group.items.map(x=>[x,group.icon])));
export function CatalogueIcon({value,size=17}){return <InterestIcon name={interestIconMap[value]||value} size={size}/>;}
export const LANGUAGES=[
 ['ru','Русский'],['en','English'],['hy','Հայերեն'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['pt','Português'],['tr','Türkçe'],['ar','العربية'],['uk','Українська'],['ka','ქართული'],['az','Azərbaycanca'],['kk','Қазақша'],['uz','Oʻzbekcha'],['fa','فارسی'],['hi','हिन्दी'],['zh','中文'],['ja','日本語'],['ko','한국어'],['pl','Polski'],['nl','Nederlands']
];
export const languageName=code=>LANGUAGES.find(x=>x[0]===code)?.[1]||code;
export const PROMPTS=[
 {key:'first_date',title:'Идеальное первое свидание'},
 {key:'laugh',title:'Меня всегда рассмешит…'},
 {key:'unique',title:'Что меня отличает от других'},
 {key:'weekend',title:'Мой идеальный выходной'},
 {key:'dream',title:'Мечта, которую хочу осуществить'},
 {key:'surprise',title:'Обо мне никто не догадается, что…'},
 {key:'value',title:'В отношениях для меня важно'},
 {key:'conversation',title:'Можем часами говорить о…'},
 {key:'travel',title:'Билет в любую точку мира — куда?'},
 {key:'green_flag',title:'Я сразу замечаю в людях…'}
];
export const promptTitle=key=>PROMPTS.find(x=>x.key===key)?.title||'О себе';
export const profileCompletion=(p,photoCount=0)=>{
 const checks=[!!p?.name,!!p?.city,photoCount>=3,!!p?.goal,(p?.interests||[]).length>=3,(p?.languages||[]).length>0,!!p?.bio?.trim(),(p?.prompts||[]).some(x=>x.answer?.trim())];
 return Math.round(checks.filter(Boolean).length/checks.length*100);
};
export function GoalPicker({value,onChange}){return <div className="veyra-goal-list" role="group" aria-label="Цель знакомства">{GOALS.map(goal=><button type="button" key={goal.value} className={'veyra-goal-choice '+(value===goal.value?'is-active':'')} aria-pressed={value===goal.value} onClick={()=>onChange(goal.value)}><span className="veyra-goal-icon"><Icon name={goal.icon} tone="pink" size={25}/></span><span className="veyra-goal-copy"><strong>{goal.title}</strong><small>{goal.subtitle}</small></span><span className="veyra-goal-radio">{value===goal.value&&<Icon name="check" size={14} tone="white"/>}</span></button>)}</div>;}
export function InterestPicker({value=[],onChange,max=12}){
 const [search,setSearch]=useState(''),[opened,setOpened]=useState('Музыка'),[limitMessage,setLimitMessage]=useState(false);
 const selected=Array.isArray(value)?value:[],query=search.trim().toLowerCase();
 const groups=useMemo(()=>INTEREST_GROUPS.map(g=>({...g,items:g.items.filter(item=>item.toLowerCase().includes(query))})).filter(g=>g.items.length),[query]);
 const toggle=item=>{if(selected.includes(item)){setLimitMessage(false);onChange(selected.filter(x=>x!==item))}else if(selected.length<max){setLimitMessage(false);onChange([...selected,item])}else setLimitMessage(true);};
 return <div className="veyra-interest-picker veyra-interest-accordion">
  <div className="veyra-picker-head"><strong>Твои интересы</strong><span>{selected.length}/{max}</span></div>
  <p className="veyra-picker-caption">До 12 увлечений из любых категорий.</p>
  <input className="veyra-picker-search" aria-label="Поиск интересов" placeholder="Найти интерес…" value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="veyra-interest-picked" aria-label="Выбранные интересы"><strong>Выбрано</strong><div className="veyra-selected-scroller">{selected.length?selected.map(x=><button type="button" key={x} aria-label={'Убрать '+x} onClick={()=>toggle(x)}>{x} ×</button>):<span className="veyra-empty-selected">Пока ничего не выбрано</span>}</div></div>
  <div className="veyra-accordion-groups">{groups.map(g=><section key={g.title} className={'veyra-accordion-group '+((query||opened===g.title)?'expanded':'')}>
   <button className="veyra-accordion-toggle" type="button" aria-expanded={!!query||opened===g.title} onClick={()=>setOpened(opened===g.title?'':g.title)}><CatalogueIcon value={g.items[0]} size={21}/><span>{g.title}</span><small>{g.items.filter(x=>selected.includes(x)).length||''}</small><Icon name={(!!query||opened===g.title)?'chevron-up':'chevron-down'} size={18}/></button>
   <div className="veyra-accordion-content"><div className="veyra-interest-options">{g.items.map(x=><button type="button" key={x} aria-pressed={selected.includes(x)} className={selected.includes(x)?'selected':selected.length>=max?'at-limit':''} onClick={()=>toggle(x)}><CatalogueIcon value={x} size={16}/>{x}{selected.includes(x)&&<Icon name="check" tone="pink" size={14}/>}</button>)}</div></div>
  </section>)}</div>
  {!groups.length&&<p className="veyra-picker-caption">Ничего не найдено, попробуй другое слово.</p>}
  {(limitMessage||selected.length===max)&&<p role="status" className="veyra-interest-limit">Выбраны все 12 интересов. Чтобы добавить новый, убери один из списка выше.</p>}
 </div>;
}
export function LanguagesPicker({value=[],onChange}){const [q,setQ]=useState('');const selected=Array.isArray(value)?value:[];return <div className="veyra-picker"><div className="veyra-picker-head"><strong>Языки общения</strong><span>{selected.length}/5</span></div><p className="veyra-picker-caption">На каких языках тебе удобно переписываться?</p><input className="veyra-picker-search" aria-label="Поиск языка" value={q} onChange={e=>setQ(e.target.value)} placeholder="Найти язык…"/><div className="veyra-language-options">{LANGUAGES.filter(([code,label])=>code.includes(q.trim().toLowerCase())||label.toLowerCase().includes(q.trim().toLowerCase())).map(([code,label])=><button type="button" key={code} className={selected.includes(code)?'selected':''} aria-pressed={selected.includes(code)} disabled={!selected.includes(code)&&selected.length>=5} onClick={()=>onChange(selected.includes(code)?selected.filter(x=>x!==code):[...selected,code])}>{label}{selected.includes(code)&&<Icon name="check" tone="pink" size={15}/>}</button>)}</div></div>;}
export function PromptsPicker({value=[],onChange}){const prompts=Array.isArray(value)?value:[];const [q,setQ]=useState('');return <div className="veyra-picker"><div className="veyra-picker-head"><strong>Ответы о себе</strong><span>{prompts.length}/3</span></div><p className="veyra-picker-caption">Выбери до трёх вопросов — это отличный повод начать разговор.</p><select aria-label="Выбрать вопрос" value={q} onChange={e=>{const key=e.target.value;setQ('');if(key&&!prompts.some(x=>x.key===key)&&prompts.length<3)onChange([...prompts,{key,answer:''}]);}}><option value="">+ добавить вопрос</option>{PROMPTS.filter(p=>!prompts.some(x=>x.key===p.key)).map(p=><option key={p.key} value={p.key}>{p.title}</option>)}</select>{prompts.map((p,i)=><div className="veyra-prompt-edit" key={p.key}><div><strong>{promptTitle(p.key)}</strong><button type="button" aria-label="Удалить вопрос" onClick={()=>onChange(prompts.filter((_,index)=>i!==index))}><Icon name="close" size={18}/></button></div><textarea maxLength={240} value={p.answer} placeholder="Расскажи своими словами…" onChange={e=>onChange(prompts.map((x,index)=>index===i?{...x,answer:e.target.value}:x))}/><small>{p.answer.length}/240</small></div>)}</div>;}
export function ProfileHighlights({profile,viewer}){if(!profile)return null;const common=(profile.interests||[]).filter(x=>(viewer?.interests||[]).includes(x)),sameGoal=viewer?.goal&&viewer.goal!=='unsure'&&viewer.goal===profile.goal;
 return <div className="veyra-profile-highlights">{(common.length>0||sameGoal)&&<section className="veyra-common-card"><strong><Icon name="heart" tone="pink" size={19}/> У вас есть общее</strong>{sameGoal&&<span className="veyra-common-tag">Цель: {goalTitle(profile.goal).toLowerCase()}</span>}{common.map(x=><span key={x} className="veyra-common-tag"><CatalogueIcon value={x} size={15}/>{x}</span>)}</section>}
 <section className="veyra-detail-card"><strong>Цель знакомства</strong><p><Icon name="heart" tone="pink" size={16}/>{goalTitle(profile.goal)}</p></section>
 {!!profile.languages?.length&&<section className="veyra-detail-card"><strong>Языки общения</strong><div className="veyra-pill-list">{profile.languages.map(code=><span key={code}>{languageName(code)}</span>)}</div></section>}
 {!!profile.prompts?.length&&<section className="veyra-prompt-cards">{profile.prompts.filter(p=>p.answer?.trim()).map(p=><article key={p.key}><small>{promptTitle(p.key)}</small><p>{p.answer}</p></article>)}</section>}
 {profile.height_cm&&<section className="veyra-detail-card"><strong>Рост</strong><p>{profile.height_cm} см</p></section>}</div>;
}
