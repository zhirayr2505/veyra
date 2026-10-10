import React,{useEffect,useRef,useState} from 'react';
import {get,post,photoUrl} from './api.js';
import {Button,Header,Icon,Photo,Tabs,Empty,Sheet,InlineAlert,Spinner} from './UI.jsx';
const modes=[['discover','для вас'],['nearby','рядом'],['for_you','по интересам']];
export function Discover({onProfile,onMatch,onPremium,onFilters,refreshTick=0}){
 const [mode,setMode]=useState('discover'),[card,setCard]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[limited,setLimited]=useState(false),[index,setIndex]=useState(0),[last,setLast]=useState({can_undo:false,free_undo_left:0,premium:false,target:null});
 const ticket=useRef(0);
 useEffect(()=>{const id=card?.photos?.[index+1];if(id)photoUrl(id).catch(()=>{})},[card,index]);
 useEffect(()=>{let live=true;get('/reactions/last').then(x=>{if(live)setLast({...x,target:x.action?.target||null})}).catch(()=>{});return()=>{live=false}},[]);
 const fetchCard=async(nextMode=mode)=>{const seq=++ticket.current;setLoading(true);setCard(null);setError('');setIndex(0);try{const r=await get('/feed?mode='+nextMode);if(seq===ticket.current){const next=r.profiles?.[0]||null;if(next?.photos?.[0])photoUrl(next.photos[0]).catch(()=>{});setCard(next);setLimited(!!r.limited)}}catch(e){if(seq===ticket.current)setError('Не удалось загрузить анкеты: '+e.message)}finally{if(seq===ticket.current)setLoading(false)}};
 useEffect(()=>{fetchCard(mode);return()=>{ticket.current++}},[mode,refreshTick]);
 const react=async kind=>{if(!card||busy)return;setBusy(true);setError('');
 try{
  const r=await post('/reactions',{target:String(card.id),kind,next_mode:mode});
  setLast(x=>({...x,target:String(card.id),can_undo:!r.matched}));
  if(r.next){
   ++ticket.current;
   const nextCard=r.next.profiles?.[0]||null;
   setCard(nextCard);setIndex(0);setLoading(false);setLimited(!!r.next.limited);
   if(nextCard?.photos?.[0])photoUrl(nextCard.photos[0]).catch(()=>{});
  }else await fetchCard();
  if(r.matched)onMatch(r.match_id,card);
 }catch(e){if(e.message.includes('LIMIT')||e.message.includes('REQUIRED'))onPremium();else setError(e.message)}finally{setBusy(false)}
};
 const undo=async()=>{if(busy||!last?.can_undo||!last.target)return;setBusy(true);setError('');try{const r=await post('/reactions/undo',{target:String(last.target)});++ticket.current;setLoading(false);setLimited(false);setCard(r.profile);setIndex(0);setLast(x=>({...x,can_undo:false,target:null,free_undo_left:x.premium?x.free_undo_left:Math.max(0,x.free_undo_left-1)}))}catch(e){if(e.message.includes('PREMIUM_REQUIRED'))onPremium();else setError('Не удалось вернуть анкету: '+e.message)}finally{setBusy(false)}};
 let tx=useRef(null);
 return <section className="discover screen">
  <div className="feed-head"><span className="spark-badge"><Icon name="sparkle" tone="pink" size={17}/></span><div className="feed-logo"><img src="/assets/veyra/00_brand/veyra_logo.svg" width="99" alt="veyra"/></div><button className="icon-button" aria-label="Фильтры" onClick={onFilters}><Icon name="filters"/></button></div>
  <Tabs items={modes} value={mode} onChange={next=>{if(!busy)setMode(next)}}/>
  <div className="feed-content">
   {loading&&!card?<div className="loading-photo"><Spinner/><span className="loading-caption">подбираем следующую анкету…</span></div>:card?<><div className="feed-photo" onTouchStart={e=>tx.current=e.touches[0]?.clientX} onTouchEnd={e=>{if(tx.current==null)return;const dx=e.changedTouches[0].clientX-tx.current;if(Math.abs(dx)>35)setIndex(i=>Math.max(0,Math.min((card.photos||[]).length-1,i+(dx<0?1:-1))));tx.current=null}}>
   <Photo id={card.photos?.[index]} className="hero-photo" alt={card.name}/>
   <div className="photo-bars">{card.photos?.map((x,i)=><button key={x} className={i===index?'active':''} aria-label={'Фото '+(i+1)} onClick={()=>setIndex(i)}/>)}</div>
   <button className="hero-more" aria-label="Открыть профиль" onClick={()=>onProfile(card.id)}><Icon name="user" tone="white" size={22}/></button>
   <div className="hero-tap left" aria-label="Предыдущее фото" onClick={()=>setIndex(i=>Math.max(0,i-1))}/><div className="hero-tap right" aria-label="Следующее фото" onClick={()=>setIndex(i=>Math.min((card.photos||[]).length-1,i+1))}/>
   <div className="hero-info"><button className="hero-name" onClick={()=>onProfile(card.id)}>{card.name}, {card.age} {card.online&&<span className="online-dot"/>}</button><p><Icon name="pin" tone="white" size={14}/> {card.city}{card.distance_km!==undefined?' · '+Math.round(card.distance_km)+' км':''}</p><p className="hero-bio">{card.bio?.slice(0,100)}</p><div className="hero-tags">{card.popular&&<span>💗 популярный</span>}{card.new_member&&<span>✨ новенький</span>}{(card.interests||[]).slice(0,3).map(s=><span key={s}>{s}</span>)}</div></div>
   </div><div className="feed-actions"><button disabled={busy||!last.can_undo||(!last.premium&&!last.free_undo_left)} title="Отменить последнее действие" aria-label="Отменить последнее действие" className="action action-undo" onClick={undo}><Icon name="undo" tone="dark"/></button><button disabled={busy} title="Пропустить" className="action action-pass" onClick={()=>react('pass')}><Icon name="close" tone="pink"/></button><button disabled={busy} title="Нравится" className="action action-like" onClick={()=>react('like')}><Icon name="heart_filled" tone="white" size={35}/></button><button disabled={busy} title="Суперлайк" className="action action-super" onClick={()=>react('super')}><Icon name="star" tone="pink" size={25}/></button></div>
   </>:<Empty title={error?'связь прервалась':limited?'на сегодня всё':'новые люди скоро появятся'} body={error?'Проверь подключение и попробуй ещё раз.':limited?'Лимит анкет на сегодня исчерпан.':'Расширь расстояние или заходи позже — здесь появятся новые анкеты после модерации.'} action={<Button onClick={limited?onPremium:()=>fetchCard()}> {limited?'открыть Premium':'обновить'} </Button>}/>}
   <InlineAlert>{error}</InlineAlert>
  </div>
 </section>
}
