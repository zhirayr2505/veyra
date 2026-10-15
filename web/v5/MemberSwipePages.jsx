import React,{useCallback,useEffect,useLayoutEffect,useRef} from 'react';
import useEmblaCarousel from 'embla-carousel-react';

// Embla locks horizontal intent after ~10px; the browser owns vertical pan-y.
// Keep all four panels mounted. Embla owns the track transform and preserves
// finger-following motion; no React renders are required during a drag.
export const MemberSwipePages=React.memo(function MemberSwipePages({tabs,active,onChange,onProgress,carouselApiRef,children}){
 const [viewportRef,embla]=useEmblaCarousel({
  axis:'x',loop:false,align:'start',containScroll:false,
  dragFree:false,duration:22,dragThreshold:10,
  watchDrag:(_api,event)=>{
   // The photo grid is interactive but horizontal drags must reach Embla.
   if(event.target?.closest?.('.vx-profile-photos-grid'))return true;
   return !event.target?.closest?.('button,a,input,textarea,select,[role="button"],.photo-gallery-mini');
  }
 });
 const viewportElement=useRef(null);
 const attachViewport=useCallback(node=>{viewportElement.current=node;viewportRef(node)},[viewportRef]);
 // Embla keeps all panels mounted. Its natural track height is the tallest tab;
 // only the selected panel should define document scroll height.
 useLayoutEffect(()=>{
  const viewport=viewportElement.current;
  if(!viewport)return;
  const panel=Array.from(viewport.querySelectorAll('.vx-profile-swipe-page')).find(x=>x.getAttribute('aria-label')===tabs.find(([key])=>key===active)?.[1]);
  if(!panel)return;
  const measure=()=>{if(viewport.isConnected)viewport.style.height=Math.ceil(panel.getBoundingClientRect().height)+'px'};
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  ro?.observe(panel);measure();
  return()=>{ro?.disconnect()};
 },[active]);
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
 return <div ref={attachViewport} className="vx-profile-swipe-viewport" aria-label="Разделы анкеты">
  <div className="vx-profile-swipe-track">
   {tabs.map(([key,label])=><section key={key} className="vx-profile-swipe-page"
      role="tabpanel" id={'vx-profile-panel-'+key}
      aria-label={label} aria-hidden={active!==key} inert={active!==key}>
      {children(key)}
    </section>)}
  </div>
 </div>;
});
