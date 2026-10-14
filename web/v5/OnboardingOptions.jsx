import React,{useMemo,useState} from 'react';
import {Music2,Dumbbell,Clapperboard,Plane,UtensilsCrossed,Heart,Film,Bike,Palette,Coffee,PawPrint,Cpu,BookOpen,MapPin,Sparkles,ChevronDown} from 'lucide-react';
import {Icon,InterestIcon,Choice,InterestChip} from './UI.jsx';
import {interestTone} from './profilePolishLogic.js';
import {haptic} from './haptics.js';
import './OnboardingOptions.css';

export const GOALS=[
 {value:'relationship',title:'Серьёзные отношения',subtitle:'Хочу найти своего человека',icon:'heart'},
 {value:'dating',title:'Свидания',subtitle:'Встречаться и узнавать друг друга',icon:'flirt'},
 {value:'friendship',title:'Дружба и общение',subtitle:'Знакомства и новые друзья',icon:'everyone'},
 {value:'flirt',title:'Флирт',subtitle:'Лёгкое знакомство и взаимная симпатия',icon:'flirt'},
 {value:'casual',title:'Свободные отношения',subtitle:'Общение без серьёзных обязательств',icon:'sparkle'},
 {value:'unsure',title:'Пока не определился',subtitle:'Посмотрим, к чему приведёт знакомство',icon:'sparkle'}
];
const LEGACY_GOAL_TITLES={friends:'Общение',travel:'Компания для путешествий'};
export const goalTitle=value=>GOALS.find(x=>x.value===value)?.title||LEGACY_GOAL_TITLES[value]||'Пока не определился';
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

/* A single palette and stroke language across all 14 interest categories. */
const CATEGORY_ICON_MAP={
 'Музыка':Music2,'Активность':Dumbbell,'Культура':Clapperboard,
 'Путешествия':Plane,'Вкус и стиль':UtensilsCrossed,'Образ жизни':Heart,
 'Кино и развлечения':Film,'Спорт и движение':Bike,
 'Искусство и творчество':Palette,'Еда и напитки':Coffee,
 'Природа и питомцы':PawPrint,'Технологии и игры':Cpu,
 'Саморазвитие':BookOpen,'Город и встречи':MapPin
};
export function CategoryGlyph({title,size=18}){
 const Art=CATEGORY_ICON_MAP[title]||Sparkles;
 return <Art className="veyra-category-glyph" size={size} strokeWidth={2.15} aria-hidden="true"/>;
}

const interestIconMap=Object.fromEntries(INTEREST_GROUPS.flatMap(group=>group.items.map(x=>[x,group.icon])));
export function CatalogueIcon({value,size=17}){const item=INTEREST_GROUPS.find(g=>g.items.includes(value));return item?<CategoryGlyph title={item.title} size={size}/>:<InterestIcon name={value} size={size}/>;}
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
export function GoalPicker({value,onChange}){return <div className="veyra-goal-list veyra-goal-list-v9" role="group" aria-label="Цель знакомства">{GOALS.map(goal=><Choice key={goal.value} className="veyra-goal-choice" selected={value===goal.value} onClick={()=>onChange(goal.value)}><span key={value===goal.value?goal.value+'-on':goal.value+'-off'} className="veyra-goal-icon"><Icon name={goal.icon} tone="pink" size={26}/></span><span className="veyra-goal-copy"><strong>{goal.title}</strong><small>{goal.subtitle}</small></span><span className="veyra-goal-radio">{value===goal.value&&<Icon name="check" size={14} tone="white"/>}</span></Choice>)}</div>;}
const POPULAR_INTERESTS=['музыка','спорт','кино','путешествия','кофе','книги'];
const INTEREST_SYNONYMS={'электронная музыка':['электро','edm'],'фитнес':['тренировки'],'путешествия':['туризм','travel'],'фотография':['фотки'],'видеоигры':['игры','гейминг'],'искусственный интеллект':['ии','ai'],'изучение языков':['языки']};
const ALL_INTERESTS=Array.from(new Set(INTEREST_GROUPS.flatMap(group=>group.items)));
const normalizeInterestSearch=text=>String(text||'').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
const INTEREST_LOOKUP=ALL_INTERESTS.map(item=>({item,match:[item,...(INTEREST_SYNONYMS[item]||[])].map(normalizeInterestSearch)}));
export function InterestPicker({value=[],onChange,max=12}){
 const [category,setCategory]=useState('Популярное'),[query,setQuery]=useState(''),[expandedSelected,setExpandedSelected]=useState(false),[limitMessage,setLimitMessage]=useState(false);
 const selected=Array.isArray(value)?value:[],selectedSet=useMemo(()=>new Set(selected),[value]);
 const term=normalizeInterestSearch(query);
 const visible=useMemo(()=>{
  if(term)return INTEREST_LOOKUP.filter(x=>x.match.some(word=>word.includes(term))).map(x=>x.item);
  return category==='Популярное'?POPULAR_INTERESTS:INTEREST_GROUPS.find(x=>x.title===category)?.items||[];
 },[term,category]);
 const toggle=item=>{
  if(selectedSet.has(item)){onChange(selected.filter(x=>x!==item));setLimitMessage(false);haptic('selection');return}
  if(selected.length>=max){setLimitMessage(true);haptic('error');return}
  onChange([...selected,item]);setLimitMessage(false);haptic('selection');
 };
 const compactSelected=expandedSelected?selected:selected.slice(0,4);
 return <div className="veyra-interest-picker vx-onboard-interest" aria-label="Выбор интересов">
  <div className="vx-interest-topline"><span>Твои увлечения</span><strong className={'vx-interest-counter'+(limitMessage?' at-limit':'')} role="status">{selected.length}/{max}</strong></div>
  <label className="vx-interest-search"><Icon name="search" size={19}/><input type="search" aria-label="Поиск по интересам" autoComplete="off" value={query} onChange={e=>{setQuery(e.target.value);setLimitMessage(false)}} placeholder="Найти интерес…"/>{query&&<button type="button" aria-label="Очистить поиск интересов" onClick={()=>setQuery('')}>×</button>}</label>
  {!!selected.length&&<section className="vx-selected-wrap" aria-label="Выбранные интересы"><div className="vx-selected-chips">{compactSelected.map(item=><InterestChip key={item} className="vx-selected-chip" label={item} tone={interestTone(item,INTEREST_GROUPS)} selected removable onRemove={()=>toggle(item)} icon={<CatalogueIcon value={item} size={15}/>}/>)}</div>{selected.length>4&&<button type="button" className="vx-selected-more" onClick={()=>setExpandedSelected(open=>!open)}>{expandedSelected?'Свернуть':'Ещё '+(selected.length-4)}</button>}</section>}
  {!term&&<div className="vx-interest-category-tabs" role="tablist" aria-label="Категории интересов">
   {['Популярное',...INTEREST_GROUPS.map(g=>g.title)].map(title=><button key={title} type="button" role="tab" aria-selected={category===title} className={category===title?'active':''} onClick={()=>{setCategory(title);setLimitMessage(false)}}>{title==='Популярное'?<Sparkles size={16}/>:<CategoryGlyph title={title} size={16}/>}<span>{title}</span></button>)}
  </div>}
  <div className="vx-interest-panel" key={term?'search-'+term:category} role="tabpanel" aria-label={term?'Результаты поиска':category}>
   {visible.length?<div className="veyra-interest-options vx-interest-chip-grid">{visible.map(item=><InterestChip key={item} label={item} icon={<CatalogueIcon value={item} size={17}/>} tone={interestTone(item,INTEREST_GROUPS)} selected={selectedSet.has(item)} className="vx-interest-choice" onClick={()=>toggle(item)}>{selectedSet.has(item)&&<Icon name="check" tone="white" size={14}/>}</InterestChip>)}</div>:<p className="vx-interest-empty">Ничего не найдено. Попробуй другое слово.</p>}
  </div>
  {selected.length<3&&<p className="vx-interest-minimum" role="status">Выбери ещё {3-selected.length}, чтобы продолжить</p>}
  {limitMessage&&<p className="vx-interest-limit-message" role="alert">Можно выбрать до {max} интересов</p>}
 </div>;
}
export function LanguagesPicker({value=[],onChange}){const [q,setQ]=useState('');const selected=Array.isArray(value)?value:[];return <div className="veyra-picker"><div className="veyra-picker-head"><strong>Языки общения</strong><span>{selected.length}/5</span></div><p className="veyra-picker-caption">На каких языках тебе удобно переписываться?</p><input className="veyra-picker-search" aria-label="Поиск языка" value={q} onChange={e=>setQ(e.target.value)} placeholder="Найти язык…"/><div className="veyra-language-options">{LANGUAGES.filter(([code,label])=>code.includes(q.trim().toLowerCase())||label.toLowerCase().includes(q.trim().toLowerCase())).map(([code,label])=><button type="button" key={code} className={selected.includes(code)?'selected':''} aria-pressed={selected.includes(code)} disabled={!selected.includes(code)&&selected.length>=5} onClick={()=>onChange(selected.includes(code)?selected.filter(x=>x!==code):[...selected,code])}>{label}{selected.includes(code)&&<Icon name="check" tone="pink" size={15}/>}</button>)}</div></div>;}
export function PromptsPicker({value=[],onChange}){const prompts=Array.isArray(value)?value:[];const [q,setQ]=useState('');return <div className="veyra-picker"><div className="veyra-picker-head"><strong>Ответы о себе</strong><span>{prompts.length}/3</span></div><p className="veyra-picker-caption">Выбери до трёх вопросов — это отличный повод начать разговор.</p><select aria-label="Выбрать вопрос" value={q} onChange={e=>{const key=e.target.value;setQ('');if(key&&!prompts.some(x=>x.key===key)&&prompts.length<3)onChange([...prompts,{key,answer:''}]);}}><option value="">+ добавить вопрос</option>{PROMPTS.filter(p=>!prompts.some(x=>x.key===p.key)).map(p=><option key={p.key} value={p.key}>{p.title}</option>)}</select>{prompts.map((p,i)=><div className="veyra-prompt-edit" key={p.key}><div><strong>{promptTitle(p.key)}</strong><button type="button" aria-label="Удалить вопрос" onClick={()=>onChange(prompts.filter((_,index)=>i!==index))}><Icon name="close" size={18}/></button></div><textarea maxLength={240} value={p.answer} placeholder="Расскажи своими словами…" onChange={e=>onChange(prompts.map((x,index)=>index===i?{...x,answer:e.target.value}:x))}/><small>{p.answer.length}/240</small></div>)}</div>;}
export function ProfileHighlights({profile,viewer,showGoal=true,showCommon=true}){if(!profile)return null;const common=(profile.interests||[]).filter(x=>(viewer?.interests||[]).includes(x)),sameGoal=viewer?.goal&&viewer.goal!=='unsure'&&viewer.goal===profile.goal;
 return <div className="veyra-profile-highlights">{showCommon&&(common.length>0||sameGoal)&&<section className="veyra-common-card"><strong><Icon name="heart" tone="pink" size={19}/> У вас есть общее</strong>{sameGoal&&<span className="veyra-common-tag">Цель: {goalTitle(profile.goal).toLowerCase()}</span>}{common.map(x=><span key={x} className="veyra-common-tag"><CatalogueIcon value={x} size={15}/>{x}</span>)}</section>}
 {showGoal&&<section className="veyra-detail-card"><strong>Цель знакомства</strong><p><Icon name="heart" tone="pink" size={16}/>{goalTitle(profile.goal)}</p></section>}
 {!!profile.languages?.length&&<section className="veyra-detail-card"><strong>Языки общения</strong><div className="veyra-pill-list">{profile.languages.map(code=><span key={code}>{languageName(code)}</span>)}</div></section>}
 {!!profile.prompts?.length&&<section className="veyra-prompt-cards">{profile.prompts.filter(p=>p.answer?.trim()).map(p=><article key={p.key}><small>{promptTitle(p.key)}</small><p>{p.answer}</p></article>)}</section>}
 {profile.height_cm&&<section className="veyra-detail-card"><strong>Рост</strong><p>{profile.height_cm} см</p></section>}</div>;
}
