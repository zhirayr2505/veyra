import {useCallback,useLayoutEffect,useRef} from 'react';
import {clamp,profileFrame,profileCircleGeometry,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT} from './profileMotionMath.js';
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

const MORPH_MS=180,MORPH_EASE='cubic-bezier(.2,.8,.2,1)';
function runMorph(s,hero,shape,instant){
 if(!s.morph){
  s.morph=hero.animate([{clipPath:s.clipCover},{clipPath:s.clipCircle}],{duration:MORPH_MS,easing:MORPH_EASE,fill:'both'});
  s.morph.pause();s.morph.currentTime=shape==='circle'?MORPH_MS:0;
 }
 if(instant){s.morph.pause();s.morph.currentTime=shape==='circle'?MORPH_MS:0;return}
 s.morph.playbackRate=shape==='circle'?1:-1;
 s.morph.play();
}
function writeBottomElastic(el,pull,settling=false){
 if(!el)return;
 el.classList.toggle('vx-bottom-elastic-release',settling);
 el.style.setProperty('--vx-elastic-bottom',(-pull).toFixed(2)+'px');
}
// All moving elements are compositor-friendly layers with fixed geometry.
// Layout is measured ONCE on mount/resize, never inside a scroll frame.
// Native WebView owns touch momentum; we read scrollTop once per frame.
export function useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready}){
 const state=useRef({
  frame:0,timer:0,snapRaf:0,settleRaf:0,settleElement:null,prevScrollBehavior:null,observed:null,
  distance:1,width:1,height:1,lastProgress:-1,
  touching:false,released:false,snapping:false,axis:null,
  startX:0,startY:0,lastY:0,lastAt:0,lastScrollAt:0,
  releaseAt:0,velocity:0,releaseVelocity:0,
  refs:null,resizeObserver:null,nativeAnimation:null,engine:'JS fallback',radiusPhase:null,morph:null,clipCover:'inset(0px 0px 0px 0px round 0px)',clipCircle:null,elastic:0,bottomElastic:0,startScrollY:0,startAtBottom:false,
 });
 const stop=useCallback(()=>{
  const s=state.current;
  clearTimeout(s.timer);cancelAnimationFrame(s.snapRaf);cancelAnimationFrame(s.settleRaf);
  if(s.settleElement&&s.prevScrollBehavior!==null)s.settleElement.style.scrollBehavior=s.prevScrollBehavior;
  s.settleElement=null;s.prevScrollBehavior=null;s.snapping=false;s.released=false;
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
   if((s.touching||s.released)&&previous>=0&&previous<PROFILE_CIRCLE_AT&&p>=PROFILE_CIRCLE_AT&&!s.circleHapticFired){
    s.circleHapticFired=true;
    try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch{}
   }
   // In Chromium, the scroll position drives visual transforms without JS.
   // JS now only samples momentum/snap, reports opt-in timings, and changes
   // the shape clip at two phase boundaries (never per frame).
   const circleNow=s.radiusPhase==='circle'?p>=PROFILE_CIRCLE_AT-.02:p>=PROFILE_CIRCLE_AT;
   const shape=circleNow?'circle':'cover';
   if(shape!==s.radiusPhase){
    const first=s.radiusPhase===null;
    s.radiusPhase=shape;
    motion.dataset.photoShape=shape;
    runMorph(s,parts.hero,shape,first);
   }
   if(s.nativeAnimation){
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
   parts.hero.style.transform=translate(f.heroX,f.heroY)+' scale('+f.heroScale.toFixed(6)+')';
   if(parts.panel)parts.panel.style.transform=translate(0,f.sheetY-(s.height-30));
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
   if(parts.backdropPhoto){const t=clamp((p-.30)/.55);parts.backdropPhoto.style.opacity=(t*t*(3-2*t)).toFixed(3)}


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
 const easeOutCubic=t=>1-Math.pow(1-t,3);
 const settleTo=useCallback((el,target)=>{
  const s=state.current;
  cancelAnimationFrame(s.settleRaf);
  const from=el.scrollTop,dist=target-from;
  if(Math.abs(dist)<.5){s.snapping=false;s.released=false;return}
  const dur=Math.min(380,Math.max(240,180+Math.abs(dist)*.7));
  let t0=0;s.snapping=true;
  const prev=el.style.scrollBehavior;s.prevScrollBehavior=prev;s.settleElement=el;el.style.scrollBehavior='auto';
  const step=ts=>{
   if(!s.snapping)return;
   if(!t0)t0=ts;
   const k=Math.min(1,(ts-t0)/dur);
   el.scrollTop=from+dist*easeOutCubic(k);
   if(k<1)s.settleRaf=requestAnimationFrame(step);
   else{s.snapping=false;s.released=false;el.style.scrollBehavior=prev;s.prevScrollBehavior=null;s.settleElement=null;paint()}
  };
  s.settleRaf=requestAnimationFrame(step);
 },[paint]);
 const snap=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(!el||s.touching||!s.released||s.snapping)return;
  const y=el.scrollTop,d=s.distance;
  if(y<1||y>=d-1){s.released=false;return}
  if(performance.now()-s.lastScrollAt<105&&performance.now()-s.releaseAt<680){
   s.snapRaf=requestAnimationFrame(snap);return;
  }
  const projected=y+Math.max(-1.4,Math.min(1.4,s.releaseVelocity))*83;
  const target=projected>d*.5?d:0;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   el.scrollTop=target;s.snapping=false;s.released=false;paint();return;
  }
  settleTo(el,target);
 },[scrollRef,paint,settleTo]);
 const queueSnap=useCallback(()=>{
  const s=state.current;cancelAnimationFrame(s.snapRaf);
  const tick=ts=>{
   if(!s.released||s.touching||s.snapping)return;
   if(ts-s.releaseAt<110){s.snapRaf=requestAnimationFrame(tick);return}
   snap();
  };
  if(s.released&&!s.touching&&!s.snapping)s.snapRaf=requestAnimationFrame(tick);
 },[snap]);
 const onScroll=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(s.elastic>0&&el?.scrollTop>1){
   s.elastic=0;writeElastic(el,0,s.width,true);
  }
  s.lastScrollAt=performance.now();paint();
 },[paint,scrollRef]);
 const onTouchStart=useCallback(e=>{
  const s=state.current;stop();
  s.touching=true;s.velocity=0;s.lastAt=0;s.axis=null;
  s.elastic=0;s.bottomElastic=0;s.startScrollY=scrollRef.current?.scrollTop??0;
  const startEl=scrollRef.current;
  s.maxScrollAtTouchStart=startEl?startEl.scrollHeight-startEl.clientHeight:0;
  s.startAtBottom=!!startEl&&s.startScrollY>=s.maxScrollAtTouchStart-1;
  writeElastic(startEl,0,s.width,false);writeBottomElastic(startEl,0,false);
  s.startX=e.touches?.[0]?.clientX??0;
  s.startY=e.touches?.[0]?.clientY??0;
  // Cancelling our settle rAF leaves scrollTop exactly under the taking-over finger.
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
  const canBottom=s.axis==='y'&&s.startAtBottom&&el.scrollTop>=s.maxScrollAtTouchStart-1&&dy<0;
  const bottom=canBottom?Math.min(48,elasticPullDistance(-dy)*.5):0;
  if(Math.abs(bottom-s.bottomElastic)>.08){s.bottomElastic=bottom;writeBottomElastic(el,bottom,false)}
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
  if(s.bottomElastic>0){s.bottomElastic=0;writeBottomElastic(scrollRef.current,0,true);s.released=false;return}
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
  const width=Math.max(1,hero.offsetWidth),height=Math.max(1,hero.offsetHeight);
  const compactHeight=parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||292;
  const distance=Math.max(1,stage.offsetHeight-compactHeight);
  const viewportHeight=el.clientHeight;
  if(s.lastCalibrated&&s.width===width&&s.height===height&&s.compactHeight===compactHeight&&s.distance===distance&&s.viewportHeight===viewportHeight)return;
  s.width=width;s.height=height;s.compactHeight=compactHeight;s.viewportHeight=viewportHeight;
  el.style.setProperty('--vx-profile-page-min',Math.max(0,viewportHeight-compactHeight-52)+'px');
  const geometry=profileCircleGeometry(s.width,s.height,s.compactHeight);
  const diameter=geometry.diameter;
  hero.style.setProperty('--vx-profile-mask-diameter',diameter.toFixed(3)+'px');
  hero.style.setProperty('--vx-profile-mask-radius',(diameter/2).toFixed(3)+'px');
  hero.style.setProperty('--vx-profile-mask-center-y',geometry.maskCenterY.toFixed(3)+'px');
  s.distance=distance;
  const D=diameter,cy=geometry.maskCenterY,w=s.width,h=s.height;
  s.clipCover='inset(0px 0px 0px 0px round 0px)';
  s.clipCircle='inset('+(cy-D/2).toFixed(2)+'px '+((w-D)/2).toFixed(2)+'px '+(h-cy-D/2).toFixed(2)+'px '+((w-D)/2).toFixed(2)+'px round '+(D/2).toFixed(2)+'px)';
  if(s.elastic>0)writeElastic(el,s.elastic,s.width,false);
  s.morph?.cancel();s.morph=null;
  s.nativeAnimation?.cancel();s.nativeAnimation=null;s.radiusPhase=null;s.lastCalibrated=true;
  // Previous JS fallback transforms must not override WAAPI motion.
  if(s.refs)for(const part of Object.values(s.refs)){
   if(part?.style){part.style.removeProperty('transform');part.style.removeProperty('opacity');part.style.removeProperty('clip-path')}
  }
  s.refs={
   hero,
   panel:motion.querySelector('.vx-profile-card-backdrop'),
   lip:motion.querySelector('.vx-profile-sheet-lip'),
   backdrop:motion.querySelector('.vx-profile-compact-backdrop'),
   backdropPhoto:motion.querySelector('.vx-profile-compact-backdrop .photo-box'),
   identity:motion.querySelector('.vx-profile-identity'),
   actions:motion.querySelector('.vx-profile-primary-actions'),
   more:motion.querySelector('.vx-profile-card-more'),
   goal:motion.querySelector('.vx-profile-goal'),
   bars:motion.querySelector('.vx-profile-photo-bars'),
   nav:motion.querySelector('.vx-profile-photo-nav'),

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
  if(hero)s.resizeObserver?.observe(hero);
  const onScrollEnd=()=>{
   if(s.snapping||s.touching)return;
   const y=el?.scrollTop||0;
   if(s.released&&y>1&&y<s.distance-1){s.releaseAt=performance.now()-700;snap()}
   else{s.released=false;cancelAnimationFrame(s.snapRaf)}
  };
  el?.addEventListener('scroll',onScroll,{passive:true});
  el?.addEventListener('touchmove',onTouchMove,{passive:true});
  el?.addEventListener('touchcancel',onTouchEnd,{passive:true});
  el?.addEventListener('scrollend',onScrollEnd,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.visualViewport?.addEventListener('resize',resize,{passive:true});
  return()=>{
   stop();cancelAnimationFrame(s.frame);s.frame=0;
   s.elastic=0;s.bottomElastic=0;writeElastic(el,0,s.width,false);writeBottomElastic(el,0,false);
   s.morph?.cancel();s.morph=null;
   s.nativeAnimation?.cancel();s.nativeAnimation=null;
   s.resizeObserver?.disconnect();
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
