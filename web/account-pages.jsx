import React,{useEffect,useState} from 'react';
import {Bell,EyeOff,Globe,ShieldCheck,ChevronRight,Download,Trash2,LogOut,Star,Send,ArrowUpRight,Ticket,Lock,MessageCircle,Check,Users,Copy} from 'lucide-react';
import {api,post,setSession,download} from './api';
import {Artwork,SectionHeading,VeyraIcon,VeyraPanel} from './graphics';
import {LocationSettings} from './content';

const Panel=VeyraPanel;

export function AccountSettings({app,Sheet,PauseToggle}){
 const{t,lang,me,refresh,run,setLang,alert,busy}=app;
 const L=(ru,en)=>lang==='ru'?ru:en;
 const[settings,setSettings]=useState({language:me.user.language,notifications:me.user.notifications,invisible:me.user.invisible});
 const[blocks,setBlocks]=useState([]),[orders,setOrders]=useState([]),[confirmDelete,setConfirmDelete]=useState(false);
 const[runtime,setRuntime]=useState({status:'loading',revision:null});
 async function checkRuntime(signal){
  setRuntime(previous=>({...previous,status:'loading'}));
  try{
   const response=await fetch('/healthz',{cache:'no-store',signal});
   if(!response.ok)throw Error('HEALTH_UNAVAILABLE');
   const data=await response.json();
   if(data?.ok!==true||data?.service!=='veyra')throw Error('HEALTH_UNAVAILABLE');
   const revision=typeof data.revision==='string'&&/^[a-f\d]{40}$/i.test(data.revision)?data.revision:null;
   setRuntime({status:'ready',revision});
  }catch(error){if(error?.name!=='AbortError')setRuntime({status:'unavailable',revision:null});}
 }
 useEffect(()=>{const controller=new AbortController();checkRuntime(controller.signal);return()=>controller.abort();},[]);
 useEffect(()=>{run(async()=>{const [b,o]=await Promise.all([api('/blocks'),api('/orders')]);setBlocks(b);setOrders(o);});},[]);
 return <section className="settings-page account-page">
  <SectionHeading eyebrow={L('ТВОЁ ПРОСТРАНСТВО','YOUR SPACE')} title={t('Настройки')} body={L('Всё так, как удобно тебе.','Make yourself at home.')} art="review-shield"/>
  <Panel title={L('Видимость и уведомления','Visibility & notifications')}><PauseToggle/>
   {[[Bell,'notifications','Уведомления',L('Не пропускай новые знакомства','Keep up with your connections')],[EyeOff,'invisible','Режим инкогнито',L('Больше контроля над видимостью','More control over your visibility')]].map(([Icon,key,label,note])=><label className="setting-row" key={key}><span className="account-icon"><VeyraIcon icon={Icon} size={20}/></span><span>{t(label)}<small>{note}</small></span><input role="switch" type="checkbox" checked={settings[key]} onChange={e=>setSettings(x=>({...x,[key]:e.target.checked}))}/></label>)}
  </Panel>
  <Panel><label className="setting-row language-setting"><span className="account-icon"><VeyraIcon icon={Globe} size={20}/></span><span>{t('Язык')}</span><select aria-label={t('Язык')} value={settings.language} onChange={e=>{setSettings(x=>({...x,language:e.target.value}));setLang(e.target.value);}}><option value="ru">Русский</option><option value="en">English</option></select></label></Panel>
  <button className="button primary full" disabled={busy} onClick={()=>run(async()=>{await api('/settings',{method:'PATCH',body:settings});await refresh();alert(t('Сохранено'));})}><VeyraIcon icon={Check} size={18}/>{t('Сохранить')}</button>
  <Panel><LocationSettings app={app} Sheet={Sheet}/></Panel><Panel title={t('Заблокированные')}>{blocks.length?blocks.map(b=><div className="setting-row" key={b.target}><span className="account-icon"><VeyraIcon icon={Lock} size={18}/></span><span>{b.name||b.target}</span><button className="text-button" disabled={busy} onClick={()=>run(async()=>{await api('/blocks/'+b.target,{method:'DELETE'});setBlocks(x=>x.filter(y=>y.target!==b.target));})}>{t('Разблокировать')}</button></div>):<p className="account-empty"><VeyraIcon icon={ShieldCheck} size={18}/>{L('Список пока пуст','No blocked people')}</p>}</Panel>
  <Panel title={t('Мои покупки')}>{orders.length?orders.map(o=><div className="setting-row order-row" key={o.id}><span>{o.sku}<small>{o.status}</small></span><b><VeyraIcon icon={Star} size={15}/>{o.total}</b></div>):<p className="account-empty"><VeyraIcon icon={Ticket} size={18}/>{L('Здесь появится история покупок','Your purchases will appear here')}</p>}</Panel>
  <Panel title={L('Аккаунт и безопасность','Account & security')} className="account-links">
   <button className="menu-row" onClick={()=>run(()=>download('/export','veyra-personal-data.json'))}><VeyraIcon icon={Download} size={19}/><span>{t('Выгрузить мои данные')}</span><VeyraIcon icon={ChevronRight} size={17}/></button>
   <a className="menu-row" href="/legal" target="_blank" rel="noreferrer"><VeyraIcon icon={ShieldCheck} size={19}/><span>{t('Условия и конфиденциальность')}</span><VeyraIcon icon={ArrowUpRight} size={17}/></a>
   <button className="menu-row" onClick={()=>run(async()=>{await post('/logout');setSession('');window.Telegram?.WebApp?.close();location.reload();})}><VeyraIcon icon={LogOut} size={19}/><span>{t('Выйти')}</span><VeyraIcon icon={ChevronRight} size={17}/></button>
   <button className="menu-row danger" onClick={()=>setConfirmDelete(true)}><VeyraIcon icon={Trash2} size={19}/><span>{t('Удалить аккаунт')}</span><VeyraIcon icon={ChevronRight} size={17}/></button>
  </Panel>
  <Panel title={L('Версия и состояние приложения','App version & status')} className="veyra-runtime-panel">
   <div className="veyra-runtime-state" role="status" aria-live="polite">
    <span className={'veyra-runtime-indicator '+(runtime.status==='ready'?'ready':runtime.status==='unavailable'?'error':'loading')} aria-hidden="true"/>
    <span><strong>{runtime.status==='loading'?L('Проверяем сервер…','Checking server…'):runtime.status==='ready'?L('Сервер отвечает','Server responding'):L('Не удалось проверить','Could not check')}</strong>
     <small>{L('Версия сервера','Server revision')}: <code>{runtime.revision?.slice(0,12)||'—'}</code></small></span>
   </div>
   <p className="veyra-runtime-hint">{L('По этому номеру можно узнать, установлено ли последнее обновление VEYRA.','Use this revision to check whether VEYRA has been updated.')}</p>
   <button type="button" className="button secondary full" disabled={runtime.status==='loading'} onClick={()=>checkRuntime()}>{L('Проверить снова','Check again')}</button>
  </Panel>
  {confirmDelete&&<Sheet title={t('Удалить аккаунт')} onClose={()=>setConfirmDelete(false)}><div className="confirmation-symbol"><VeyraIcon icon={Trash2} size={30}/></div><p>{t('Удалить аккаунт и анкету? Это действие нельзя отменить.')}</p><div className="confirmation-actions"><button className="button secondary full" onClick={()=>setConfirmDelete(false)}>{L('Оставить аккаунт','Keep my account')}</button><button className="button danger full" disabled={busy} onClick={()=>run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});setSession('');location.reload();})}>{t('Удалить аккаунт')}</button></div></Sheet>}
 </section>;
}

export function ReferralsPage({app}){
 const{t,lang,run,alert,refresh,busy}=app;const L=(ru,en)=>lang==='ru'?ru:en;
 const[data,setData]=useState(null),[code,setCode]=useState('');
 useEffect(()=>{run(async()=>setData(await api('/referrals')));},[]);
 const url=data?'https://t.me/VeyraAppBot?start=ref_'+data.code:'';
 return <section className="referrals-page account-page">
  <div className="editorial-hero referral-hero"><span className="section-eyebrow">VEYRA TOGETHER</span><Artwork name="referral-gift" size={190}/><h1>{t('Пригласи друзей')}</h1><p>{t('Поделись своей ссылкой. Бонус начисляется после одобрения анкеты друга.')}</p></div>
  {data&&<><div className="referral-stats">{[[Users,data.invited,'Приглашено'],[ShieldCheck,data.verified,'Проверено']].map(([Icon,count,label])=><div key={label}><VeyraIcon icon={Icon} size={21}/><strong>{count}</strong><span>{t(label)}</span></div>)}</div><Panel title={L('Твоя личная ссылка','Your invitation link')}><input className="referral-url" readOnly value={url} aria-label="Referral link" onFocus={e=>e.target.select()}/><button className="button secondary full copy-link" onClick={()=>run(async()=>{await navigator.clipboard.writeText(url);alert(L('Ссылка скопирована','Link copied'));})}><VeyraIcon icon={Copy} size={17}/>{L('Скопировать ссылку','Copy link')}</button><a className="button primary full" href={'https://t.me/share/url?url='+encodeURIComponent(url)}>{t('Поделиться')}<VeyraIcon icon={Send} size={18}/></a><p className="fineprint">{data.enabled?L('За проверенного друга: ','Per approved friend: ')+data.reward_superlikes+' Super Likes':L('Начисление наград временно приостановлено','Rewards are currently paused')}</p></Panel>{data.history?.length>0&&<Panel title={L('История приглашений','Invitation history')}>{data.history.map((r,i)=><div className="referral-history" key={i}><span>{r.name||L('Участник','Member')}<small> · {new Date(r.joined_at).toLocaleDateString()}</small></span><small>{r.rewarded?L('Награда начислена','Reward granted'):L('Ожидает проверки','Awaiting review')}</small></div>)}</Panel>}</>}
  <Panel title={t('Промокод')}><form className="promo-entry" onSubmit={e=>{e.preventDefault();run(async()=>{await post('/promo',{code});await refresh();alert(t('Готово'));});}}><input value={code} onChange={e=>setCode(e.target.value)} aria-label={t('Промокод')} placeholder="VEYRA…" maxLength={40} autoCapitalize="characters" required/><button disabled={busy||!code.trim()} type="submit" className="button secondary">{t('Применить')}<VeyraIcon icon={ChevronRight} size={16}/></button></form></Panel>
 </section>;
}

export function SupportPage({app}){
 const{t,lang,run,alert,busy}=app;const L=(ru,en)=>lang==='ru'?ru:en;
 const[faqs,setFaqs]=useState([]);useEffect(()=>{api('/content?kind=faq').then(setFaqs).catch(()=>{});},[]);
 const[body,setBody]=useState(''),[category,setCategory]=useState('general'),[rows,setRows]=useState([]),[failed,setFailed]=useState(false);
 const load=async()=>{setFailed(false);try{setRows(await api('/support'));}catch(e){setFailed(true);throw e;}};useEffect(()=>{run(load);},[]);
 return <section className="support-page account-page"><SectionHeading eyebrow={L('МЫ РЯДОМ','HERE FOR YOU')} title={t('Поддержка')} body={L('Поможем разобраться. Просто напиши.','Tell us what’s on your mind.')} art="chat-bubbles"/>
  <Panel title="FAQ" className="support-faq">{[
   ['Когда проверят анкету?','Каждую анкету проверяет человек. Статус и причина отказа видны в профиле. После исправлений можно отправить анкету снова.'],
   ['Как начать переписку?','Поставь лайк. Когда симпатия взаимна, появится мэтч и откроется чат.'],
   ['Как оплачивается Premium?','Через Telegram Stars. Возможности начисляются после подтверждения Telegram. Автопродления нет.'],
   ['Другие видят точное местоположение?','Нет. В анкете показываются город и приблизительное расстояние.'],...faqs.map(f=>[f.title,f.body])].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</Panel>
  <Panel><form onSubmit={e=>{e.preventDefault();run(async()=>{await post('/support',{body,category});setBody('');await load();alert(t('Обращение отправлено'));});}}><label className="field"><span>{L('Тема','Category')}</span><select value={category} onChange={e=>setCategory(e.target.value)}>{[['general','Общий вопрос'],['payment','Платежи'],['profile','Анкета'],['safety','Безопасность'],['bug','Ошибка приложения']].map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="field"><span>{t('Опиши вопрос')}</span><textarea rows={5} required maxLength={3000} value={body} placeholder={L('Что случилось?','How can we help?')} onChange={e=>setBody(e.target.value)}/></label><span className="input-count">{body.length} / 3000</span><button className="button primary full" disabled={busy||!body.trim()} type="submit">{t('Отправить')}<VeyraIcon icon={Send} size={18}/></button></form></Panel>
  {failed&&<button className="button secondary full" onClick={()=>run(load)}>Повторить загрузку обращений</button>}
  {rows.length>0&&<h2 className="account-section-title">{L('Твои обращения','Your conversations')}</h2>}{rows.map(row=><article className="ticket" key={row.id}><header><VeyraIcon icon={MessageCircle} size={17}/><small>#{row.id.slice(0,8)}</small><span>{row.status==='resolved'?L('Закрыто','Closed'):L('Открыто','Open')}</span></header><p>{row.body}</p>{row.reply&&!row.messages?.some(m=>m.is_staff)&&<blockquote><span>VEYRA</span>{row.reply}</blockquote>}{row.messages?.map(m=><p className={'ticket-reply '+(m.is_staff?'staff':'')} key={m.id}><small>{m.is_staff?'VEYRA':L('Ты','You')}</small><br/>{m.body}</p>)}<form onSubmit={e=>{e.preventDefault();const form=e.currentTarget,reply=new FormData(form).get('reply');run(async()=>{await post('/support/'+row.id+'/messages',{body:reply});form.reset();await load();});}}><textarea name="reply" aria-label="Дополнить обращение" placeholder={row.status==='resolved'?'Задать дополнительный вопрос':'Дополнить обращение'} maxLength={3000} required rows={2}/><button className="button secondary" type="submit" disabled={busy}>Дополнить <VeyraIcon icon={Send} size={15}/></button>{row.status==='open'&&<button className="text-button" type="button" disabled={busy} onClick={()=>run(async()=>{await post('/support/'+row.id+'/close');await load();})}>Закрыть обращение</button>}</form></article>)}
 </section>;
}
