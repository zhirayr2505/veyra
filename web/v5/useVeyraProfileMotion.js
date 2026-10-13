import {useCallback,useLayoutEffect,useRef} from 'react';
import {animate} from 'motion';

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));

// Exactly one profile photo. Native scrolling controls progress while the
// finger is down. Only transform, border radius and small visual details
// change per frame; never animate layout width/height/left/top.
export function useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready}){
 const state=useRef({distance:1,frame:0,timer:0,touching:false,released:false,
  snapping:false,animation:null,lastY:0,lastAt:0,velocity:0,hero:null,image:null,
  width:1,height:1,lastProgress:-1});
 const paint=useCallback(()=>{
  const s=state.current;if(s.frame)return;
  s.frame=requestAnimationFrame(()=>{
   s.frame=0;
   const el=scrollRef.current,motion=motionRef.current;
   if(!el||!motion)return;
   const y=el.scrollTop,p=clamp(y/s.distance),now=performance.now();
   if(s.lastAt&&now-s.lastAt>4&&now-s.lastAt<120&&!s.snapping){
    s.velocity=.65*s.velocity+.35*(y-s.lastY)/(now-s.lastAt);
   }
   s.lastY=y;s.lastAt=now;
   if(Math.abs(p-s.lastProgress)<.0002)return;
   s.lastProgress=p;
   motion.style.setProperty('--vx-collapse',p.toFixed(5));
   const phase=p<.002?'expanded':p>.998?'compact':'transition';
   if(motion.dataset.state!==phase)motion.dataset.state=phase;
   if(!s.image || !s.image.isConnected)s.image=s.hero?.querySelector('.photo-box img')||null;
   const sx=1-(1-98/s.width)*p;
   const sy=1-(1-98/s.height)*p;
   if(s.hero){
    s.hero.style.setProperty('transform',
     'translate3d('+(16*p).toFixed(2)+'px,'+(104*p).toFixed(2)+'px,0) scale('+
       sx.toFixed(6)+','+sy.toFixed(6)+')','important');
    s.hero.style.setProperty('border-radius',(p*50).toFixed(2)+'%','important');
   }
   if(s.image){
    // The image remains proportionally scaled, never visibly stretched
    // when the parent frame changes from portrait to a square avatar.
    s.image.style.setProperty('transform','scaleY('+(sx/sy).toFixed(6)+')','important');
   }
  });
 },[scrollRef,motionRef]);
 const stop=useCallback(()=>{
  const s=state.current;
  clearTimeout(s.timer);s.animation?.stop?.();s.animation=null;s.snapping=false;
 },[]);
 const goTo=useCallback((to)=>{
  const s=state.current,el=scrollRef.current;
  if(!el)return;
  stop();s.released=false;
  const from=el.scrollTop;
  if(Math.abs(to-from)<1){el.scrollTop=to;paint();return}
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   el.scrollTop=to;paint();return;
  }
  s.snapping=true;
  const distance=Math.abs(to-from)/Math.max(1,s.distance);
  s.animation=animate(from,to,{
   type:'tween',duration:Math.max(.16,Math.min(.3,.16+distance*.12)),
   ease:[.22,1,.36,1],
   onUpdate:value=>{if(!s.touching){el.scrollTop=value;paint()}},
   onComplete:()=>{s.snapping=false;s.animation=null;s.released=false;el.scrollTop=to;paint();}
  });
 },[scrollRef,stop,paint]);
 const snap=useCallback(()=>{
  const s=state.current,el=scrollRef.current;
  if(!el||s.touching||s.snapping||!s.released)return;
  const y=el.scrollTop,d=s.distance;
  s.released=false;
  if(y<1||y>=d-1)return;
  const prediction=y+clamp(s.velocity,-1.3,1.3)*85;
  goTo(prediction>=d*.5?d:0);
 },[scrollRef,goTo]);
 const queueSnap=useCallback(()=>{
  const s=state.current;
  clearTimeout(s.timer);
  if(!s.released||s.touching||s.snapping)return;
  s.timer=setTimeout(snap,130);
 },[snap]);
 const onScroll=useCallback(()=>{paint();queueSnap()},[paint,queueSnap]);
 const onTouchStart=useCallback(()=>{
  const s=state.current;stop();s.touching=true;s.released=false;
  s.lastAt=0;s.velocity=0;
 },[stop]);
 const onTouchEnd=useCallback(()=>{
  const s=state.current;s.touching=false;s.released=true;queueSnap();
 },[queueSnap]);
 const onWheel=useCallback(()=>{state.current.released=true;queueSnap()},[queueSnap]);
 const compactForTab=useCallback(()=>goTo(state.current.distance),[goTo]);
 const calibrate=useCallback(()=>{
  const s=state.current,el=scrollRef.current,stage=stageRef.current,motion=motionRef.current;
  if(!el||!stage||!motion)return;
  s.hero=motion.querySelector('.vx-profile-hero-photo');
  s.image=s.hero?.querySelector('.photo-box img')||null;
  s.width=Math.max(1,s.hero?.offsetWidth||el.clientWidth);
  s.height=Math.max(1,s.hero?.offsetHeight||420);
  const compact=parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||294;
  s.distance=Math.max(1,stage.offsetHeight-compact);
  s.lastProgress=-1;
  paint();
 },[scrollRef,stageRef,motionRef,paint]);
 useLayoutEffect(()=>{
  if(!ready)return;
  const el=scrollRef.current;
  calibrate();
  const obs=typeof ResizeObserver==='function'?new ResizeObserver(calibrate):null;
  if(stageRef.current)obs?.observe(stageRef.current);
  // Photo can arrive asynchronously, after the initial profile layout.
  const onResize=()=>calibrate();
  const onScrollEnd=()=>queueSnap();
  el?.addEventListener('scrollend',onScrollEnd,{passive:true});
  window.addEventListener('resize',onResize,{passive:true});
  window.visualViewport?.addEventListener('resize',onResize,{passive:true});
  return()=>{
   const s=state.current;stop();cancelAnimationFrame(s.frame);s.frame=0;
   obs?.disconnect();
   el?.removeEventListener('scrollend',onScrollEnd);
   window.removeEventListener('resize',onResize);
   window.visualViewport?.removeEventListener('resize',onResize);
  };
 },[ready,calibrate,queueSnap,stop,scrollRef,stageRef]);
 return {onScroll,onTouchStart,onTouchEnd,onWheel,compactForTab,calibrate};
}
