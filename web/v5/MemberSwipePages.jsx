import React,{useCallback,useEffect,useRef} from 'react';
import useEmblaCarousel from 'embla-carousel-react';

// Keep all four panels mounted. Embla owns the track transform and preserves
// finger-following motion; no React renders are required during a drag.
export function MemberSwipePages({tabs,active,onChange,onProgress,carouselApiRef,children}){
 const [viewportRef,embla]=useEmblaCarousel({
  axis:'x',loop:false,align:'start',containScroll:false,
  dragFree:false,duration:24,
  watchDrag:(_api,event)=>!event.target?.closest?.('button,a,input,textarea,select,[role="button"],.photo-gallery-mini')
 });
 const selected=useRef(active);
 selected.current=active;
 const keys=tabs.map(([key])=>key).join('|');
 const sync=useCallback(api=>{
  if(!api)return;
  const count=api.scrollSnapList().length;
  const position=Math.max(0,Math.min(count-1,(api.scrollProgress()||0)*Math.max(0,count-1)));
  onProgress?.(position);
 },[onProgress]);
 const select=useCallback(api=>{
  if(!api)return;
  sync(api);
  const next=tabs[api.selectedScrollSnap()]?.[0];
  if(next && next!==selected.current)onChange(next);
 },[keys,onChange,sync]);
 useEffect(()=>{
  if(!embla)return;
  carouselApiRef.current=embla;
  embla.on('scroll',sync);
  embla.on('select',select);
  embla.on('reInit',sync);
  sync(embla);
  return()=>{
   embla.off('scroll',sync);
   embla.off('select',select);
   embla.off('reInit',sync);
   if(carouselApiRef.current===embla)carouselApiRef.current=null;
  };
 },[embla,carouselApiRef,sync,select]);
 useEffect(()=>{
  if(!embla)return;
  const index=tabs.findIndex(([key])=>key===active);
  if(index>=0&&index!==embla.selectedScrollSnap())embla.scrollTo(index);
 },[embla,active,keys]);
 return <div ref={viewportRef} className="vx-profile-swipe-viewport" aria-label="Разделы анкеты">
  <div className="vx-profile-swipe-track">
   {tabs.map(([key,label])=><section key={key} className="vx-profile-swipe-page"
      role="tabpanel" id={'vx-profile-panel-'+key}
      aria-label={label} aria-hidden={active!==key} inert={active!==key}>
      {children(key)}
    </section>)}
  </div>
 </div>;
}
