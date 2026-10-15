import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {Photo} from './UI.jsx';
import {photoUrl} from './api.js';
import {swipeAxis,swipeStep,swipeBound} from './photoSwipeMath.js';
import './HeroPhotoTrack.css';

const BASE='translate3d(-33.333333%,0,0)';
const spring='transform .29s cubic-bezier(.2,.8,.2,1)';
export const HeroPhotoTrack=React.memo(function HeroPhotoTrack({photos,index,onIndex,onGallery,name,placeholders,motionRef,onDragProgress}){
 const viewport=useRef(null),track=useRef(null),gesture=useRef(null),finishTimer=useRef(0),ignoreClickUntil=useRef(0);
 const count=photos.length;
 const offset=(px,animated=false)=>{
  if(!track.current)return;
  track.current.style.transition=animated?spring:'none';
  track.current.style.transform=px===0?BASE:'translate3d(calc(-33.333333% + '+px.toFixed(2)+'px),0,0)';
 };
 useLayoutEffect(()=>{
  offset(0);onDragProgress?.(0);
 },[index]);
 useEffect(()=>()=>cancelAnimationFrame(finishTimer.current),[]);
 useEffect(()=>{
  const motion=motionRef.current;if(!motion||typeof MutationObserver==='undefined')return;
  const interrupt=()=>{
   if(motion.dataset.state==='expanded')return;
   if(gesture.current||finishTimer.current){
    gesture.current=null;cancelAnimationFrame(finishTimer.current);
    finishTimer.current=0;offset(0,false);onDragProgress?.(0);
   }
  };
  const observer=new MutationObserver(interrupt);
  observer.observe(motion,{attributes:true,attributeFilter:['data-state']});
  return()=>observer.disconnect();
 },[motionRef,onDragProgress]);
 useEffect(()=>{
  const current=photos[index];if(!current)return;
  let cancelled=false;
  photoUrl(current,{width:960}).then(async()=>{
   if(cancelled)return;
   for(const id of [photos[(index+1)%count],photos[(index+count-1)%count]]){
    if(cancelled)return;
    if(id&&id!==current){
     const url=await photoUrl(id,{width:960}).catch(()=>null);
     if(url&&typeof Image!=='undefined'){
      const img=new Image();img.src=url;await img.decode?.().catch(()=>{});
     }
    }
   }
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[photos,index,count]);
 const expanded=()=>motionRef.current?.dataset.state==='expanded';
 const onDown=e=>{
  if(count<2||!expanded()||e.pointerType==='mouse')return;
  cancelAnimationFrame(finishTimer.current);
  gesture.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastAt:performance.now(),velocity:0,dx:0,axis:null,width:viewport.current?.clientWidth||1};
 };
 const onMove=e=>{
  const g=gesture.current;
  if(!g||g.pointerId!==e.pointerId||!expanded())return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
  if(!g.axis)g.axis=swipeAxis(dx,dy);
  if(g.axis!=='x')return;
  e.preventDefault();
  if(!e.currentTarget.hasPointerCapture?.(e.pointerId)){
   try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
  }
  const now=performance.now(),dt=now-g.lastAt;
  if(dt>0&&dt<100)g.velocity=(e.clientX-g.lastX)/dt;
  g.lastAt=now;g.lastX=e.clientX;g.dx=swipeBound(dx,g.width);
  offset(g.dx);onDragProgress?.(Math.min(1,Math.abs(g.dx)/g.width));
 };
 const onUp=e=>{
  const g=gesture.current;
  if(!g||g.pointerId!==e.pointerId)return;
  if(!expanded()){
   gesture.current=null;offset(0,false);onDragProgress?.(0);return;
  }
  gesture.current=null;
  if(g.axis!=='x')return;
  ignoreClickUntil.current=performance.now()+420;
  const physical=swipeStep(g.dx,g.width,g.velocity);
  if(!physical){offset(0,true);onDragProgress?.(0);return}
  offset(physical*g.width,true);
  let started=0;
   const finish=ts=>{
    if(!started)started=ts;
    if(ts-started<290){finishTimer.current=requestAnimationFrame(finish);return}
    if(count)onIndex((index-physical+count)%count);
   };
   finishTimer.current=requestAnimationFrame(finish);
 };
 const onCancel=()=>{gesture.current=null;offset(0,true);onDragProgress?.(0)};
 const onTap=e=>{
  if(performance.now()<ignoreClickUntil.current)return;
  if(!expanded()||count<2){onGallery();return}
  const rect=viewport.current.getBoundingClientRect();
  const fraction=(e.clientX-rect.left)/Math.max(1,rect.width);
  if(fraction<.28)onIndex((index+count-1)%count);
  else if(fraction>.72)onIndex((index+1)%count);
  else onGallery();
 };
 const slides=count?[photos[(index+count-1)%count],photos[index],photos[(index+1)%count]]:[];
 return <div className="vx-hero-image-compensation" ref={viewport}>
  <div className="vx-hero-swipe-track" ref={track} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onClick={onTap}>
   {slides.map((id,position)=><div className="vx-hero-swipe-slide" data-photo-id={String(id)} key={position+'-'+id}>
    <Photo id={id} alt={position===1?name:''} priority={position===1} resolution={960} placeholder={placeholders?.[String(id)]}/>
   </div>)}
  </div>
 </div>;
});
