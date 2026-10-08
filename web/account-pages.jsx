import React,{useEffect,useState} from 'react';
import {Bell,EyeOff,Globe,ShieldCheck,ChevronRight,Download,Trash2,LogOut,Star,Send,ArrowUpRight,Ticket,Lock,MessageCircle,Check,Users} from 'lucide-react';
import {api,post,setSession,download} from './api';
import {Artwork,SectionHeading} from './graphics';

function Panel({title,children,className=''}){
 return <section className={'account-panel '+className}>{title&&<h2>{title}</h2>}{children}</section>;
}

export function AccountSettings({app,Sheet,PauseToggle}){
 const{t,lang,me,refresh,run,setLang,alert,busy}=app;
 const L=(ru,en)=>lang==='ru'?ru:en;
 const[settings,setSettings]=useState({language:me.user.language,notifications:me.user.notifications,invisible:me.user.invisible});
 const[blocks,setBlocks]=useState([]),[orders,setOrders]=useState([]),[confirmDelete,setConfirmDelete]=useState(false);
 useEffect(()=>{run(async()=>{const [b,o]=await Promise.all([api('/blocks'),api('/orders')]);setBlocks(b);setOrders(o);});},[]);
 return <section className="settings-page account-page">
  <SectionHeading eyebrow={L('ТВОЁ ПРОСТРАНСТВО','YOUR SPACE')} title={t('Настройки')} body={L('Всё так, как удобно тебе.','Make yourself at home.')} art="review-shield"/>
  <Panel title={L('Видимость и уведомления','Visibility & notifications')}><PauseToggle/>
   {[[Bell,'notifications','Уведомления',L('Не пропускай новые знакомства','Keep up with your connections')],[EyeOff,'invisible','Режим инкогнито',L('Больше контроля над видимостью','More control over your visibility')]].map(([Icon,key,label,note])=><label className="setting-row" key={key}><span className="account-icon"><Icon size={20}/></span><span>{t(label)}<small>{note}</small></span><input role="switch" type="checkbox" checked={settings[key]} onChange={e=>setSettings(x=>({...x,[key]:e.target.checked}))}/></label>)}
  </Panel>
  <Panel><label className="setting-row language-setting"><span className="account-icon"><Globe size={20}/></span><span>{t('Язык')}</span><select aria-label={t('Язык')} value={settings.language} onChange={e=>{setSettings(x=>({...x,language:e.target.value}));setLang(e.target.value);}}><option value="ru">Русский</option><option value="en">English</option></select></label></Panel>
  <button className="button primary full" disabled={busy} onClick={()=>run(async()=>{await api('/settings',{method:'PATCH',body:settings});await refresh();alert(t('Сохранено'));})}><Check size={18}/>{t('Сохранить')}</button>
  <Panel title={t('Заблокированные')}>{blocks.length?blocks.map(b=><div className="setting-row" key={b.target}><span className="account-icon"><Lock size={18}/></span><span>{b.name||b.target}</span><button className="text-button" disabled={busy} onClick={()=>run(async()=>{await api('/blocks/'+b.target,{method:'DELETE'});setBlocks(x=>x.filter(y=>y.target!==b.target));})}>{t('Разблокировать')}</button></div>):<p className="account-empty"><ShieldCheck size={18}/>{L('Список пока пуст','No blocked people')}</p>}</Panel>
  <Panel title={t('Мои покупки')}>{orders.length?orders.map(o=><div className="setting-row order-row" key={o.id}><span>{o.sku}<small>{o.status}</small></span><b><Star size={15}/>{o.total}</b></div>):<p className="account-empty"><Ticket size={18}/>{L('Здесь появится история покупок','Your purchases will appear here')}</p>}</Panel>
  <Panel title={L('Аккаунт и безопасность','Account & security')} className="account-links">
   <button className="menu-row" onClick={()=>run(()=>download('/export','veyra-personal-data.json'))}><Download size={19}/><span>{t('Выгрузить мои данные')}</span><ChevronRight size={17}/></button>
   <a className="menu-row" href="/legal" target="_blank" rel="noreferrer"><ShieldCheck size={19}/><span>{t('Условия и конфиденциальность')}</span><ArrowUpRight size={17}/></a>
   <button className="menu-row" onClick={()=>run(async()=>{await post('/logout');setSession('');window.Telegram?.WebApp?.close();location.reload();})}><LogOut size={19}/><span>{t('Выйти')}</span><ChevronRight size={17}/></button>
   <button className="menu-row danger" onClick={()=>setConfirmDelete(true)}><Trash2 size={19}/><span>{t('Удалить аккаунт')}</span><ChevronRight size={17}/></button>
  </Panel>
  {confirmDelete&&<Sheet title={t('Удалить аккаунт')} onClose={()=>setConfirmDelete(false)}><div className="confirmation-symbol"><Trash2 size={30}/></div><p>{t('Удалить аккаунт и анкету? Это действие нельзя отменить.')}</p><div className="confirmation-actions"><button className="button secondary full" onClick={()=>setConfirmDelete(false)}>{L('Оставить аккаунт','Keep my account')}</button><button className="button danger full" disabled={busy} onClick={()=>run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});setSession('');location.reload();})}>{t('Удалить аккаунт')}</button></div></Sheet>}
 </section>;
}

export function ReferralsPage({app}){
 const{t,lang,run,alert,refresh,busy}=app;const L=(ru,en)=>lang==='ru'?ru:en;
 const[data,setData]=useState(null),[code,setCode]=useState('');
 useEffect(()=>{run(async()=>setData(await api('/referrals')));},[]);
 const url=data?'https://t.me/VeyraAppBot?start=ref_'+data.code:'';
 return <section className="referrals-page account-page">
  <div className="editorial-hero referral-hero"><span className="section-eyebrow">VEYRA TOGETHER</span><Artwork name="referral-gift" size={190}/><h1>{t('Пригласи друзей')}</h1><p>{t('Поделись своей ссылкой. Бонус начисляется после одобрения анкеты друга.')}</p></div>
  {data&&<><div className="referral-stats">{[[Users,data.invited,'Приглашено'],[ShieldCheck,data.verified,'Проверено']].map(([Icon,count,label])=><div key={label}><Icon size={21}/><strong>{count}</strong><span>{t(label)}</span></div>)}</div><Panel title={L('Твоя личная ссылка','Your invitation link')}><input className="referral-url" readOnly value={url} aria-label="Referral link" onFocus={e=>e.target.select()}/><a className="button primary full" href={'https://t.me/share/url?url='+encodeURIComponent(url)}>{t('Поделиться')}<Send size={18}/></a></Panel></>}
  <Panel title={t('Промокод')}><form className="promo-entry" onSubmit={e=>{e.preventDefault();run(async()=>{await post('/promo',{code});await refresh();alert(t('Готово'));});}}><input value={code} onChange={e=>setCode(e.target.value)} aria-label={t('Промокод')} placeholder="VEYRA…" maxLength={40} autoCapitalize="characters" required/><button disabled={busy||!code.trim()} type="submit" className="button secondary">{t('Применить')}<ChevronRight size={16}/></button></form></Panel>
 </section>;
}

export function SupportPage({app}){
 const{t,lang,run,alert,busy}=app;const L=(ru,en)=>lang==='ru'?ru:en;const[body,setBody]=useState(''),[rows,setRows]=useState([]);
 useEffect(()=>{run(async()=>setRows(await api('/support')));},[]);
 return <section className="support-page account-page"><SectionHeading eyebrow={L('МЫ РЯДОМ','HERE FOR YOU')} title={t('Поддержка')} body={L('Поможем разобраться. Просто напиши.','Tell us what’s on your mind.')} art="chat-bubbles"/>
  <Panel><form onSubmit={e=>{e.preventDefault();run(async()=>{await post('/support',{body});setBody('');setRows(await api('/support'));alert(t('Обращение отправлено'));});}}><label className="field"><span>{t('Опиши вопрос')}</span><textarea rows={6} required maxLength={3000} value={body} placeholder={L('Что случилось?','How can we help?')} onChange={e=>setBody(e.target.value)}/></label><span className="input-count">{body.length} / 3000</span><button className="button primary full" disabled={busy||!body.trim()} type="submit">{t('Отправить')}<Send size={18}/></button></form></Panel>
  {rows.length>0&&<h2 className="account-section-title">{L('Твои обращения','Your conversations')}</h2>}{rows.map(row=><article className="ticket" key={row.id}><header><MessageCircle size={17}/><small>#{row.id.slice(0,8)}</small><span>{row.status}</span></header><p>{row.body}</p>{row.reply&&<blockquote><span>VEYRA</span>{row.reply}</blockquote>}</article>)}
 </section>;
}
