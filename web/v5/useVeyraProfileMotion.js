import {useCallback,useLayoutEffect,useRef} from 'react';
import {clamp,profileFrame,profileCircleGeometry,profileMorphInset,profileReleaseDirection,releaseTarget,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT} from './profileMotionMath.js';
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
  frame:0,snapRaf:0,settleRaf:0,settleElement:null,prevScrollBehavior:null,observed:null,
  distance:1,width:1,height:1,lastProgress:-1,
  touching:false,released:false,snapping:false,axis:null,
  startX:0,startY:0,lastY:0,lastAt:0,lastScrollAt:0,
  releaseAt:0,velocity:0,releaseVelocity:0,
  refs:null,resizeObserver:null,nativeAnimation:null,engine:'JS fallback',elastic:0,bottomElastic:0,startScrollY:0,startAtBottom:false,
  samples:[],releaseDirection:0,hapticFired:false,gestureRelease:false,
 });
 const stop=useCallback(()=>{
  const s=state.current;
  cancelAnimationFrame(s.snapRaf);cancelAnimationFrame(s.settleRaf);
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
   // In Chromium, the scroll position drives visual transforms without JS.
   // JS now only samples momentum/snap, reports opt-in timings, and changes
   // the shape clip at two phase boundaries (never per frame).
   const shape=p>=PROFILE_CIRCLE_AT?'circle':'cover';
   if(motion.dataset.photoShape!==shape)motion.dataset.photoShape=shape;
   if(s.nativeAnimation){
    // Some Telegram Chromium builds expose ScrollTimeline yet do not advance
    // animations attached to a nested WebView scroll source. Treat a stale
    // timeline as unsupported and use the exact same profileFrame fallback.
    const timed=s.nativeAnimation.animations?.[0]?.effect?.getComputedTiming()?.progress;
    const expected=scrollY/Math.max(1,scroller.scrollHeight-scroller.clientHeight);
    if(p>.03&&(typeof timed!=='number'||Math.abs(timed-expected)>.08)){
     s.nativeAnimation.cancel();s.nativeAnimation=null;s.engine='JS fallback';
    }
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
    parts.hero.style.clipPath=profileMorphInset(p,s.width,s.height,s.diameter,s.maskCenterY);
   if(parts.panel){parts.panel.style.transform=translate(0,f.sheetY-(s.height-30));parts.panel.style.clipPath='inset(0px 0px '+f.panelClipBottom.toFixed(3)+'px 0px)'}
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
   if(parts.mainPhoto)parts.mainPhoto.style.opacity=f.mainPhotoOpacity.toFixed(3);
   if(parts.backdropPhoto){const t=clamp((p-.20)/.35);parts.backdropPhoto.style.opacity=(t*t*(3-2*t)).toFixed(3)}
   if(parts.rim)parts.rim.style.opacity=clamp((p-.60)/.05).toFixed(3);
   if(parts.online)parts.online.style.opacity=clamp((p-.60)/.05).toFixed(3);


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
 const settleTo=useCallback((el,target,initialVelocity=0)=>{
  const s=state.current;
  cancelAnimationFrame(s.settleRaf);
  const max=Math.max(0,el.scrollHeight-el.clientHeight);
  target=Math.max(0,Math.min(max,target));
  const from=el.scrollTop,dist=target-from;
  if(Math.abs(dist)<.5){el.scrollTop=target;s.snapping=false;s.released=false;paint();return}
  const duration=Math.min(330,Math.max(260,260+Math.abs(dist)*.20));
  // Cubic Hermite starts with the finger's projected speed and ends at rest.
  const slope=initialVelocity*dist>0?clamp(Math.abs(initialVelocity)*duration/Math.abs(dist),.4,2.8):2.8;
  s.snapping=true;s.released=false;
  const prev=el.style.scrollBehavior;s.prevScrollBehavior=prev;s.settleElement=el;el.style.scrollBehavior='auto';
  let began=null;
  const step=ts=>{
   if(!s.snapping||s.touching||scrollRef.current!==el)return;
   if(began===null)began=ts;
   const k=Math.min(1,(ts-began)/duration);
   const progress=slope*k+(3-2*slope)*k*k+(slope-2)*k*k*k;
   el.scrollTop=from+dist*progress;
   if(k<1){s.settleRaf=requestAnimationFrame(step);return}
   el.scrollTop=target;
   s.snapping=false;s.prevScrollBehavior=null;s.settleElement=null;el.style.scrollBehavior=prev;
   if(s.gestureRelease&&!s.hapticFired){
    s.hapticFired=true;
    try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light')}catch{}
   }
   s.gestureRelease=false;paint();
  };
  s.settleRaf=requestAnimationFrame(step);
 },[scrollRef,paint]);
 const snap=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(!el||s.touching||s.snapping)return;
  const y=el.scrollTop,d=s.distance;
  if(y<=.5||y>=d-.5){s.released=false;return}
  const target=releaseTarget(s.releaseDirection,y,d,s.startScrollY);
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
   el.scrollTop=target;s.released=false;paint();return;
  }
  settleTo(el,target,s.releaseVelocity);
 },[scrollRef,paint,settleTo]);
 const queueSnap=useCallback(()=>{
  const s=state.current;
  cancelAnimationFrame(s.snapRaf);
  const el=scrollRef.current;if(!el||s.touching||s.snapping||!s.released)return;
  const tick=()=>{
   if(s.touching||s.snapping||!s.released||scrollRef.current!==el)return;
   const y=el.scrollTop;
   if(y<=.5||y>=s.distance-.5){s.released=false;return}
   if(performance.now()-s.lastScrollAt>=90){snap();return}
   s.snapRaf=requestAnimationFrame(tick);
  };
  s.snapRaf=requestAnimationFrame(tick);
 },[snap,scrollRef]);
 const onScroll=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(s.elastic>0&&el?.scrollTop>1){
   s.elastic=0;writeElastic(el,0,s.width,true);
  }
  const now=performance.now();
  if(el&&!s.touching&&!s.snapping){
   const delta=el.scrollTop-s.lastY;
   if(Math.abs(delta)>1)s.releaseDirection=Math.sign(delta);
   if(el.scrollTop>.5&&el.scrollTop<s.distance-.5){s.released=true;queueSnap()}
  }
  s.lastScrollAt=now;paint();
 },[paint,scrollRef,queueSnap]);
 const onTouchStart=useCallback(e=>{
  const s=state.current;stop();
  s.touching=true;s.velocity=0;s.lastAt=0;s.axis=null;s.gestureVelocity=0;s.touchLastY=null;s.touchLastAt=0;
  s.samples=[];s.releaseDirection=0;s.releaseVelocity=0;s.gestureRelease=false;s.hapticFired=false;
  s.elastic=0;s.bottomElastic=0;s.startScrollY=scrollRef.current?.scrollTop??0;
  const startEl=scrollRef.current;
  s.maxScrollAtTouchStart=startEl?startEl.scrollHeight-startEl.clientHeight:0;
  s.startAtBottom=!!startEl&&s.startScrollY>=s.maxScrollAtTouchStart-1;
  writeElastic(startEl,0,s.width,false);writeBottomElastic(startEl,0,false);
  s.startX=e.touches?.[0]?.clientX??0;
  s.startY=e.touches?.[0]?.clientY??0;
   s.touchLastY=s.startY;s.touchLastAt=performance.now();
   s.samples=[{at:s.touchLastAt,finger:s.startY}];
  // Cancelling our settle rAF leaves scrollTop exactly under the taking-over finger.
 },[stop,scrollRef]);
 const onTouchMove=useCallback(e=>{
  const s=state.current,el=scrollRef.current;
  if(!e.touches?.length)return;
  const dx=e.touches[0].clientX-s.startX;
  const dy=e.touches[0].clientY-s.startY;
  if(!s.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=12){
   if(Math.abs(dx)>=Math.abs(dy)*1.6)s.axis='x';
   else if(Math.abs(dy)>=Math.abs(dx)*1.1)s.axis='y';
  }
  if(!el)return;
  const timestamp=performance.now(),finger=e.touches[0].clientY;
  s.samples.push({at:timestamp,finger});
  while(s.samples.length>2&&(timestamp-s.samples[0].at>120||s.samples.length>24))s.samples.shift();
  if(s.touchLastY!==null&&s.axis==='y'){
   const dt=timestamp-s.touchLastAt;
   if(dt>0&&dt<150)s.gestureVelocity=s.gestureVelocity*.4+((s.touchLastY-finger)/dt)*.6;
  }
  s.touchLastY=finger;s.touchLastAt=timestamp;
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
  const s=state.current,el=scrollRef.current;
  s.touching=false;
  if(s.elastic>0){s.elastic=0;writeElastic(el,0,s.width,true)}
  if(s.bottomElastic>0){s.bottomElastic=0;writeBottomElastic(el,0,true)}
  if(!el)return;
  const y=el.scrollTop,d=s.distance;
  if((y<=.5||y>=d-.5)&&s.axis==='x')return;
  const release=profileReleaseDirection({samples:s.samples,startY:s.startScrollY,y,at:performance.now()});
  s.releaseDirection=release.direction;
  s.releaseVelocity=release.velocity;
  s.gestureRelease=true;s.released=true;s.releaseAt=performance.now();
  s.lastScrollAt=s.releaseAt;
  queueSnap();
 },[queueSnap,scrollRef]);
 const onWheel=useCallback(e=>{
  const s=state.current;s.released=true;s.gestureRelease=false;
  if(Math.abs(e.deltaY)>0)s.releaseDirection=Math.sign(e.deltaY);
  s.releaseVelocity=0;s.releaseAt=performance.now();queueSnap();
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
  el.style.setProperty('--vx-profile-page-min',Math.max(0,viewportHeight-compactHeight-52+distance)+'px');
  const geometry=profileCircleGeometry(s.width,s.height,s.compactHeight);
  const diameter=geometry.diameter;
  hero.style.setProperty('--vx-profile-mask-diameter',diameter.toFixed(3)+'px');
  hero.style.setProperty('--vx-profile-mask-radius',(diameter/2).toFixed(3)+'px');
  hero.style.setProperty('--vx-profile-mask-center-y',geometry.maskCenterY.toFixed(3)+'px');
  s.distance=distance;
  s.diameter=diameter;s.maskCenterY=geometry.maskCenterY;
  if(s.elastic>0)writeElastic(el,s.elastic,s.width,false);
  s.nativeAnimation?.cancel();s.nativeAnimation=null;s.lastCalibrated=true;
  // Previous JS fallback transforms must not override WAAPI motion.
  if(s.refs)for(const part of Object.values(s.refs)){
   if(part?.style){part.style.removeProperty('transform');part.style.removeProperty('opacity');part.style.removeProperty('clip-path')}
  }
  s.refs={
   hero,
   rim:motion.querySelector('.vx-profile-photo-morph-rim'),
   mainPhoto:motion.querySelector('.vx-profile-main-crossfade'),
   online:motion.querySelector('.vx-profile-online'),
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
   const y=el?.scrollTop??0;
   if(y>.5&&y<s.distance-.5){s.released=true;queueSnap()}
   else if(y<=.5||y>=s.distance-.5){s.released=false;cancelAnimationFrame(s.snapRaf)}
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
   s.nativeAnimation?.cancel();s.nativeAnimation=null;
   s.resizeObserver?.disconnect();
   el?.removeEventListener('scroll',onScroll);
   el?.removeEventListener('touchmove',onTouchMove);
   el?.removeEventListener('touchcancel',onTouchEnd);
   el?.removeEventListener('scrollend',onScrollEnd);
   window.removeEventListener('resize',resize);
   window.visualViewport?.removeEventListener('resize',resize);
  };
 },[ready,calibrate,paint,scrollRef,stageRef,snap,queueSnap,stop,onScroll,onTouchMove,onTouchEnd]);
 return {onTouchStart,onTouchEnd,onWheel,calibrate};
}
