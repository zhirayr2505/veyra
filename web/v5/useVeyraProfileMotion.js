import {useCallback,useLayoutEffect,useRef} from 'react';
import {clamp,profileFrame} from './profileMotionMath.js';

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
  refs:null,resizeObserver:null,mutationObserver:null,
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
   const now=performance.now();
   const scrollY=scroller.scrollTop;
   const p=clamp(scrollY/s.distance);
   if(s.lastAt>0&&!s.snapping&&now-s.lastAt>4&&now-s.lastAt<120){
    const instant=(scrollY-s.lastY)/(now-s.lastAt);
    s.velocity=s.velocity*.55+instant*.45;
   }
   s.lastY=scrollY;s.lastAt=now;
   if(Math.abs(p-s.lastProgress)<.00015)return;
   s.lastProgress=p;
   const f=profileFrame(p,s.width,s.height,s.compactHeight);
   const translate=(x,y)=>'translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0)';
   const scaleX=f.width/s.width,scaleY=f.height/s.height;
   const scale=' scale('+scaleX.toFixed(6)+','+scaleY.toFixed(6)+')';
   parts.hero.style.transform=translate(f.x,f.y)+scale;
   parts.hero.style.borderRadius=f.radius.toFixed(2)+'%';
   // Compensate for portrait-to-square squash on the image itself.
   if(!parts.image?.isConnected){
    parts.image=parts.hero.querySelector('.photo-box img');
   }
   if(parts.image)parts.image.style.transform='scaleY('+(scaleX/scaleY).toFixed(6)+')';
   if(parts.panel)parts.panel.style.transform=translate(0,f.sheetY-(s.height-30));
   if(parts.backdrop)parts.backdrop.style.opacity=f.backdropOpacity.toFixed(3);
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
   const phase=p<=.002?'expanded':p>=.998?'compact':'transition';
   if(motion.dataset.state!==phase)motion.dataset.state=phase;
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
  state.current.lastScrollAt=performance.now();paint();
 },[paint]);
 const onTouchStart=useCallback(e=>{
  const s=state.current;stop();
  s.touching=true;s.velocity=0;s.lastAt=0;s.axis=null;
  s.startX=e.touches?.[0]?.clientX??0;
  s.startY=e.touches?.[0]?.clientY??0;
  // Stops any native finishing scroll when a fresh finger takes over.
  const el=scrollRef.current;
  if(el&&s.snapping)el.scrollTo({top:el.scrollTop,behavior:'instant'});
 },[stop,scrollRef]);
 const onTouchMove=useCallback(e=>{
  const s=state.current;
  if(s.axis||!e.touches?.length)return;
  const dx=e.touches[0].clientX-s.startX;
  const dy=e.touches[0].clientY-s.startY;
  if(Math.max(Math.abs(dx),Math.abs(dy))>9)s.axis=Math.abs(dx)>Math.abs(dy)*1.13?'x':'y';
 },[]);
 const onTouchEnd=useCallback(()=>{
  const s=state.current;
  s.touching=false;
  if(s.axis==='x'){s.released=false;return}
  s.released=true;s.releaseVelocity=s.velocity;s.releaseAt=performance.now();
  queueSnap();
 },[queueSnap]);
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
  s.refs={
   hero,image:hero.querySelector('.photo-box img'),
   panel:motion.querySelector('.vx-profile-card-backdrop'),
   backdrop:motion.querySelector('.vx-profile-compact-backdrop'),
   identity:motion.querySelector('.vx-profile-identity'),
   actions:motion.querySelector('.vx-profile-primary-actions'),
   more:motion.querySelector('.vx-profile-card-more'),
   goal:motion.querySelector('.vx-profile-goal'),
   bars:motion.querySelector('.vx-profile-photo-bars'),
   nav:motion.querySelector('.vx-profile-photo-nav'),
   online:motion.querySelector('.vx-profile-online'),
   shade:motion.querySelector('.vx-profile-photo-shade'),
  };
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
   if(s.refs){s.refs.image=hero.querySelector('.photo-box img');s.lastProgress=-1;paint()}
  }):null;
  s.mutationObserver?.observe(hero,{childList:true,subtree:true});
  const onScrollEnd=()=>{
   if(s.snapping){s.snapping=false;s.released=false;clearTimeout(s.settleTimer)}
   else if(s.released&&!s.touching){clearTimeout(s.timer);snap()}
  };
  el?.addEventListener('scrollend',onScrollEnd,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.visualViewport?.addEventListener('resize',resize,{passive:true});
  return()=>{
   stop();cancelAnimationFrame(s.frame);s.frame=0;
   s.resizeObserver?.disconnect();s.mutationObserver?.disconnect();
   el?.removeEventListener('scrollend',onScrollEnd);
   window.removeEventListener('resize',resize);
   window.visualViewport?.removeEventListener('resize',resize);
  };
 },[ready,calibrate,paint,scrollRef,stageRef,snap,stop]);
 return {onScroll,onTouchStart,onTouchMove,onTouchEnd,onWheel,calibrate};
}
