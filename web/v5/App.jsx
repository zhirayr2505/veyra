import React,{useEffect,useState,useCallback} from 'react';
import {get,post,setBearer,clearPhotoCache} from './api.js';
import {Logo,Icon,DetailIcon,Header,Button,Sheet,Empty,Spinner,InlineAlert} from './UI.jsx';
import {Welcome} from './Welcome.jsx';
import {Registration} from './Registration.jsx';
import {LegalScreen} from './Legal.jsx';
import {Moderation} from './Moderation.jsx';
import {CompletionScreen} from './CompletionScene.jsx';
import {DeletionPending} from './AccountDeletion.jsx';
import {DiscoveryHub} from './DiscoveryHub.jsx';
import {FeedFilters} from './FeedFilters.jsx';
import {Member} from './Member.jsx';
import {MatchCelebration} from './MatchCelebration.jsx';
import {Likes} from './Likes.jsx';
import {Chats,Conversation} from './Chats.jsx';
import {GiftPicker,GiftCollection,OwnProfile,Settings,Ranking,CourtshipInbox,openInvoice} from './Extras.jsx';
import {Premium} from './Premium.jsx';
import {Admin} from './Admin.jsx';
import {ProfileEditor} from './ProfileEditor.jsx';
import {preloadBrandAssets} from './preload.js';
import {enableTelegramFullscreen} from './telegramViewport.js';
import {PerformanceMonitor} from './PerformanceMonitor.jsx';
import {VeysWallet,Diamond} from './Veys.jsx';
import '../../veyra-assets/tokens/tokens.css';
import '../../veyra-assets/styles/components.css';
import './V2.css';
import './BrandConsistency.css';
import './ApprovedPack.css';
import './MobileQA.css';
import './Registration2026.css'; // Approved registration baseline
import './OnboardingV9.css'; // Final eight-step visual overrides
import './DatingStage02.css'; // Three approved dating screens; registration remains unchanged
import './VeyraDesignPolish.css'; // Match, floating feed actions, responsive profile refinement
import './VeyraPolishFinal.css'; // Static feed and responsive member morph — final overrides
import './MemberStickyPortal.css'; // Telegram Android viewport header rendered outside scrolling app
import './MemberMotionV2.css'; // Single authoritative profile layout and composited motion
import './MemberReferencePolish.css'; // Approved exact-look profile surfaces and portrait-derived header
import './MemberFinish.css'; // Opaque sheet, contextual photo backdrop, elastic feel and premium content
import './MemberMotion5.css'; // Motion 5 brand, flags, attached avatar border, actions, accessible icon tabs
import './MemberMotion6.css'; // Direct circle + spring/haptic, safe text and adaptive wordmark
import './FeedPremium2026.css'; // Approved feed reference, liquid tabs, interest drawer & CTA geometry
import './ForYouApproved2026.css'; // Approved light lavender For You design
import './TelegramSwipeGuard.css'; // Native overscroll fallback without blocking touch scroll
import './MemberPolish7.css'; // Profile visual-only polish: preserves existing scroll motion
import './tokens.css'; // Unified brand palette, seven chip tones and shared component metrics
const tg=window.Telegram?.WebApp;
const nav=[['search','search','поиск'],['encounters','encounters','знакомства'],['likes','heart','симпатии'],['chats','chat','чаты'],['profile','user','профиль']];
export function App(){
 const [initializing,setInitializing]=useState(true),[assetPercent,setAssetPercent]=useState(0),[startRegistration,setStartRegistration]=useState(false),[me,setMe]=useState(null),[error,setError]=useState(''),[deleted,setDeleted]=useState(false);
 const [galleryOpen,setGalleryOpen]=useState(false);
 const [profileViews,setProfileViews]=useState({});
 const rememberProfile=useCallback((id,value)=>setProfileViews(previous=>{
  const key=String(id),was=previous[key];
  if(was?.tab===value.tab&&was?.index===value.index&&was?.mode===value.mode)return previous;
  return {...previous,[key]:value};
 }),[]);
 const [tab,setTab]=useState('encounters'),[tabDirection,setTabDirection]=useState('left'),[visited,setVisited]=useState(new Set(['encounters'])),[overlay,setOverlay]=useState(null),[member,setMember]=useState(null),[conversation,setConversation]=useState(null),[match,setMatch]=useState(null),[refreshTick,setRefreshTick]=useState(0),[feedTick,setFeedTick]=useState(0);
 const [returnChat,setReturnChat]=useState(null);
 const [feedFilters,setFeedFilters]=useState({mode:'discover',only_online:false,common_interests:false});
 const [adminMode,setAdminMode]=useState(location.pathname.startsWith('/admin'));
 const admin=location.pathname.startsWith('/admin');
 const refresh=useCallback(async()=>{const m=await get('/me');setMe(m);return m},[]);
 const exitOverlay=()=>setOverlay(null);
 const closeWallet=()=>setOverlay(current=>current?.type==='veys'?(current.returnTo||null):null);
 const onWalletChanged=useCallback(balance=>setMe(current=>current?{...current,veys_balance:balance}:current),[]);
 useEffect(()=>{let alive=true;const releaseFullscreen=enableTelegramFullscreen(tg);(async()=>{try{
  tg?.ready?.();tg?.expand?.();tg?.setHeaderColor?.('#F9F7FF');tg?.setBackgroundColor?.('#F9F7FF');
  const brandReady=preloadBrandAssets(percent=>{if(alive)setAssetPercent(percent)});
  if(!tg?.initData)throw Error('Открой VEYRA через официальный Telegram-бот @VeyraAppBot');
  const auth=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:tg.initData,scope:admin?'admin':'user'})});
  const j=await auth.json();if(!auth.ok)throw Error(j.error||'Не удалось войти через Telegram');
  setBearer(j.token);const m=await get('/me');await brandReady;if(alive){setMe(m);setError('')}
 }catch(e){if(alive)setError(e.message)}finally{if(alive)setInitializing(false)}})();return()=>{alive=false;releaseFullscreen()}},[]);
 useEffect(()=>{const back=tg?.BackButton;if(!back?.onClick)return;
  const active=!!(galleryOpen||match||overlay||member||conversation);
  if(!active){back.hide?.();return;}
  const goBack=()=>{if(galleryOpen){document.dispatchEvent(new Event('veyra:close-profile-gallery'));return;}if(match){setMatch(null);return;}if(overlay){setOverlay(current=>current?.type==='veys'?(current.returnTo||null):null);return;}if(member){setMember(null);if(returnChat){setConversation(returnChat);setReturnChat(null)}return;}if(conversation)setConversation(null)};
  back.show?.();back.onClick(goBack);return()=>{back.offClick?.(goBack);back.hide?.()};
 },[galleryOpen,match,overlay,member,conversation,returnChat]);
 const logout=()=>{setBearer('');clearPhotoCache();setMe(null);setError('');setDeleted(true);try{Object.keys(localStorage).filter(k=>k.startsWith('veyra.registration.')).forEach(k=>localStorage.removeItem(k))}catch{}};
 const navigate=next=>{setError('');setMember(null);setConversation(null);setReturnChat(null);setOverlay(null);setTabDirection(nav.findIndex(x=>x[0]===next)>=nav.findIndex(x=>x[0]===tab)?'left':'right');setTab(next);setVisited(s=>new Set([...s,next]));window.scrollTo(0,0)};
 const openMember=(id,matchId=null,initialData=null)=>{if(!id)return;setError('');setReturnChat(conversation);setConversation(null);setOverlay(null);setMember({id,matchId,initialData});window.scrollTo(0,0)};
 const openChat=async(id,person)=>{if(!id){setError('Чат пока недоступен');return;}setError('');setReturnChat(null);setMember(null);setOverlay(null);setTab('chats');setVisited(s=>new Set([...s,'chats']));if(person){setConversation({id,partner:person});return;}try{const all=await get('/matches');const m=all.find(x=>x.id===id);if(!m?.profile)throw Error('Переписка больше недоступна');setConversation({id,partner:m.profile})}catch(e){setError(e.message)}};
 const gift=person=>{if(person?.id)setOverlay({type:'gift',target:person})};
 const matchFound=(matchId,profile)=>{setMatch({id:matchId,profile});setRefreshTick(x=>x+1)};
 const courtship=async()=>{if(!member)return;try{const r=await post('/courtships/request',{target:String(member.id)});setOverlay({type:'courtship-sent',status:r.status})}catch(e){setError(e.message)}};
 const status=me?.profile?.moderation;
 const ready=!!me?.profile&&status==='approved';
 if(['/legal','/terms','/privacy'].includes(location.pathname))return <LegalScreen initialTab={location.pathname==='/privacy'?'privacy':'terms'}/>;
 if(deleted)return <CompletionScreen kind="deleted"/>;
 if(initializing)return <div className="splash" aria-label="VEYRA загружается"><Logo width={206}/><div className="splash-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={assetPercent}><span style={{width:assetPercent+"%"}}/></div><p className="splash-copy">Подготавливаем VEYRA · {assetPercent}%</p></div>;
 if(error&&!me)return <main className="access"><Logo width={188}/><h2>встретимся в Telegram</h2><p>{error}</p><Button onClick={()=>window.open('https://t.me/VeyraAppBot','_blank')}>открыть @VeyraAppBot</Button><button className="text-link" onClick={()=>location.reload()}>повторить</button></main>;
 if(adminMode)return <Admin onExit={()=>admin?location.assign('/'):setAdminMode(false)}/>;
 if(me?.user?.status==='deleting')return <div className="veyra-v2 v2-onboarding"><DeletionPending dueAt={me.user.deletion_due_at} onRestore={async()=>{await post('/account/restore',{});await refresh();setTab('profile');setOverlay(null)}}/></div>;
 if(!ready&&(!me?.profile||status==='draft'||status==='rejected')){
  return <div className="veyra-v2 v2-onboarding"><Registration me={me} refresh={refresh}/></div>;
 }
 if(status==='pending')return <div className="veyra-v2 v2-onboarding"><Moderation profile={me.profile} photos={me.photos} refresh={refresh}/></div>;
 if(!ready)return <main className="access"><Logo/><Empty title="Анкета недоступна" body="Проверить статус можно через официальный бот."/><Button onClick={refresh}>проверить ещё раз</Button></main>;
 return <div className="app-shell veyra-v2">
 <div className="view-frame" hidden={!!conversation||!!member}>
 {visited.has('search')&&<div className="view-tab" data-enter={tabDirection} hidden={tab!=='search'}><DiscoveryHub directory onWallet={()=>setOverlay({type:'veys'})} veysBalance={me.veys_balance||0} filters={feedFilters} profile={me.profile} onProfile={openMember} onMatch={matchFound} refreshTick={feedTick} onPremium={()=>setOverlay({type:'premium'})} onFilters={()=>setOverlay({type:'filters'})}/></div>}
 <div className="view-tab" data-enter={tabDirection} hidden={tab!=='encounters'}>
  <section className="v2-encounters-view" aria-label="Знакомства VEYRA">
   <DiscoveryHub filters={feedFilters} freezeFeed={tab==='encounters'&&!member&&!overlay&&!conversation} profile={me.profile} onProfile={openMember} onMatch={matchFound}
    refreshTick={feedTick} onWallet={()=>setOverlay({type:'veys'})} veysBalance={me.veys_balance||0}
    onPremium={()=>setOverlay({type:'premium'})} onFilters={()=>setOverlay({type:'filters'})}/>
  </section>
 </div>
 {visited.has('likes')&&<div className="view-tab" data-enter={tabDirection} hidden={tab!=='likes'}><Likes active={tab==='likes'&&!conversation&&!member} onProfile={openMember} onChat={openChat} onMatch={matchFound} onPremium={()=>setOverlay({type:'premium'})} refreshTick={refreshTick}/></div>}
 {visited.has('chats')&&<div className="view-tab" data-enter={tabDirection} hidden={tab!=='chats'}><Chats active={tab==='chats'&&!conversation&&!member} onOpen={openChat} onProfile={openMember} refreshTick={refreshTick}/></div>}
 {tab==='profile'&&!member&&!conversation&&!overlay&&<div className="view-tab vx-own-profile-host">
   <Member ownMe={me} viewer={me.profile} viewState={profileViews[String(me.user.id)]} onViewStateChange={value=>rememberProfile(me.user.id,value)} onGalleryStateChange={setGalleryOpen} onBack={()=>navigate('encounters')}
    onEdit={()=>setOverlay({type:'edit'})}
    onSettings={()=>setOverlay({type:'settings'})}
    onCollection={()=>setOverlay({type:'collection'})}
    onPremium={()=>setOverlay({type:'premium'})}
    onRanking={()=>setOverlay({type:'ranking'})}
    onCourtship={()=>setOverlay({type:'courtship-inbox'})}
    onWallet={()=>setOverlay({type:'veys'})}
    onAdmin={()=>{const url='https://t.me/VeyraAdminBot';if(tg?.openTelegramLink)tg.openTelegramLink(url);else window.open(url,'_blank','noopener,noreferrer')}}
   />
  </div>}
 </div>
 {member&&<div className="subscreen"><Member key={member.id} id={member.id} viewState={profileViews[String(member.id)]} onViewStateChange={value=>rememberProfile(member.id,value)} onGalleryStateChange={setGalleryOpen} viewer={me.profile} initialData={member.initialData} initialMatch={member.matchId} onBack={()=>{setMember(null);if(returnChat){setConversation(returnChat);setReturnChat(null)}}} onChat={openChat} onMatch={matchFound} onGift={gift} onPremium={()=>setOverlay({type:'premium'})} onWallet={()=>setOverlay({type:'veys'})} onPaid={refresh}/></div>}
 {conversation&&<div className="subscreen"><Conversation matchId={conversation.id} partner={conversation.partner} onBack={()=>setConversation(null)} onProfile={openMember} onGift={gift} myId={me.user.id}/></div>}
 {!conversation&&!member&&!overlay&&<nav className="bottom-nav" aria-label="Навигация VEYRA">{nav.map(([k,icon,label])=><button key={k} aria-current={tab===k?'page':undefined} className={tab===k?'active':''} onClick={()=>navigate(k)}><span className="nav-icon-plate"><Icon name={icon+(tab===k?'_filled':'')} tone={tab===k?'pink':'dark'} size={24}/></span><span className="nav-label">{label}</span></button>)}</nav>}
 {match&&<MatchCelebration me={me} match={match}
   onWrite={()=>{const m=match;setMatch(null);openChat(m.id,m.profile)}}
   onViewProfile={()=>{const m=match;setMatch(null);openMember(m.profile.id,m.id)}}
   onContinue={()=>setMatch(null)}/>}
 {overlay?.type==='veys'&&<VeysWallet onClose={closeWallet} onChanged={onWalletChanged} onPurchased={refresh}/>}
 {overlay?.type==='premium'&&<Premium me={me} onClose={exitOverlay} refresh={refresh}/>}
 {overlay?.type==='gift'&&<GiftPicker target={overlay.target} initialNote={overlay.note||''} initialPendingIds={overlay.pendingIds||[]} onClose={exitOverlay} onSent={()=>{refresh();exitOverlay()}} onWallet={(note,pendingIds)=>setOverlay({type:'veys',returnTo:{type:'gift',target:overlay.target,note,pendingIds}})}/>}
 {overlay?.type==='collection'&&<Sheet title="коллекция подарков" onClose={exitOverlay}><GiftCollection/></Sheet>}
 {overlay?.type==='filters'&&<FeedFilters profile={me.profile} filters={feedFilters} onClose={exitOverlay} onSave={async next=>{await refresh();setFeedFilters(next);setFeedTick(x=>x+1);setRefreshTick(x=>x+1)}}/>}
 {overlay?.type==='edit'&&<ProfileEditor me={me} refresh={refresh} onClose={exitOverlay}/>}
 {overlay?.type==='settings'&&<Settings me={me} onClose={exitOverlay} refresh={refresh} onDeleted={async()=>{setOverlay(null);await refresh()}}/>}
 {overlay?.type==='ranking'&&<Ranking onClose={exitOverlay}/>}
 {overlay?.type==='courtship-inbox'&&<CourtshipInbox onClose={exitOverlay}/>}
 {overlay?.type==='courtship-sent'&&<Sheet title="ухаживание" onClose={exitOverlay}><p className="tip">Предложение отправлено. Публичный статус и оплата появятся только после согласия получателя.</p><Button className="full" onClick={exitOverlay}>понятно</Button></Sheet>}
 <InlineAlert>{error}</InlineAlert>
 <PerformanceMonitor/>
 </div>;
}
