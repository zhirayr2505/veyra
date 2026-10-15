import React,{useCallback,useEffect,useRef} from 'react';
import {ChevronLeft,ChevronRight,X} from 'lucide-react';
import {Photo} from './UI.jsx';
import {PhotoSegments} from './PhotoSegments.jsx';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

/** Owns all gallery-only gestures. Does not modify Member scroll/hero transforms. */
export function ProfileGallery({photos,index,onIndex,onClose,name='',placeholders={}}){
 const stageRef=useRef(null),planeRef=useRef(null);
 const state=useRef({pointers:new Map(),scale:1,x:0,y:0,from:null,pinch:null,lastTap:null});
 const onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 const onIndexRef=useRef(onIndex);onIndexRef.current=onIndex;
 const indexRef=useRef(index);indexRef.current=index;
 const photosRef=useRef(photos);photosRef.current=photos;

 const limits=useCallback(scale=>{
  const stage=stageRef.current,photo=planeRef.current?.querySelector('img.photo-sharp');
  if(!stage)return {x:0,y:0};
  const width=stage.clientWidth,height=stage.clientHeight,ratio=photo?.naturalWidth&&photo?.naturalHeight?photo.naturalWidth/photo.naturalHeight:width/height;
  const visibleW=Math.min(width,height*ratio),visibleH=Math.min(height,width/ratio);
  return {x:Math.max(0,(visibleW*scale-width)/2),y:Math.max(0,(visibleH*scale-height)/2)};
 },[]);
 const apply=useCallback((animate=false)=>{
  const s=state.current,plane=planeRef.current;if(!plane)return;
  const bounds=limits(s.scale);
  s.x=clamp(s.x,-bounds.x,bounds.x);s.y=clamp(s.y,-bounds.y,bounds.y);
  plane.style.transition=animate?'transform 220ms cubic-bezier(.2,.8,.2,1)':'none';
  plane.style.transform='translate3d('+s.x.toFixed(2)+'px,'+s.y.toFixed(2)+'px,0) scale('+s.scale.toFixed(4)+')';
  stageRef.current?.setAttribute('data-zoomed',s.scale>1.01?'true':'false');
 },[limits]);
 const reset=useCallback(()=>{
  const s=state.current;s.scale=1;s.x=0;s.y=0;s.from=null;s.pinch=null;s.pointers.clear();apply(true);
 },[apply]);
 useEffect(()=>{reset()},[index,reset]);
 const change=useCallback(delta=>{
  const length=photosRef.current.length;if(length<2)return;
  const next=(indexRef.current+delta+length)%length;
  reset();onIndexRef.current(next);
 },[reset]);
 const close=useCallback(()=>onCloseRef.current?.(),[]);
 useEffect(()=>{
  const key=e=>{
   if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();close()}
   if(e.key==='ArrowRight')change(1);
   if(e.key==='ArrowLeft')change(-1);
  };
  const external=()=>close();
  const pop=()=>close();
  document.addEventListener('keydown',key);
  document.addEventListener('veyra:close-profile-gallery',external);
  // A dedicated browser-history entry lets Android Back close the gallery first.
  const marker='veyra-gallery-'+Date.now();
  window.history.pushState({...window.history.state,veyraGallery:marker},'');
  window.addEventListener('popstate',pop);
  return()=>{
   document.removeEventListener('keydown',key);
   document.removeEventListener('veyra:close-profile-gallery',external);
   window.removeEventListener('popstate',pop);
   if(window.history.state?.veyraGallery===marker)window.history.back();
  };
 },[change,close]);
 const start=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const el=stageRef.current,s=state.current;
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
  s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(s.pointers.size===1){
   s.from={x:e.clientX,y:e.clientY,baseX:s.x,baseY:s.y,at:performance.now()};
   s.pinch=null;
  }else if(s.pointers.size===2){
   const [a,b]=[...s.pointers.values()],mid=midpoint(a,b);
   s.pinch={dist:Math.max(1,distance(a,b)),scale:s.scale,x:s.x,y:s.y,mid};
   s.from=null;
  }
  el?.setAttribute('data-dragging','true');
 };
 const move=e=>{
  const s=state.current;if(!s.pointers.has(e.pointerId))return;
  s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(s.pointers.size>=2&&s.pinch){
   const [a,b]=[...s.pointers.values()],mid=midpoint(a,b),r=stageRef.current?.getBoundingClientRect();
   if(!r)return;
   const nextScale=clamp(s.pinch.scale*distance(a,b)/s.pinch.dist,1,4);
   const originX=s.pinch.mid.x-(r.left+r.width/2),originY=s.pinch.mid.y-(r.top+r.height/2);
   const ratio=nextScale/s.pinch.scale;
   s.x=s.pinch.x+(mid.x-s.pinch.mid.x)+(originX-s.pinch.x)*(1-ratio);
   s.y=s.pinch.y+(mid.y-s.pinch.mid.y)+(originY-s.pinch.y)*(1-ratio);
   s.scale=nextScale;apply();return;
  }
  if(s.pointers.size!==1||!s.from)return;
  if(s.scale>1.01){
   s.x=s.from.baseX+e.clientX-s.from.x;
   s.y=s.from.baseY+e.clientY-s.from.y;
   apply();
  }else{
   const dx=e.clientX-s.from.x;
   const plane=planeRef.current;
   if(plane){plane.style.transition='none';plane.style.transform='translate3d('+(dx*.55).toFixed(2)+'px,0px,0) scale(1)'}
  }
 };
 const end=e=>{
  const s=state.current;if(!s.pointers.has(e.pointerId))return;
  const isPinching=!!s.pinch;
  s.pointers.delete(e.pointerId);
  if(s.pointers.size){
   // Rebase the remaining finger at the current transform, not at pinch start.
   const v=[...s.pointers.values()][0];
   s.from={x:v.x,y:v.y,baseX:s.x,baseY:s.y,at:performance.now()};
   s.pinch=null;return;
  }
  stageRef.current?.removeAttribute('data-dragging');
  if(isPinching){s.pinch=null;s.from=null;apply(true);return}
  const from=s.from;s.from=null;
  if(!from){apply(true);return}
  const dx=e.clientX-from.x,dy=e.clientY-from.y;
  if(s.scale>1.01){apply(true);return}
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.2){change(dx<0?1:-1);return}
  if(dy>125&&Math.abs(dy)>Math.abs(dx)*1.3){close();return}
  const last=s.lastTap,now=performance.now();
  if(Math.abs(dx)<15&&Math.abs(dy)<15&&last&&now-last.at<290&&distance(last,{x:e.clientX,y:e.clientY})<45){
   s.scale=s.scale>1.01?1:2.5;s.x=0;s.y=0;s.lastTap=null;apply(true);
  }else s.lastTap={at:now,x:e.clientX,y:e.clientY};
  apply(true);
 };
 return <div className="gallery vx-profile-gallery vx-gallery-premium" role="dialog" aria-modal="true" aria-label={'Галерея '+name}>
  <button type="button" className="gallery-close vx-gallery-close" aria-label="Закрыть галерею" onClick={close}><X size={24}/></button>
  <div ref={stageRef} className="vx-gallery-stage" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
   <div ref={planeRef} className="vx-gallery-plane"><Photo id={photos[index]} alt={'Фото '+(index+1)+' · '+name} priority resolution={0} placeholder={placeholders?.[String(photos[index])]}/></div>
  </div>
  {photos.length>1&&<>
   <button type="button" className="vx-profile-gallery-prev" aria-label="Предыдущее фото" onClick={()=>change(-1)}><ChevronLeft size={28}/></button>
   <button type="button" className="vx-profile-gallery-next" aria-label="Следующее фото" onClick={()=>change(1)}><ChevronRight size={28}/></button>
  </>}
  <div className="vx-gallery-footer"><PhotoSegments count={photos.length} index={index} className="vx-profile-gallery-bars"/><small className="vx-profile-gallery-counter" aria-live="polite">{index+1}/{photos.length}</small></div>
  <div className="vx-gallery-prefetch" aria-hidden="true">
   {photos.length>1&&[photos[(index+1)%photos.length],photos[(index-1+photos.length)%photos.length]].filter((v,i,a)=>a.indexOf(v)===i).map(id=><Photo key={id} id={id} resolution={640} priority alt="" />)}
  </div>
 </div>;
}
