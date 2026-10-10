import React,{useEffect,useState} from 'react';
import {get} from './api.js';
import {Header,Photo,Button,Tabs,Icon,Empty,Spinner} from './UI.jsx';
export function Likes({onProfile,onChat,onPremium,refreshTick=0,active=true}){
 const [tab,setTab]=useState('new'),[matches,setMatches]=useState([]),[incoming,setIncoming]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(!active)return;let live=true;const load=()=>Promise.all([get('/matches'),get('/likes')]).then(([m,l])=>{if(live){setMatches(m);setIncoming(l);setError('')}}).catch(e=>{if(live)setError('Не удалось обновить симпатии: '+e.message)}).finally(()=>{if(live)setBusy(false)});setBusy(true);load();const timer=setInterval(()=>{if(!document.hidden)load()},18000);const visible=()=>{if(!document.hidden)load()};document.addEventListener('visibilitychange',visible);return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible)}},[refreshTick,active]);
 const list=tab==='incoming'?(incoming?.profiles||[]):tab==='new'?matches.filter(m=>Date.now()-new Date(m.created_at).getTime()<48*3600000):matches;
 return <div className="page likes"><div className="title-line"><strong>симпатии</strong><Header side={<button className="quiet" onClick={onPremium}><Icon name="filters"/></button>}/></div><Tabs items={ [['new','новые'],['matches','мэтчи'],['incoming','входящие']] } value={tab} onChange={setTab}/>
 {error&&<div className="alert" role="alert">{error}</div>}
 {busy?<div className="center-loading"><Spinner/></div>:tab==='incoming'&&incoming?.locked?<Empty title={(incoming.count||0)+' новых симпатий'} body="Узнай, кому ты понравился, с Premium" action={<Button onClick={onPremium}>открыть Premium</Button>}/>:!list?.length?<Empty title="пока здесь тихо" body="Взаимные симпатии появятся, когда вы понравитесь друг другу."/>:<>
 {tab!=='incoming'&&<div className="section-label">{tab==='new'?'новые мэтчи':'все мэтчи'} <span>{matches.length}</span></div>}
 <div className={'match-grid '+(tab==='new'?'large':'')}>{list.map((m,i)=>{const p=m.profile||m;return <article key={m.id||p.id||i} className="match-card"><Photo id={p.photos?.[0]} onClick={()=>onProfile(p.id,m.id)}/><div className="match-info"><strong>{p.name}, {p.age}</strong><small>{p.city}</small>{m.id?<button onClick={()=>onChat(m.id)}><Icon name="send" tone="white" size={14}/> написать</button>:<button onClick={()=>onProfile(p.id)}>профиль</button>}</div></article>})}</div>
 </>}
 </div>;
}
