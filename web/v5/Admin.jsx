import React,{useEffect,useState} from 'react';
import {get,post,patch,download} from './api.js';
import {Header,Button,Tabs,Photo,InlineAlert,Spinner,Empty,Icon} from './UI.jsx';
const mainTabs=[['overview','обзор'],['review','модерация'],['users','люди'],['reports','жалобы'],['tools','управление']];
export function Admin({onExit}){
 const [view,setView]=useState('overview'),[stats,setStats]=useState(null),[queue,setQueue]=useState([]),[users,setUsers]=useState([]),[reports,setReports]=useState([]),[flags,setFlags]=useState([]),[orders,setOrders]=useState([]),[filter,setFilter]=useState('pending'),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[acting,setActing]=useState(''),[err,setErr]=useState(''),[info,setInfo]=useState('');
 const fetchData=async(v=view)=>{
  setBusy(true);setErr('');try{
   if(v==='overview'){const[s,o]=await Promise.all([get('/admin/dashboard'),get('/admin/orders')]);setStats(s);setOrders(o);}
   if(v==='review')setQueue(await get('/admin/profiles?status='+filter));
   if(v==='users')setUsers(await get('/admin/users?q='+encodeURIComponent(q)));
   if(v==='reports')setReports(await get('/admin/reports'));
   if(v==='tools')setFlags(await get('/admin/feature_flags'));
  }catch(e){setErr(e.message)}finally{setBusy(false)}
 };
 useEffect(()=>{fetchData(view)},[view,filter]);
 const run=async(fn)=>{setErr('');setInfo('');setActing('busy');try{await fn();setInfo('Изменения сохранены');await fetchData(view)}catch(e){setErr(e.message)}finally{setActing('')}};
 const moderate=(p,decision)=>{let reason='';if(decision==='rejected'){reason=window.prompt('Укажи причину отказа')||'';if(!reason.trim())return;}run(()=>post('/admin/profiles/'+p.user_id+'/moderate',{decision,reason,revision:p.revision}))};
 const userStatus=(u,status)=>{if(!window.confirm((status==='banned'?'Заблокировать':'Разблокировать')+' пользователя '+(u.name||u.id)+'?'))return;run(()=>post('/admin/users/'+u.id+'/status',{status}))};
 const resolve=(r)=>run(()=>post('/admin/reports/'+r.id+'/resolve',{}));
 const flag=(f)=>{if(f.key==='payments'&&!f.enabled&&!window.confirm('Подтверди: включать реальные платежи Telegram Stars можно только после проверки покупки и возврата. Продолжить?'))return;run(()=>patch('/admin/feature_flags/'+f.key,{enabled:!f.enabled}))};
 const downloadFile=async(path,name)=>{try{await download(path,name)}catch(e){setErr(e.message)}};
 return <main className="page admin"><Header back={onExit}/><h1>панель VEYRA</h1><div className="admin-tabstrip">{mainTabs.map(([k,n])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{n}</button>)}</div>
 <InlineAlert>{err}</InlineAlert>{info&&<p className="tip">{info}</p>}
 {busy&&<div className="center-loading"><Spinner/></div>}
 {!busy&&view==='overview'&&<><h2>состояние приложения</h2><div className="stats-grid">{Object.entries(stats||{}).map(([k,v])=><div key={k}><strong>{v}</strong><small>{k}</small></div>)}</div><Button onClick={()=>{setView('review');setFilter('pending')}}>проверить новые анкеты</Button><h3 style={{marginTop:30}}>последние покупки</h3>{orders.slice(0,10).map(o=><div key={o.id} className="admin-line"><span>{o.sku||o.kind} · {o.status}</span><b>{o.total} ⭐</b></div>)}</>}
 {!busy&&view==='review'&&<><Tabs items={[['pending','ожидают'],['approved','одобрены'],['rejected','отклонены']]} value={filter} onChange={setFilter}/>{queue.length===0?<Empty title="очередь пуста" body="На выбранном этапе анкет нет"/>:<div className="moderation-list">{queue.map(p=><article key={p.user_id} className="moderation-profile"><h2>{p.name} · {p.birth_date?.slice(0,10)}</h2><p>{p.city}, {p.country} · @{p.username||'нет username'}</p><p>{p.bio}</p><p><strong>Цель:</strong> {p.goal||'не указана'}</p><p><strong>Интересы:</strong> {(p.interests||[]).join(', ')||'не указаны'}</p><p><strong>Языки:</strong> {(p.languages||[]).join(', ')||'не указаны'}</p>{Array.isArray(p.prompts)&&p.prompts.filter(x=>x.answer).map(x=><div key={x.key} className="admin-line"><strong>{x.key}</strong><p>{x.answer}</p></div>)}{p.height_cm&&<p><strong>Рост:</strong> {p.height_cm} см</p>}<div className="photo-gallery-mini">{p.photos?.map(id=><Photo key={id} id={id}/>)}</div><p>пользователь {p.user_id} · ревизия {p.revision}</p>{filter==='pending'&&<div className="row"><Button disabled={!!acting} onClick={()=>moderate(p,'approved')}>одобрить</Button><Button kind="outline" disabled={!!acting} onClick={()=>moderate(p,'rejected')}>отклонить</Button></div>}</article>)}</div>}</>}
 {!busy&&view==='users'&&<><form className="search-row" onSubmit={e=>{e.preventDefault();fetchData('users')}}><input placeholder="ID, имя или @username" value={q} onChange={e=>setQ(e.target.value)}/><Button type="submit">найти</Button></form><div className="admin-table">{users.map(u=><div key={u.id} className="admin-line"><div><strong>{u.name||u.first_name||'Пользователь'}</strong><small>{u.id} · @{u.username||'-'} · {u.moderation||'без анкеты'}</small></div><button className="btn outline" disabled={!!acting} onClick={()=>userStatus(u,u.status==='banned'?'active':'banned')}>{u.status==='banned'?'разблокировать':'блокировать'}</button></div>)}</div></>}
 {!busy&&view==='reports'&&<>{reports.filter(r=>r.status==='open').length===0?<Empty title="активных жалоб нет" body="Открытые обращения появятся здесь"/>:reports.filter(r=>r.status==='open').map(r=><div className="moderation-profile" key={r.id}><strong>{r.reason}</strong><p>{r.details}</p><p>заявитель {r.reporter} · на {r.target}</p><Button disabled={!!acting} onClick={()=>resolve(r)}>закрыть жалобу</Button></div>)}</>}
 {!busy&&view==='tools'&&<><h2>состояние функций</h2>{flags.map(f=><div className="admin-line" key={f.key}><div><strong>{f.key}</strong><small>{f.enabled?'включено':'выключено'}</small></div><button className={'mini-toggle '+(f.enabled?'on':'')} disabled={!!acting} onClick={()=>flag(f)}>{f.enabled?'вкл':'выкл'}</button></div>)}<h2>выгрузка</h2><Button kind="outline" onClick={()=>downloadFile('/admin/export.csv','veyra-users.csv')}>экспорт пользователей CSV</Button><Button kind="outline" onClick={()=>downloadFile('/admin/export.zip','veyra-backup.zip')}>фотографии и чаты ZIP</Button><p className="tip">Файлы содержат персональные данные. Храните их только в защищённом месте.</p></>}
 </main>;
}
