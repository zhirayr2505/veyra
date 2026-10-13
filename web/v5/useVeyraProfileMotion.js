import {useCallback,useLayoutEffect,useRef} from 'react';
import {clamp,profileFrame,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT} from './profileMotionMath.js';
import {profileProbeEnabled,recordProfileCalibration,recordProfileFrame} from './profilePerfProbe.js';
import {createProfileScrollAnimations} from './profileScrollTimeline.js';
import {elasticPullDistance,elasticPhotoScale} from './profileElasticMath.js';

// Additive CSS translate/scale properties never replace WAAPI transform tracks.
// The elastic interaction exists ONLY for a new downward drag at scrollTop=0.
function writeElastic(el,pull,width,settling=false){
 if(!el)return;
 el.classList.toggle('vx-elastic-release',settling);
 const scale=elasticPhotoScale(pull);
 el.style.setProperty('--vx-elastic-pull',pull.toFixed(2)+'px');
 el.style.setProperty('--vx-elastic-scale',scale.toFixed(5));
 el.style.setProperty('--vx-elastic-x',(-width*(scale-1)/2).toFixed(2)+'px');
}

// All moving elements are compositor-friendly layers with fixed geometry.
// Layout is measured ONCE on mount/resize, never inside a scroll frame.
// Native WebView owns touch momentum; we read scrollTop once per frame.
export function useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready}){
 const state=useRef({
  frame:0,timer:0,settleTimer:0,observed:null,
  distance:1,width:1,height:1,lastProgress:-1,
  touching:false,released:false,snapping:false,axis:null,
  startX:0,startY:0,lastY:0,lastAt:0,lastScrollAt:0,
  releaseAt:0,velocity:0,releaseVelocity:0,
  refs:null,resizeObserver:null,mutationObserver:null,nativeAnimation:null,engine:'JS fallback',radiusPhase:null,elastic:0,startScrollY:0,
 });
 const stop=useCallback(()=>{
  const s=state.current;
  clearTimeout(s.timer);clearTimeout(s.settleTimer);
  s.snapping=false;s.released=false;
 },[]);
 const paint=useCallback(()=>{
  const s=state.current;
  if(s.frame)return;
  s.frame=requestAnimationFrame(()=>{
   s.frame=0;
   const scroller=scrollRef.current,motion=motionRef.current,parts=s.refs;
   if(!scroller||!motion||!parts?.hero)return;
   const sampled=profileProbeEnabled();
   const frameStart=sampled?performance.now():0;
   const now=performance.now();
   const scrollY=scroller.scrollTop;
   const p=clamp(scrollY/s.distance);
   if(s.lastAt>0&&!s.snapping&&now-s.lastAt>4&&now-s.lastAt<120){
    const instant=(scrollY-s.lastY)/(now-s.lastAt);
    s.velocity=s.velocity*.55+instant*.45;
   }
   s.lastY=scrollY;s.lastAt=now;
   if(Math.abs(p-s.lastProgress)<.00015)return;
   const previous=s.lastProgress;
   s.lastProgress=p;
   // Haptic is edge-triggered once for a deliberate finger-driven circle.
   // Never pulse on reverse scroll or when opening an already compact profile.
   if(p<.22)s.circleHapticFired=false;
   if(s.touching&&previous>=0&&previous<PROFILE_CIRCLE_AT&&p>=PROFILE_CIRCLE_AT&&!s.circleHapticFired){
    s.circleHapticFired=true;
    try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch{}
   }
   // In Chromium, the scroll position drives visual transforms without JS.
   // JS now only samples momentum/snap, reports opt-in timings, and changes
   // the shape clip at two phase boundaries (never per frame).
   if(s.nativeAnimation){
    const shape=p<PROFILE_CIRCLE_AT?'cover':'circle';
    if(shape!==s.radiusPhase){
     s.radiusPhase=shape;
     parts.hero.style.borderRadius=shape==='cover'?'0px':'50%';
    }
    const phase=p<=.002?'expanded':p>=.998?'compact':'transition';
    if(motion.dataset.state!==phase)motion.dataset.state=phase;
    const motionStage=p<PROFILE_CIRCLE_AT?'sheet':p<PROFILE_CENTER_AT?'center':'avatar';
    if(motion.dataset.motionPhase!==motionStage)motion.dataset.motionPhase=motionStage;
    const sheetOverlap=p<PROFILE_CIRCLE_AT?'true':'false';
    if(motion.dataset.sheetOverlap!==sheetOverlap)motion.dataset.sheetOverlap=sheetOverlap;
    if(sampled)recordProfileFrame(performance.now()-frameStart,p,scrollY,s.distance,motionStage);
    return;
   }
   const f=profileFrame(p,s.width,s.height,s.compactHeight);
   const translate=(x,y)=>'translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0)';
   const scaleX=f.width/s.width,scaleY=f.height/s.height;
   const scale=' scale('+scaleX.toFixed(6)+','+scaleY.toFixed(6)+')';
   parts.hero.style.transform=translate(f.x,f.y)+scale;
   // Legacy fallback updates shape only at two boundaries, rather than
   // invalidating a large clipped image on each individual scroll frame.
   const shape=p<PROFILE_CIRCLE_AT?'cover':'circle';
   if(shape!==s.radiusPhase){
    s.radiusPhase=shape;
    parts.hero.style.borderRadius=shape==='cover'?'0px':'50%';
   }
   // Compensate for portrait-to-square squash on the image itself.
   if(!parts.image?.isConnected){
    parts.image=parts.hero.querySelector('.photo-box img');
   }
   if(parts.image)parts.image.style.transform='scaleY('+(scaleX/scaleY).toFixed(6)+')';
   if(parts.panel){parts.panel.style.transform=translate(0,f.sheetY-(s.height-30));parts.panel.style.clipPath='inset(0px 0px '+f.panelClipBottom.toFixed(3)+'px 0px)';}
   if(parts.lip)parts.lip.style.transform=translate(0,f.sheetY-(s.height-30));
   if(parts.identity){
    parts.identity.style.transform=translate(f.nameX,f.nameY-(s.height+9));
    parts.identity.style.opacity=f.nameOpacity.toFixed(3);
   }
   if(parts.actions)parts.actions.style.transform=translate(0,f.actionY-(s.height+123));
   if(parts.more)parts.more.style.transform=translate(0,f.moreY-(s.height+8));
   if(parts.goal)parts.goal.style.transform=translate(f.goalX,f.goalY);
   if(parts.bars)parts.bars.style.opacity=f.photoExtrasOpacity.toFixed(3);
   if(parts.nav)parts.nav.style.opacity=f.photoExtrasOpacity.toFixed(3);
   if(parts.online)parts.online.style.opacity=f.compactOnlineOpacity.toFixed(3);
   if(parts.shade)parts.shade.style.opacity=f.shadeOpacity.toFixed(3);
   // Only the JS fallback needs these extra visual layers; ScrollTimeline
   // animates them natively in Chromium without extra hot-path writes.
   if(parts.blur)parts.blur.style.opacity=(f.progress<=.24?0:f.progress>=.86?1:(()=>{
    const t=(f.progress-.24)/.62;return t*t*(3-2*t);
   })()).toFixed(3);
   if(parts.ring)parts.ring.style.opacity=(f.progress<=.82?0:f.progress>=.99?1:(()=>{
    const t=(f.progress-.82)/.17;return t*t*(3-2*t);
   })()).toFixed(3);
   if(parts.onlineDot)parts.onlineDot.style.opacity=(f.progress<=.85?0:f.progress>=1?1:(()=>{
    const t=(f.progress-.85)/.15;return t*t*(3-2*t);
   })()).toFixed(3);
   if(parts.rim)parts.rim.style.opacity=(p<=PROFILE_CIRCLE_AT-.004?0:p>=PROFILE_CIRCLE_AT+.026?1:(()=>{
     const t=(p-(PROFILE_CIRCLE_AT-.004))/.03;return t*t*(3-2*t);
    })()).toFixed(3);
    if(parts.grabber){
    parts.grabber.style.transform=translate(0,f.sheetY-(s.height-30));
    parts.grabber.style.opacity=f.progress>=.24?'0':f.progress<=.03?'1':
     (1-((f.progress-.03)/.21)**2*(3-2*(f.progress-.03)/.21)).toFixed(3);
   }
   const phase=p<=.002?'expanded':p>=.998?'compact':'transition';
   if(motion.dataset.state!==phase)motion.dataset.state=phase;
   const motionStage=p<PROFILE_CIRCLE_AT?'sheet':p<PROFILE_CENTER_AT?'center':'avatar';
   if(motion.dataset.motionPhase!==motionStage)motion.dataset.motionPhase=motionStage;
    const sheetOverlap=p<PROFILE_CIRCLE_AT?'true':'false';
    if(motion.dataset.sheetOverlap!==sheetOverlap)motion.dataset.sheetOverlap=sheetOverlap;
   if(sampled)recordProfileFrame(performance.now()-frameStart,p,scrollY,s.distance,motionStage);
  });
 },[scrollRef,motionRef]);
 const snap=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(!el||s.touching||!s.released||s.snapping)return;
  const y=el.scrollTop,d=s.distance;
  if(y<1||y>=d-1){s.released=false;return}
  // Do not fight native momentum: scrollend, or >=110ms without movement.
  if(performance.now()-s.lastScrollAt<105&&performance.now()-s.releaseAt<680){
   s.timer=setTimeout(snap,68);return;
  }
  s.released=false;
  const projected=y+Math.max(-1.4,Math.min(1.4,s.releaseVelocity))*83;
  const target=projected>d*.5?d:0;
  s.snapping=true;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   el.scrollTop=target;s.snapping=false;paint();return;
  }
  // WebView-native smooth scroll, not a JS loop writing scrollTop.
  el.scrollTo({top:target,behavior:'smooth'});
  s.settleTimer=setTimeout(()=>{s.snapping=false;paint()},470);
 },[scrollRef,paint]);
 const queueSnap=useCallback(()=>{
  const s=state.current;clearTimeout(s.timer);
  if(s.released&&!s.touching&&!s.snapping)s.timer=setTimeout(snap,110);
 },[snap]);
 const onScroll=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(s.elastic>0&&el?.scrollTop>1){
   s.elastic=0;writeElastic(el,0,s.width,true);
  }
  s.lastScrollAt=performance.now();paint();
 },[paint,scrollRef]);
 const onTouchStart=useCallback(e=>{
  const s=state.current,wasSnapping=s.snapping;stop();
  s.touching=true;s.velocity=0;s.lastAt=0;s.axis=null;
  s.elastic=0;s.startScrollY=scrollRef.current?.scrollTop??0;
  writeElastic(scrollRef.current,0,s.width,false);
  s.startX=e.touches?.[0]?.clientX??0;
  s.startY=e.touches?.[0]?.clientY??0;
  // Stops any native finishing scroll when a fresh finger takes over.
  const el=scrollRef.current;
  if(el&&wasSnapping)el.scrollTo({top:el.scrollTop,behavior:'instant'});
 },[stop,scrollRef]);
 const onTouchMove=useCallback(e=>{
  const s=state.current,el=scrollRef.current;
  if(!e.touches?.length)return;
  const dx=e.touches[0].clientX-s.startX;
  const dy=e.touches[0].clientY-s.startY;
  if(!s.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9)
   s.axis=Math.abs(dx)>Math.abs(dy)*1.13?'x':'y';
  if(!el)return;
  const canPull=s.axis==='y'&&s.startScrollY<=1&&el.scrollTop<=1&&dy>0;
  const pull=canPull?elasticPullDistance(dy):0;
  if(Math.abs(pull-s.elastic)>.08){
   s.elastic=pull;
   writeElastic(el,pull,s.width,false);
  }
 },[scrollRef]);
 const onTouchEnd=useCallback(()=>{
  const s=state.current;
  s.touching=false;
  if(s.elastic>0){
   s.elastic=0;
   writeElastic(scrollRef.current,0,s.width,true);
   s.released=false;
   return;
  }
  if(s.axis==='x'){s.released=false;return}
  s.released=true;s.releaseVelocity=s.velocity;s.releaseAt=performance.now();
  queueSnap();
 },[queueSnap,scrollRef]);
 const onWheel=useCallback(()=>{
  const s=state.current;s.released=true;
  s.releaseVelocity=s.velocity;s.releaseAt=performance.now();queueSnap();
 },[queueSnap]);
 const calibrate=useCallback(()=>{
  const s=state.current,el=scrollRef.current,motion=motionRef.current,stage=stageRef.current;
  if(!el||!motion||!stage)return;
  const hero=motion.querySelector('.vx-profile-hero-photo');
  if(!hero)return;
  s.width=Math.max(1,hero.offsetWidth);
  s.height=Math.max(1,hero.offsetHeight);
  s.compactHeight=parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||292;
  s.distance=Math.max(1,stage.offsetHeight-s.compactHeight);
  if(s.elastic>0)writeElastic(el,s.elastic,s.width,false);
  s.nativeAnimation?.cancel();s.nativeAnimation=null;s.radiusPhase=null;
  // Previous JS fallback transforms must not override WAAPI motion.
  if(s.refs)for(const part of Object.values(s.refs)){
   if(part?.style){part.style.removeProperty('transform');part.style.removeProperty('opacity');part.style.removeProperty('clip-path')}
  }
  s.refs={
   hero,image:hero.querySelector('.photo-box img'),
   panel:motion.querySelector('.vx-profile-card-backdrop'),
   lip:motion.querySelector('.vx-profile-sheet-lip'),
   backdrop:motion.querySelector('.vx-profile-compact-backdrop'),
   identity:motion.querySelector('.vx-profile-identity'),
   actions:motion.querySelector('.vx-profile-primary-actions'),
   more:motion.querySelector('.vx-profile-card-more'),
   goal:motion.querySelector('.vx-profile-goal'),
   bars:motion.querySelector('.vx-profile-photo-bars'),
   nav:motion.querySelector('.vx-profile-photo-nav'),
   online:motion.querySelector('.vx-profile-online'),
   shade:motion.querySelector('.vx-profile-photo-shade'),
   blur:motion.querySelector('.vx-profile-blurred-header'),
   ring:motion.querySelector('.vx-profile-avatar-ring'),
   rim:motion.querySelector('.vx-profile-photo-morph-rim'),
   onlineDot:motion.querySelector('.vx-profile-avatar-online-dot'),
   grabber:motion.querySelector('.vx-profile-sheet-grabber'),
  };
  s.nativeAnimation=createProfileScrollAnimations(el,s.refs,{
   width:s.width,height:s.height,distance:s.distance,compactHeight:s.compactHeight
  });
  s.engine=s.nativeAnimation?'WAAPI ScrollTimeline':'JS fallback';
  recordProfileCalibration(s.width,s.height,s.distance,s.engine);
  s.lastProgress=-1;paint();
 },[scrollRef,motionRef,stageRef,paint]);
 useLayoutEffect(()=>{
  if(!ready)return;
  const s=state.current,el=scrollRef.current;
  calibrate();
  const resize=()=>calibrate();
  s.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  if(stageRef.current)s.resizeObserver?.observe(stageRef.current);
  if(el)s.resizeObserver?.observe(el);
  const hero=s.refs?.hero;
  s.mutationObserver=hero&&typeof MutationObserver!=='undefined'?new MutationObserver(()=>{
   if(s.refs){calibrate()}
  }):null;
  s.mutationObserver?.observe(hero,{childList:true,subtree:true});
  const onScrollEnd=()=>{
   if(s.snapping){s.snapping=false;s.released=false;clearTimeout(s.settleTimer)}
   else if(s.released&&!s.touching){clearTimeout(s.timer);snap()}
  };
  el?.addEventListener('scroll',onScroll,{passive:true});
  el?.addEventListener('touchmove',onTouchMove,{passive:true});
  el?.addEventListener('touchcancel',onTouchEnd,{passive:true});
  el?.addEventListener('scrollend',onScrollEnd,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.visualViewport?.addEventListener('resize',resize,{passive:true});
  return()=>{
   stop();cancelAnimationFrame(s.frame);s.frame=0;
   s.elastic=0;writeElastic(el,0,s.width,false);
   s.nativeAnimation?.cancel();s.nativeAnimation=null;
   s.resizeObserver?.disconnect();s.mutationObserver?.disconnect();
   el?.removeEventListener('scroll',onScroll);
   el?.removeEventListener('touchmove',onTouchMove);
   el?.removeEventListener('touchcancel',onTouchEnd);
   el?.removeEventListener('scrollend',onScrollEnd);
   window.removeEventListener('resize',resize);
   window.visualViewport?.removeEventListener('resize',resize);
  };
 },[ready,calibrate,paint,scrollRef,stageRef,snap,stop,onScroll,onTouchMove,onTouchEnd]);
 return {onTouchStart,onTouchEnd,onWheel,calibrate};
}
