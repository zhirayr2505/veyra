import React,{useCallback,useEffect,useRef} from 'react';
// Telegram-like carousel: every tab stays mounted during the drag so its content
// physically follows the finger; only one React state commit on release.
export function MemberSwipePages({tabs,active,onChange,children}){
 const viewport=useRef(null),track=useRef(null),gesture=useRef(null);
 const index=Math.max(0,tabs.findIndex(([key])=>key===active));
 const translate=useCallback((dx,dragging)=>{
  const el=track.current;if(!el)return;
  el.style.setProperty('--vx-swipe-delta',dx+'px');
  el.classList.toggle('is-dragging',dragging);
 },[]);
 useEffect(()=>{translate(0,false)},[active,translate]);
 const start=e=>{
  if(e.touches.length!==1)return;
  if(e.target.closest('button,a,input,textarea,select,[role=button],.photo-gallery-mini'))return;
  gesture.current={x:e.touches[0].clientX,y:e.touches[0].clientY,time:performance.now(),dx:0,width:viewport.current?.clientWidth||360,axis:null};
 };
 const move=e=>{
  const g=gesture.current;if(!g||e.touches.length!==1)return;
  const dx=e.touches[0].clientX-g.x,dy=e.touches[0].clientY-g.y;
  if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9)g.axis=Math.abs(dx)>Math.abs(dy)*1.05?'x':'y';
  if(g.axis!=='x')return;
  const isEdge=dx>0&&index===0||dx<0&&index===tabs.length-1;
  g.dx=isEdge?dx*.22:dx;
  translate(g.dx,true);
 };
 const end=e=>{
  const g=gesture.current;gesture.current=null;if(!g||g.axis!=='x')return;
  const delta=e.changedTouches?.[0]?.clientX-g.x??g.dx;
  const elapsed=Math.max(1,performance.now()-g.time);
  const velocity=Math.abs(delta/elapsed);
  const crossing=Math.abs(delta)>Math.min(58,g.width*.13)||(Math.abs(delta)>22&&velocity>.35);
  const next=Math.max(0,Math.min(tabs.length-1,index+(delta<0?1:-1)));
  if(crossing&&next!==index){onChange(tabs[next][0]);}
  // Release triggers one smoothly easing CSS transition, never replaces a page.
  translate(0,false);
 };
 return <div ref={viewport} className="vx-profile-swipe-viewport"
   onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
   <div ref={track} className="vx-profile-swipe-track" style={{'--vx-page-shift':(-index*100)+'%','--vx-swipe-delta':'0px'}}>
    {tabs.map(([key,label])=><section key={key} className="vx-profile-swipe-page" role="tabpanel"
      id={'vx-profile-panel-'+key} aria-label={label} aria-hidden={active!==key} inert={active!==key?true:undefined}>
      {children(key)}
    </section>)}
   </div>
 </div>;
}
