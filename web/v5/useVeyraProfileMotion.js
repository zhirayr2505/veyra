import {useCallback,useLayoutEffect,useRef} from 'react';
// Native scroll compositor handles momentum and snapping. Only the visible shared header
// receives ONE scroll progress update per animation frame; React never rerenders per frame.
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
export function useVeyraProfileMotion({scrollRef,stageRef,motionRef,ready}){
 const state=useRef({distance:375,frame:0,timer:0,lastProgress:-1,touching:false,snapping:false,released:false,lastY:0,lastAt:0,velocity:0});
 const paint=useCallback(()=>{
  const s=state.current;if(s.frame)return;
  s.frame=requestAnimationFrame(()=>{
   s.frame=0;const el=scrollRef.current,motion=motionRef.current;if(!el||!motion)return;
   const y=el.scrollTop,p=clamp(y/s.distance),now=performance.now();
   if(s.lastAt&&now-s.lastAt>5&&now-s.lastAt<100&&!s.snapping)s.velocity=.75*s.velocity+.25*(y-s.lastY)/(now-s.lastAt);
   s.lastY=y;s.lastAt=now;
   // Single variable, on one compositor-isolated subtree. Avoid the duplicate
   // scroller write and repeated data-state changes that caused Android jank.
   if(Math.abs(p-s.lastProgress)>.00025){motion.style.setProperty('--vx-collapse',p.toFixed(4));s.lastProgress=p}
   const phase=p<=.003?'expanded':p>=.997?'compact':'transition';
   if(motion.dataset.state!==phase)motion.dataset.state=phase;
  })
 },[scrollRef,motionRef]);
 const calibrate=useCallback(()=>{
  const el=scrollRef.current,stage=stageRef.current;if(!el||!stage)return;
  state.current.distance=Math.max(1,stage.offsetHeight-(parseFloat(getComputedStyle(el).getPropertyValue('--vx-profile-compact-height'))||272));
  state.current.lastProgress=-1;paint()
 },[scrollRef,stageRef,paint]);
 const snap=useCallback(()=>{
  const s=state.current,el=scrollRef.current;if(!el||s.touching||s.snapping||!s.released)return;
  s.released=false;
  const y=el.scrollTop,d=s.distance;
  if(y<1||y>=d-1)return;
  const projected=y+(Math.abs(s.velocity)>.35?Math.max(-1.5,Math.min(1.5,s.velocity))*125:0);
  const destination=projected>=d*.48?d:0;
  s.snapping=true;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){el.scrollTop=destination;s.snapping=false;paint();return}
  // Native smooth scrolling avoids per-frame JS read/write of scrollTop (the
  // feedback loop responsible for stepped animation on Telegram Android).
  el.scrollTo({top:destination,behavior:'smooth'});
  // A new finger gesture can interrupt without fighting a JS animation.
  clearTimeout(s.timer);
  s.timer=setTimeout(()=>{s.snapping=false;paint()},560);
 },[scrollRef,paint]);
 const queueSnap=useCallback(()=>{
  const s=state.current;clearTimeout(s.timer);
  if(!s.released||s.touching||s.snapping)return;
  s.timer=setTimeout(snap,105)
 },[snap]);
 const onScroll=useCallback(()=>{paint();if(state.current.released&&!state.current.touching&&!state.current.snapping)queueSnap()},[paint,queueSnap]);
 const onTouchStart=useCallback(()=>{const s=state.current;clearTimeout(s.timer);s.touching=true;s.released=false;s.snapping=false;s.velocity=0;s.lastAt=0},[]);
 const onTouchEnd=useCallback(()=>{const s=state.current;s.touching=false;s.released=true;queueSnap()},[queueSnap]);
 const onWheel=useCallback(()=>{const s=state.current;s.released=true;queueSnap()},[queueSnap]);
 const compactForTab=useCallback(()=>{
  const s=state.current,el=scrollRef.current;if(!el)return;
  clearTimeout(s.timer);s.released=false;s.snapping=false;
  if(el.scrollTop<s.distance-1){el.scrollTo({top:s.distance,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
 },[scrollRef]);
 useLayoutEffect(()=>{
  if(!ready)return;
  const el=scrollRef.current;
  calibrate();
  const resize=()=>calibrate();
  const obs=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  if(stageRef.current)obs?.observe(stageRef.current);
  const onEnd=()=>{const s=state.current;if(s.snapping){s.snapping=false;s.released=false}else if(s.released&&!s.touching)queueSnap()};
  el?.addEventListener('scrollend',onEnd,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.visualViewport?.addEventListener('resize',resize,{passive:true});
  return()=>{const s=state.current;clearTimeout(s.timer);cancelAnimationFrame(s.frame);s.frame=0;s.released=false;s.snapping=false;
   obs?.disconnect();el?.removeEventListener('scrollend',onEnd);window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize)}
 },[ready,calibrate,paint,queueSnap,scrollRef,stageRef]);
 return {onScroll,onTouchStart,onTouchEnd,onWheel,compactForTab,calibrate};
}
