import React,{useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Photo,Icon} from './UI.jsx';
import {CountryFlag} from './CountryFlag.jsx';
import {goalTitle} from './OnboardingOptions.jsx';
import './MemberPhotoMorph.css';

const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;

/**
 * A single actual photo DOM node is rendered in a body portal. Its size, position,
 * and border radius follow the scroll gesture (not a boolean sticky threshold).
 *
 * Phase A: full rounded cover -> centered circle.
 * Phase B: centered circle -> small left-side circle + name/city/goal on its right.
 *
 * The original cover rectangle only reserves document layout; it does NOT contain
 * a second image. On reversing the scroll we animate the same image back home.
 */
export function MemberPhotoMorph({stageRef,headerRef,person,index,onIndex,onGallery,visible=true}){
 const frameRef=useRef(null),textRef=useRef(null),controlsRef=useRef(null);
 const startX=useRef(null),baseline=useRef(null),swiped=useRef(false),swipeTimer=useRef(null);
 const photos=person.photos||[];
 const hasGallery=photos.length>1;

 useLayoutEffect(()=>{
  if(!visible)return;
  const frame=frameRef.current,copy=textRef.current,controls=controlsRef.current;
  if(!frame||!copy||!stageRef.current)return;
  let raf=0;
  baseline.current=null;
  const paint=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const stage=stageRef.current;if(!stage)return;
    const rect=stage.getBoundingClientRect();
    const scrollRoot=stage.closest('.subscreen');
    const scrollOffset=Math.max(0,window.scrollY||0,document.scrollingElement?.scrollTop||0,scrollRoot?.scrollTop||0);
    const stageMoved=baseline.current?baseline.current.top-rect.top:0;
    // Initial photo geometry may settle during image/font loading. While at the
    // top of the profile, recapture the expanded rectangle instead of starting
    // an animation from a stale viewport position.
    if(!baseline.current){
     // Gallery close can remount us while already scrolled deeply. Recover the
     // expanded cover's original viewport position from the current scroll.
     baseline.current={top:rect.top+scrollOffset,left:rect.left,width:rect.width,height:rect.height};
    }else if(scrollOffset<2&&Math.abs(stageMoved)<80){
     baseline.current={top:rect.top,left:rect.left,width:rect.width,height:rect.height};
    }
    const origin=baseline.current;
    const moved=scrollOffset<2&&Math.abs(origin.top-rect.top)<80?0:Math.max(scrollOffset,origin.top-rect.top);
    const collapseDistance=clamp(origin.height-20,290,465);
    const phase1=clamp(moved/collapseDistance);
    const phase2=clamp((moved-collapseDistance)/135);

    const vw=document.documentElement.clientWidth||window.innerWidth;
    const topBar=headerRef.current?.getBoundingClientRect();
    const centerSize=110;
    const centerLeft=(vw-centerSize)/2;
    const centerTop=Math.max(106,(topBar?.bottom||85)+19);
    const finalSize=58;
    const finalLeft=Math.max(17,((vw-Math.min(vw,640))/2)+18);
    const finalTop=centerTop+9;
    const x=lerp(lerp(origin.left,centerLeft,phase1),finalLeft,phase2);
    const y=lerp(lerp(origin.top,centerTop,phase1),finalTop,phase2);
    const w=lerp(lerp(origin.width,centerSize,phase1),finalSize,phase2);
    const h=lerp(lerp(origin.height,centerSize,phase1),finalSize,phase2);
    const radius=lerp(lerp(34,centerSize/2,phase1),finalSize/2,phase2);
    frame.style.left=x.toFixed(2)+'px';
    frame.style.top=y.toFixed(2)+'px';
    frame.style.width=w.toFixed(2)+'px';
    frame.style.height=h.toFixed(2)+'px';
    frame.style.borderRadius=radius.toFixed(2)+'px';
    frame.style.borderWidth=(3*phase2).toFixed(2)+'px';
    frame.style.setProperty('--vx-morph-ui-opacity',String(1-clamp(moved/95)));
    frame.dataset.phase=phase2>=.995?'compact':phase1>=.995?'center':'expanded';

    // These are controls on the same single-photo surface, not another image.
    if(controls)controls.style.pointerEvents=moved<28?'auto':'none';
    const available=vw-finalLeft-finalSize-30;
    copy.style.left=(finalLeft+finalSize+13).toFixed(2)+'px';
    copy.style.top=(finalTop+3).toFixed(2)+'px';
    copy.style.width=Math.max(98,available).toFixed(2)+'px';
    copy.style.opacity=phase2.toFixed(3);
    copy.style.transform='translate3d(0,'+(16*(1-phase2)).toFixed(2)+'px,0)';
    copy.style.visibility=phase2>.015?'visible':'hidden';
    copy.setAttribute('aria-hidden',phase2>.9?'false':'true');
   });
  };
  paint();
  const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{baseline.current=null;paint()}):null;
  resizeObserver?.observe(stageRef.current);
  window.addEventListener('scroll',paint,{passive:true,capture:true});
  document.addEventListener('scroll',paint,{passive:true,capture:true});
  window.addEventListener('resize',paint,{passive:true});
  window.visualViewport?.addEventListener('resize',paint,{passive:true});
  return()=>{
   cancelAnimationFrame(raf);clearTimeout(swipeTimer.current);resizeObserver?.disconnect();
   window.removeEventListener('scroll',paint,true);
   document.removeEventListener('scroll',paint,true);
   window.removeEventListener('resize',paint);
   window.visualViewport?.removeEventListener('resize',paint);
  };
 },[person.id,visible,stageRef,headerRef]);

 if(!visible)return null;
 const select=i=>onIndex?.(i);
 const previous=()=>select((index+photos.length-1)%photos.length);
 const next=()=>select((index+1)%photos.length);
 return createPortal(<React.Fragment>
   <div className="vx-member-morph-frame" ref={frameRef} data-phase="expanded"
    onTouchStart={e=>{startX.current=e.touches[0]?.clientX??null}}
    onTouchEnd={e=>{if(startX.current===null)return;const dx=e.changedTouches[0].clientX-startX.current;startX.current=null;if(Math.abs(dx)>45&&hasGallery){swiped.current=true;(dx<0?next:previous)();clearTimeout(swipeTimer.current);swipeTimer.current=setTimeout(()=>{swiped.current=false},230)}}}>
    <Photo className="vx-member-morph-image" id={photos[index]} alt={person.name} onClick={()=>{if(!swiped.current)onGallery?.()}}/>
    {hasGallery&&<div className="vx-member-morph-controls" ref={controlsRef}>
     <div className="vx-member-morph-bars">{photos.map((p,i)=><button type="button" key={p} className={i===index?'active':''} aria-label={'Фото '+(i+1)} onClick={()=>select(i)}/>)}</div>
     <button className="vx-member-morph-previous" type="button" aria-label="Предыдущее фото" onClick={previous}>‹</button>
     <button className="vx-member-morph-next" type="button" aria-label="Следующее фото" onClick={next}>›</button>
     <div className="vx-member-morph-thumbnails">{photos.slice(0,7).map((p,i)=><button key={p} type="button" className={i===index?'selected':''} onClick={()=>select(i)} aria-label={'Выбрать фото '+(i+1)}><Photo id={p} alt=""/></button>)}</div>
    </div>}
   </div>
   <div className="vx-member-morph-text" ref={textRef} aria-hidden="true">
    <strong>{person.name}, {person.age}</strong>
    <small><CountryFlag country={person.country}/> {person.city}</small>
    {person.goal&&<em>{goalTitle(person.goal)}</em>}
   </div>
  </React.Fragment>,document.body);
}
