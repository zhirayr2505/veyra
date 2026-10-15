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
   // Allow a swipe to begin on a profile-section edit button. Embla only
   // takes over after 10px horizontal intent; a tap still activates editing.
   // Text-entry widgets, links and the gallery are separate gesture domains.
   return !event.target?.closest?.('a,input,textarea,select,[contenteditable],.photo-gallery-mini');
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
  const measure=()=>{
   if(!viewport.isConnected)return;
   const nextHeight=Math.ceil(panel.getBoundingClientRect().height);
   if(Math.abs(viewport.offsetHeight-nextHeight)>.5)viewport.style.height=nextHeight+'px';
   // Keep vertical position independent of Embla tab selection. Forcing a
   // scrollTop write during a ResizeObserver measurement makes gallery tiles
   // move under the finger/Playwright click while their images decode.
   // The browser itself clamps scrollTop when content becomes shorter.
  };
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
