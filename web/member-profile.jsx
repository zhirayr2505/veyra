import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ChevronLeft,ChevronRight,Heart,Star,MessageCircle,MapPin,ShieldCheck,Images,Flag,EyeOff,Send,CheckCircle2,LoaderCircle,X} from 'lucide-react';
import {api,post} from './api';
import {Brand,VeyraIcon} from './graphics';
import './member-profile.css';

// A full-screen destination shared by discovery, matches and conversations.
// It deliberately stays mounted above the originating screen, so Back restores
// the feed position or chat draft instead of rebuilding those screens.
export function MemberProfile({entry,app,Photo,onClose}){
 const {profile,onReact,onPrematch,onReport,onHandled,fromChat}=entry;
 const L=(ru,en)=>app.lang==='en'?en:ru;
 const [data,setData]=useState(null),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 const [photoIndex,setPhotoIndex]=useState(0),[sending,setSending]=useState(false);
 const [composer,setComposer]=useState(false),[message,setMessage]=useState('');
 const [reporting,setReporting]=useState(false),[reason,setReason]=useState('fake'),[details,setDetails]=useState('');
 const [confirmHide,setConfirmHide]=useState(false);
 const panel=useRef(null);
 const load=()=>{
  let cancelled=false;
  setError(false);setLoading(true);
  api('/profiles/'+profile.id).then(p=>{if(!cancelled){setData(p);setPhotoIndex(0);}}).catch(()=>{if(!cancelled)setError(true);}).finally(()=>{if(!cancelled)setLoading(false);});
  return ()=>{cancelled=true;};
 };
 useEffect(load,[profile.id]);
 useEffect(()=>{
  const oldOverflow=document.body.style.overflow,previous=document.activeElement;
  document.body.style.overflow='hidden';panel.current?.focus();
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}};
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=oldOverflow;previous?.focus?.();};
 },[]);
 const p=data||profile;
 const photos=p?.photos||[];
 const photoCount=photos.length;
 const mutual=!!data?.match_id;
 const matchId=data?.match_id;
 const goal=({relationship:L('Серьёзные отношения','A relationship'),dating:L('Свидания','Dating'),friends:L('Дружба и общение','Friends & connection'),unsure:L('Пока не знаю','Still exploring')})[p.goal];
 const nextPhoto=delta=>setPhotoIndex(i=>(i+delta+photoCount)%photoCount);
 function chat(){
  if(!matchId)return;
  if(fromChat&&app.tab==='chats'){onClose();return;}
  app.setModal(null);
  app.setTab('chats');
  app.setOpenChatId(matchId);
  onClose();
 }
 async function react(kind){
  if(sending)return;
  if(onReact){onClose();onReact(kind);return;}
  setSending(true);
  try{
   const result=await post('/reactions',{target:String(profile.id),kind,...(composer&&message.trim()?{message:message.trim()}: {})});
   onClose();onHandled?.();
   if(result.matched)app.setModal({type:'match',profile:p,match_id:result.match_id});
  }catch(e){app.alert(L('Не удалось отправить симпатию. Попробуй снова.','Could not send your like. Please retry.'));}
  finally{setSending(false);}
 }
 async function hide(){
  if(sending)return;setSending(true);
  try{await post('/profiles/'+profile.id+'/hide');onClose();onHandled?.();}
  catch{app.alert(L('Не удалось скрыть анкету','Could not hide the profile'));}
  finally{setSending(false);}
 }
 async function report(){
  if(sending)return;setSending(true);
  try{await post('/reports',{target:String(profile.id),reason,details:details.trim()});onClose();onHandled?.();app.alert(L('Жалоба отправлена модератору','Report sent to a moderator'));}
  catch{app.alert(L('Не удалось отправить жалобу','Could not submit the report'));}
  finally{setSending(false);}
 }
 const startPrematch=()=>{if(onPrematch){onClose();onPrematch();}else setComposer(true);};
 return createPortal(<section className="member-profile-screen" role="dialog" aria-modal="true" aria-label={L('Профиль пользователя','Member profile')} ref={panel} tabIndex={-1}>
  <div className="member-profile-page">
   <header className="member-profile-header">
    <button className="member-profile-back" onClick={onClose} aria-label={L('Назад','Back')}><VeyraIcon icon={ArrowLeft} size={22}/><span>{L('Назад','Back')}</span></button>
    <Brand/>
    <span className="member-profile-header-end"/>
   </header>
   <main className="member-profile-content">
    {loading?<div className="member-profile-loading" role="status"><VeyraIcon icon={LoaderCircle} className="spin" size={28}/>{L('Загружаем профиль…','Loading profile…')}</div>
    :error||!data?<div className="member-profile-failed"><h2>{L('Не удалось открыть профиль','Could not open this profile')}</h2><p>{L('Анкета могла стать недоступна или соединение прервалось.','This profile may no longer be available, or the connection was lost.')}</p><button className="button secondary" onClick={load}>{L('Повторить','Retry')}</button></div>
    :<>
     <div className="member-profile-hero">
      <div className="member-profile-photo"><Photo id={photos[photoIndex]} alt={p.name+' — '+(photoIndex+1)}/></div>
      <div className="member-profile-shade"/>
      <div className="member-profile-hero-top"><span><VeyraIcon icon={ShieldCheck} size={15}/>{L('Анкета проверена','Profile reviewed')}</span>{photoCount>0&&<span><VeyraIcon icon={Images} size={15}/>{photoIndex+1} / {photoCount}</span>}</div>
      {photoCount>1&&<div className="member-profile-photo-controls"><button aria-label={L('Предыдущее фото','Previous photo')} onClick={()=>nextPhoto(-1)}><VeyraIcon icon={ChevronLeft} size={25}/></button><button aria-label={L('Следующее фото','Next photo')} onClick={()=>nextPhoto(1)}><VeyraIcon icon={ChevronRight} size={25}/></button></div>}
      <div className="member-profile-identity">
       <h1>{p.name}<span>, {p.age}</span><VeyraIcon icon={ShieldCheck} size={20}/></h1>
       <p><VeyraIcon icon={MapPin} size={15}/>{[p.city,p.country].filter(Boolean).join(', ')}{p.distance_km?' · ~'+p.distance_km+' '+L('км','km'):''}</p>
       {goal&&<span className="member-profile-goal"><VeyraIcon icon={Heart} size={13}/>{goal}</span>}
      </div>
     </div>
     {photoCount>1&&<div className="member-profile-thumbs" aria-label={L('Фотографии','Photos')}>{photos.map((id,i)=><button key={id} className={i===photoIndex?'active':''} aria-label={L('Фото ','Photo ')+(i+1)} aria-pressed={i===photoIndex} onClick={()=>setPhotoIndex(i)}><Photo id={id} alt=""/></button>)}</div>}
     {p.test_profile&&<p className="member-profile-test">{L('Тестовая анкета · вымышленный персонаж','Test profile · fictional character')}</p>}
     {mutual&&<div className="member-profile-mutual"><VeyraIcon icon={Heart} size={19} fill="currentColor"/><div><strong>{L('У вас взаимная симпатия','You matched!')}</strong><span>{L('Вы уже можете общаться в VEYRA','You can chat in VEYRA now')}</span></div><button aria-label={L('Открыть чат','Open chat')} onClick={chat}><VeyraIcon icon={MessageCircle} size={21}/></button></div>}
     {!!p.bio&&<section className="member-profile-section"><h2>{L('Обо мне','About me')}</h2><p className="member-profile-bio">{p.bio}</p></section>}
     {p.interests?.length>0&&<section className="member-profile-section"><h2>{L('Интересы','Interests')}</h2><div className="member-profile-interests">{p.interests.map(item=><span key={item} className={p.shared_interests?.includes(item)?'shared':''}>{p.shared_interests?.includes(item)&&<VeyraIcon icon={Heart} size={12} fill="currentColor"/>}{item}</span>)}</div>{p.shared_interests?.length>0&&<small>{L('Выделены ваши общие интересы','Your shared interests are highlighted')}</small>}</section>}
     <p className="member-profile-disclaimer"><VeyraIcon icon={ShieldCheck} size={14}/>{L('Анкета проверена модератором. Это не подтверждение личности.','This profile was reviewed by a moderator; identity is not verified.')}</p>
     {reporting&&<section className="member-profile-manage"><h2>{L('Пожаловаться','Report')}</h2><label>{L('Причина','Reason')}<select value={reason} onChange={e=>setReason(e.target.value)}>{[['fake',L('Поддельная анкета','Fake profile')],['underage',L('Несовершеннолетний','Underage')],['harassment',L('Оскорбления','Harassment')],['spam',L('Спам','Spam')],['explicit',L('Неприемлемый контент','Inappropriate content')],['other',L('Другое','Other')]].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><textarea value={details} maxLength={2000} onChange={e=>setDetails(e.target.value)} placeholder={L('Подробности (необязательно)','Details (optional)')}/><div className="member-profile-manage-actions"><button onClick={()=>setReporting(false)}>{L('Отмена','Cancel')}</button><button disabled={sending} onClick={report}>{L('Отправить жалобу','Submit report')}</button></div></section>}
     {confirmHide&&<section className="member-profile-manage"><p>{L('Больше не показывать эту анкету в рекомендациях?','Hide this profile from your recommendations?')}</p><div className="member-profile-manage-actions"><button onClick={()=>setConfirmHide(false)}>{L('Отмена','Cancel')}</button><button disabled={sending} onClick={hide}>{L('Скрыть анкету','Hide profile')}</button></div></section>}
     <div className="member-profile-safety"><button onClick={()=>{if(onReport){onClose();onReport();}else{setReporting(true);setConfirmHide(false);}}}><VeyraIcon icon={Flag} size={17}/>{L('Пожаловаться','Report')}</button><button onClick={()=>{setConfirmHide(true);setReporting(false);}}><VeyraIcon icon={EyeOff} size={17}/>{L('Скрыть','Hide')}</button></div>
    </>}
   </main>
   {!loading&&!error&&data&&<footer className="member-profile-footer">
    {mutual?<button className="member-profile-chat" onClick={chat}><VeyraIcon icon={MessageCircle} size={20}/>{L('Перейти в чат','Open chat')}<VeyraIcon icon={ChevronRight} size={18}/></button>
    :<>{composer&&!onPrematch&&<div className="member-profile-compose"><label htmlFor="member-profile-message">{L('Сообщение до мэтча','Message before matching')}</label><textarea id="member-profile-message" rows={2} value={message} maxLength={140} onChange={e=>setMessage(e.target.value)} placeholder={L('Напиши пару слов…','Say hello…')}/><small>{message.length}/140</small></div>}
    <div className="member-profile-reactions"><button className="member-profile-like" disabled={sending||(composer&&!message.trim())} onClick={()=>react('like')}>{composer?<VeyraIcon icon={Send} size={19}/>:<VeyraIcon icon={Heart} size={20}/>} {composer?L('Отправить','Send'):L('Нравится','Like')}</button>{!composer&&<button className="member-profile-super" disabled={sending} onClick={()=>react('super')}><VeyraIcon icon={Star} size={19}/>Super Like</button>}</div>
    {!composer&&<button className="member-profile-prematch" disabled={sending} onClick={startPrematch}><VeyraIcon icon={MessageCircle} size={17}/>{L('Сказать привет до мэтча','Say hello before matching')}</button>}</>}
   </footer>}
  </div>
 </section>,document.body);
}
