import {useCallback,useLayoutEffect,useRef} from 'react';
// VEYRA_PROFILE_MASTER_FINAL: snapping rules from profile_geometry.mjs and motion spec.
// Keep one image and paint one CSS progress per RAF; never trigger React renders per frame.
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ease=t=>{let lo=0,hi=1,u=t;for(let i=0;i<13;i++){const a=1-u,x=3*a*a*u*.22+3*a*u*u*.36+u*u*u;if(x<t)lo=u;else hi=u;u=(lo+hi)/2}return 1-Math.pow(1-u,3)};
export function useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready}){
 const status=useRef({distance:375,raf:0,snapRaf:0,timer:0,released:false,touching:false,snapping:false,lastY:0,lastAt:0,velocity:0});
 const cancelAnimation=useCallback(()=>{const s=status.current;cancelAnimationFrame(s.snapRaf);s.snapRaf=0;s.snapping=false},[]);
 const paint=useCallback(()=>{
  const s=status.current;if(s.raf)return;
  s.raf=requestAnimationFrame(()=>{
   s.raf=0;const el=scrollRef.current,motion=motionRef.current;if(!el||!motion)return;
   const y=el.scrollTop,p=clamp(y/s.distance),t=performance.now();
   // Exponentially smooth velocity noise from Android coalesced scroll events.
   if(s.lastAt&&t-s.lastAt>4&&t-s.lastAt<130)s.velocity=.65*s.velocity+.35*((y-s.lastY)/(t-s.lastAt));
   s.lastY=y;s.lastAt=t;
   const value=p.toFixed(5);
   motion.style.setProperty('--vx-collapse',value);
   el.style.setProperty('--vx-collapse',value);
   motion.dataset.state=p<=.002?'expanded':p>=.998?'compact':'transition';
  });
 },[scrollRef,motionRef]);
 const calibrate=useCallback(()=>{
  const s=status.current,el=scrollRef.current,stage=stageRef.current;if(!el||!stage)return;
  s.distance=Math.max(1,stage.offsetHeight-(parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||272));
  paint();
 },[scrollRef,stageRef,paint]);
 const snap=useCallback(()=>{
  const s=status.current,el=scrollRef.current;
  if(!el||s.touching||s.snapping||!s.released)return;
  const start=el.scrollTop,d=s.distance;
  if(start<=1||start>=d-1){s.released=false;return}
  const projected=Math.abs(s.velocity)>=.45?start+clamp(s.velocity,-2,2)*180:start;
  const destination=projected>=d/2?d:0;
  const started=performance.now(),duration=180+120*clamp(Math.abs(destination-start)/d);
  s.released=false;s.snapping=true;
  const tick=now=>{
   if(!s.snapping)return;
   const t=clamp((now-started)/duration);
   el.scrollTop=start+(destination-start)*ease(t);
   paint();
   if(t<1)s.snapRaf=requestAnimationFrame(tick);
   else{el.scrollTop=destination;s.snapping=false;s.snapRaf=0;paint()}
  };
  s.snapRaf=requestAnimationFrame(tick);
 },[scrollRef,paint]);
 const scheduleSnap=useCallback(()=>{
  const s=status.current;clearTimeout(s.timer);if(!s.released||s.touching||s.snapping)return;
  s.timer=setTimeout(snap,145);
 },[snap]);
 const onScroll=useCallback(()=>{paint();const s=status.current;if(s.released&&!s.touching&&!s.snapping)scheduleSnap()},[paint,scheduleSnap]);
 const onTouchStart=useCallback(()=>{const s=status.current;clearTimeout(s.timer);cancelAnimation();s.released=false;s.touching=true;s.velocity=0;s.lastAt=0},[cancelAnimation]);
 const onTouchEnd=useCallback(()=>{const s=status.current;s.touching=false;s.released=true;scheduleSnap()},[scheduleSnap]);
 const onWheel=useCallback(()=>{const s=status.current;s.released=true;scheduleSnap()},[scheduleSnap]);
 const compactForTab=useCallback(()=>{
  const s=status.current,el=scrollRef.current;if(!el)return;clearTimeout(s.timer);
  cancelAnimation();s.released=false;s.touching=false;
  if(el.scrollTop<s.distance)el.scrollTo({top:s.distance,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[scrollRef,cancelAnimation]);
 useLayoutEffect(()=>{
  if(!ready)return;
  calibrate();const el=scrollRef.current;
  const onEnd=()=>{const s=status.current;if(s.released&&!s.touching&&!s.snapping)scheduleSnap()};
  const onResize=()=>{calibrate()};
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(onResize):null;
  ro?.observe(stageRef.current);
  if('onscrollend' in el)el.addEventListener('scrollend',onEnd,{passive:true});
  window.addEventListener('resize',onResize,{passive:true});
  window.visualViewport?.addEventListener('resize',onResize,{passive:true});
  return()=>{const s=status.current;clearTimeout(s.timer);cancelAnimationFrame(s.raf);cancelAnimationFrame(s.snapRaf);s.raf=0;s.snapRaf=0;s.released=false;s.touching=false;s.snapping=false;
   ro?.disconnect();el.removeEventListener('scrollend',onEnd);window.removeEventListener('resize',onResize);window.visualViewport?.removeEventListener('resize',onResize)}
 },[ready,calibrate,scrollRef,stageRef,scheduleSnap]);
 return {onScroll,onTouchStart,onTouchEnd,onWheel,compactForTab,calibrate};
}
