import React,{useEffect,useRef,useState} from 'react';
import {get,post} from './api.js';
import {Icon,InlineAlert,Spinner} from './UI.jsx';
import './Premium.css';

const benefits=[
 {icon:'heart',eyebrow:'СВОБОДА',title:'Лайкай без ограничений',short:'Больше знакомств каждый день',description:'Смотри анкеты и ставь симпатии без дневных лимитов. Когда хочется продолжать — ничто не остановит.',number:'∞',hint:'Вместо 15 лайков в день'},
 {icon:'eye',eyebrow:'ВЗАИМНОСТЬ',title:'Узнай, кому ты понравился',short:'Все входящие симпатии открыты',description:'Не гадай, кто оставил тебе сердечко. В Premium можно посмотреть входящие симпатии и выбрать, кому ответить.',number:'♡',hint:'Открытые входящие'},
 {icon:'superlike',eyebrow:'ВНИМАНИЕ',title:'3 суперлайка каждый день',short:'Для тех, кто действительно цепляет',description:'Покажи человеку, что он особенный. Три суперлайка обновляются каждый день в рамках Premium.',number:'×3',hint:'Каждый день'},
 {icon:'undo',eyebrow:'ВТОРОЙ ШАНС',title:'Возвращай понравившихся',short:'Отменяй свайпы без лимита',description:'Случайно пролистал интересную анкету? Возвращай последний свайп без ежедневного ограничения.',number:'↶',hint:'Без лимита отмен'},
 {icon:'lock',eyebrow:'ПРИВАТНОСТЬ',title:'Режим невидимки',short:'Больше контроля над своим присутствием',description:'Включай невидимость в настройках и управляй тем, насколько заметен твой профиль другим.',number:'◌',hint:'Настройка приватности'},
 {icon:'premium',eyebrow:'ПРОДВИЖЕНИЕ',title:'Бесплатный буст раз в неделю',short:'30 минут дополнительной видимости',description:'Один буст на 30 минут доступен каждую неделю с Premium. Помоги своей анкете оказаться на виду.',number:'30',hint:'Минут на буст'}
];
const planNames={premium_first:'Знакомство с Premium',premium_day:'На 24 часа',premium_week:'На 7 дней',premium_month:'На 30 дней'};
const planOrder={premium_first:0,premium_day:1,premium_week:2,premium_month:3};
const choosePlan=products=>products.find(p=>p.sku==='premium_month')?.sku||products.find(p=>p.sku==='premium_week')?.sku||products[0]?.sku||'';
const isActive=until=>!!until&&new Date(until).getTime()>Date.now();
const formatDate=until=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(until));

export function Premium({me,onClose,refresh}){
 const [catalog,setCatalog]=useState(null);
 const [selectedSku,setSelectedSku]=useState('');
 const [fetchError,setFetchError]=useState('');
 const [buying,setBuying]=useState(false);
 const [message,setMessage]=useState('');
 const [featureIndex,setFeatureIndex]=useState(null);
 const modal=useRef(null),closeRef=useRef(onClose),refreshRef=useRef(refresh),timers=useRef([]);
 closeRef.current=onClose;refreshRef.current=refresh;
 const clearTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
 const later=(callback,ms)=>{const timer=setTimeout(callback,ms);timers.current.push(timer)};
 useEffect(()=>{
  let live=true;
  get('/products').then(data=>{
   if(!live)return;
   const products=(data.products||[]).filter(p=>p.kind==='premium').sort((a,b)=>(planOrder[a.sku]??99)-(planOrder[b.sku]??99));
   setCatalog({...data,products});
   setSelectedSku(current=>products.some(p=>p.sku===current)?current:choosePlan(products));
  }).catch(e=>{if(live)setFetchError(e.message)});
  return()=>{live=false;clearTimers()};
 },[]);
 useEffect(()=>{
  const bodyOverflow=document.body.style.overflow,htmlOverflow=document.documentElement.style.overflow,oldFocus=document.activeElement;
  document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
  modal.current?.querySelector('.vp-dismiss')?.focus({preventScroll:true});
  return()=>{document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=htmlOverflow;if(oldFocus?.isConnected)oldFocus.focus?.({preventScroll:true})};
 },[]);
 useEffect(()=>{
  const onKey=e=>{
   if(e.key==='Escape'){e.preventDefault();if(featureIndex!==null)setFeatureIndex(null);else closeRef.current?.();return}
   if(featureIndex!==null&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
    e.preventDefault();setFeatureIndex(i=>(i+(e.key==='ArrowRight'?1:-1)+benefits.length)%benefits.length);return;
   }
   if(e.key!=='Tab'||!modal.current)return;
   const scope=featureIndex===null?modal.current:modal.current.querySelector('.vp-feature-modal');
   const items=[...(scope?.querySelectorAll('button:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')||[])].filter(el=>el.getClientRects().length);
   if(!items.length)return;
   if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
   else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
  };
  document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
 },[featureIndex]);
 useEffect(()=>{if(featureIndex!==null)modal.current?.querySelector('.vp-feature-close')?.focus({preventScroll:true})},[featureIndex]);

 const products=catalog?.products||[];
 const selected=products.find(p=>p.sku===selectedSku);
 const ownerFree=!!catalog?.owner_free;
 const enabled=!!catalog?.enabled;
 const active=isActive(me?.user?.premium_until);
 const close=()=>{if(featureIndex!==null){setFeatureIndex(null);return}onClose()};
 const verifyPayment=(oldExpiry,attempt=0)=>{
  refreshRef.current?.().then(updated=>{
   const expiry=new Date(updated?.user?.premium_until||0).getTime();
   if(expiry>oldExpiry){setMessage('Premium активирован! Все возможности уже доступны.');setBuying(false);return}
   if(attempt<4){later(()=>verifyPayment(oldExpiry,attempt+1),1500)}
   else{setBuying(false);setMessage('Оплата завершена. Если Premium ещё не появился, открой этот экран чуть позже — активация подтверждается сервером.')}
  }).catch(()=>{setBuying(false);setMessage('Оплата завершена. Обнови профиль чуть позже, чтобы проверить активацию.')});
 };
 const purchase=async()=>{
  if(!selected||buying||!enabled)return;
  clearTimers();setBuying(true);setFetchError('');setMessage('');
  const before=new Date(me?.user?.premium_until||0).getTime();
  try{
   const result=await post('/payments/invoice',{sku:selected.sku,provider:'stars'});
   if(result.status==='owner_granted'){
    const updated=await refreshRef.current?.();
    setMessage(updated?.user?.premium_until?'Premium активирован для тестирования.':'Тестовый доступ предоставлен.');
    setBuying(false);return;
   }
   if(!result.url)throw Error('Ссылка на оплату недоступна');
   const tg=window.Telegram?.WebApp;
   if(tg?.openInvoice){
    tg.openInvoice(result.url,status=>{
     if(status==='paid'){setMessage('Платёж прошёл в Telegram. Подтверждаем Premium…');verifyPayment(before)}
     else {setBuying(false);if(status==='failed')setFetchError('Telegram не смог завершить оплату. Попробуй ещё раз.')}
    });
   }else{
    window.open(result.url,'_blank','noopener,noreferrer');
    setBuying(false);setMessage('Заверши покупку в Telegram, затем вернись в VEYRA.');
   }
  }catch(e){setBuying(false);setFetchError(e.message||'Не удалось создать платёж')}
 };
 const feature=featureIndex===null?null:benefits[featureIndex];
 return <div className="vp-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="vp-modal" ref={modal} role="dialog" aria-modal="true" aria-label="VEYRA Premium">
   <div className="vp-scroll">
    <header className="vp-hero">
     <div className="vp-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
     <div className="vp-topbar">
      <span className="vp-brand"><img src="/veyra-approved/00_brand/veyra_logo_white.svg" alt="VEYRA"/></span>
      <button type="button" className="vp-dismiss" onClick={close} aria-label="Закрыть Premium"><Icon name="close" tone="white" size={22}/></button>
     </div>
     <div className="vp-emblem-stage" aria-hidden="true">
      <span className="vp-orbit vp-orbit-one"/><span className="vp-orbit vp-orbit-two"/>
      <span className="vp-emblem-glow"/><span className="vp-emblem">
       <span className="vp-emblem-inner"><Icon name="premium" tone="white" size={86}/></span>
      </span>
      <span className="vp-comet vp-comet-one"/><span className="vp-comet vp-comet-two"/><span className="vp-comet vp-comet-three"/>
     </div>
     <div className="vp-intro">
      <span className="vp-overline"><span className="vp-glint">✦</span> ТВОЯ ОСОБЕННАЯ ИСТОРИЯ</span>
      <h1>VEYRA <span>Premium</span></h1>
      <p>Больше искренних симпатий. Больше ярких встреч. Больше возможностей быть собой.</p>
      {active&&<div className="vp-active-status"><Icon name="verified" tone="white" size={17}/> Активен до {formatDate(me.user.premium_until)}</div>}
     </div>
     <div className="vp-hero-bottom" aria-hidden="true"/>
    </header>

    <main className="vp-content">
     <div className="vp-section-heading"><span>ВСЁ ДЛЯ ТВОЕЙ ИСТОРИИ</span><h2>Знакомства без границ</h2><p>Нажми на возможность, чтобы увидеть подробности.</p></div>
     <div className="vp-benefits">
      {benefits.map((item,index)=><button className="vp-benefit" type="button" key={item.title} style={{'--vp-stagger':index*55+'ms'}} onClick={()=>setFeatureIndex(index)} aria-label={item.title+'. Подробнее'}>
       <span className={'vp-benefit-icon vp-benefit-icon-'+index}><Icon name={item.icon} tone="pink" size={25}/></span>
       <span className="vp-benefit-body"><strong>{item.title}</strong><small>{item.short}</small></span>
       <span className="vp-benefit-arrow"><Icon name="chevron-right" size={17}/></span>
      </button>)}
     </div>
     <div className="vp-callout"><span className="vp-callout-sparkle">✦</span><div><strong>Никакой магии. Только больше шансов.</strong><p>Твои знакомства — по твоим правилам.</p></div></div>

     <section className="vp-plans" aria-labelledby="vp-plans-title">
      <div className="vp-section-heading vp-plans-heading"><span>ВЫБЕРИ СВОЙ РИТМ</span><h2 id="vp-plans-title">{active?'Продлить Premium':'Твой Premium начинается здесь'}</h2><p>Разовая покупка за Telegram Stars, без автопродления.</p></div>
      {!catalog&&!fetchError&&<div className="vp-loading"><Spinner/> Загружаем доступные тарифы…</div>}
      <div className="vp-plan-list" role="radiogroup" aria-label="Тариф Premium">
       {products.map(p=>{
        const chosen=p.sku===selectedSku;
        const featured=p.sku==='premium_month';
        return <button key={p.sku} type="button" role="radio" aria-checked={chosen} disabled={buying} className={'vp-plan'+(chosen?' vp-plan-selected':'')} onClick={()=>setSelectedSku(p.sku)}>
         <span className="vp-radio" aria-hidden="true"><span/></span>
         <span className="vp-plan-copy"><strong>{planNames[p.sku]||p.title}</strong><small>{p.sku==='premium_first'?'Специальный тариф для первого знакомства':p.amount===1?'Целый день особенных возможностей':p.amount===7?'Неделя новых впечатлений':p.amount===30?'Месяц без ограничений':p.amount+' дней Premium'}</small></span>
         <span className="vp-plan-price"><b>{ownerFree?'0':p.stars} <span>⭐</span></b>{featured&&<em>На 30 дней</em>}</span>
         {featured&&<span className="vp-plan-popular">ПОПУЛЯРНЫЙ</span>}
        </button>;
       })}
      </div>
      {catalog&&products.length===0&&<p className="vp-empty">Сейчас нет доступных тарифов Premium.</p>}
      {catalog&&!enabled&&!ownerFree&&<p className="vp-disabled-note">Оплата Premium временно отключена администратором.</p>}
      <div className="vp-payment-note"><Icon name="lock" tone="pink" size={18}/> Оплата проводится в Telegram. VEYS не списываются.</div>
     </section>
    </main>
   </div>

   <footer className="vp-checkout">
    {fetchError&&<InlineAlert>{fetchError}</InlineAlert>}
    {message&&<div className="vp-message" role="status">{message}</div>}
    <button className="vp-buy" type="button" onClick={purchase} disabled={!selected||!enabled||buying}>
     {buying?<><Spinner/> Ожидаем подтверждения…</>:<><span className="vp-buy-icon"><Icon name="premium" tone="white" size={21}/></span><span>{ownerFree?'Активировать Premium':active?'Продлить Premium':'Получить Premium'}</span><span className="vp-buy-price">{selected?(ownerFree?'0':selected.stars)+' ⭐':'—'}</span></>}
    </button>
    <p>Разовая покупка · Никаких скрытых списаний</p>
   </footer>

   {feature&&<div className="vp-feature-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setFeatureIndex(null)}}>
    <section className="vp-feature-modal" role="dialog" aria-modal="true" aria-label={feature.title}>
     <button className="vp-feature-close" type="button" onClick={()=>setFeatureIndex(null)} aria-label="Вернуться к преимуществам"><Icon name="close" tone="white" size={22}/></button>
     <div className="vp-feature-art" key={featureIndex}>
      <span className="vp-feature-ring vp-feature-ring-one"/><span className="vp-feature-ring vp-feature-ring-two"/>
      <span className="vp-feature-disk"><Icon name={feature.icon} tone="white" size={75}/></span>
      <span className="vp-feature-stat">{feature.number}</span>
     </div>
     <div className="vp-feature-text"><span>{feature.eyebrow}</span><h2>{feature.title}</h2><p>{feature.description}</p><small>✦ {feature.hint}</small></div>
     <div className="vp-feature-nav"><button type="button" onClick={()=>setFeatureIndex(i=>(i+benefits.length-1)%benefits.length)} aria-label="Предыдущее преимущество"><Icon name="chevron-left" tone="white" size={25}/></button><span>{benefits.map((_,i)=><i key={i} className={i===featureIndex?'current':''}/>)}</span><button type="button" onClick={()=>setFeatureIndex(i=>(i+1)%benefits.length)} aria-label="Следующее преимущество"><Icon name="chevron-right" tone="white" size={25}/></button></div>
     <button type="button" className="vp-feature-back" onClick={()=>setFeatureIndex(null)}>Выбрать Premium <span>↓</span></button>
    </section>
   </div>}
  </section>
 </div>;
}
