import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CatalogueIcon} from './OnboardingOptions.jsx';
import './InterestReveal.css';

// The feed renders three chips and a compact +N entry. The sheet is real DOM:
// swipe its handle down, tap the backdrop/close, or press Escape to dismiss it.
export function InterestReveal({items=[],preview=false,maxVisible=4,feed=false}){
 const [open,setOpen]=useState(false);
 const [dragY,setDragY]=useState(0);
 const start=useRef(null),closeRef=useRef(null),triggerRef=useRef(null),rowRef=useRef(null);
 const [visible,setVisible]=useState(maxVisible);
 const widthItems=items.join('|');
 useLayoutEffect(()=>{
  if(!feed&&!preview){setVisible(maxVisible);return}
  const el=rowRef.current;if(!el)return;
  const ctx=document.createElement('canvas').getContext('2d');
  const measure=()=>{
   const width=el.getBoundingClientRect().width;if(width<50)return;
   if(ctx)ctx.font='700 11px Nunito, Arial, sans-serif';
   const tw=val=>ctx?ctx.measureText(val).width:val.length*7;
   let used=0,count=0;
   for(let i=0;i<items.length;i++){
    const chip=Math.ceil(tw(items[i])+14+5+20+4),rest=items.length-i-1;
    const reserve=rest?Math.ceil(tw('+'+rest+' ещё')+25)+5:0;
    if(used+chip+(count?5:0)+reserve>width)break;
    used+=chip+(count?5:0);count++;
   }
   setVisible(old=>old===count?old:count);
  };
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;ro?.observe(el);measure();return()=>ro?.disconnect();
 },[widthItems,feed,preview,maxVisible]);
 useEffect(()=>{
  if(!open)return;
  const key=e=>{if(e.key==='Escape')setOpen(false)};
  window.addEventListener('keydown',key);
  closeRef.current?.focus({preventScroll:true});
  return()=>{window.removeEventListener('keydown',key);triggerRef.current?.focus({preventScroll:true})};
 },[open]);
 if(!items.length)return null;
 const close=()=>{setOpen(false);setDragY(0);start.current=null};
 const beginDrag=e=>{
  if(e.button!==0&&e.pointerType==='mouse')return;
  start.current={id:e.pointerId,y:e.clientY};
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
 };
 const moveDrag=e=>{
  if(start.current?.id!==e.pointerId)return;
  setDragY(Math.min(420,Math.max(0,e.clientY-start.current.y)));
 };
 const finishDrag=e=>{
  if(start.current?.id!==e.pointerId)return;
  start.current=null;
  if(dragY>82)close();
  else setDragY(0);
 };
 return <>
  <div ref={rowRef} className={'veyra-interest-inline '+(preview?'preview-card-chips':'')+(feed?' vx-feed-interest-row':'')} aria-label="Интересы">
   {items.slice(0,(feed||preview)?visible:maxVisible).map(label=><span key={label} className="veyra-interest-inline-chip"><CatalogueIcon value={label} size={14}/><span className="vx-interest-chip-label">{label}</span></span>)}
   {items.length>((feed||preview)?visible:maxVisible)&&<button ref={triggerRef} type="button" className="veyra-interest-more"
    onClick={e=>{e.stopPropagation();setDragY(0);setOpen(true)}}
    aria-label={'Показать все интересы, ещё '+(items.length-((feed||preview)?visible:maxVisible))} aria-haspopup="dialog">
    +{items.length-((feed||preview)?visible:maxVisible)}{feed?'':' ещё'}
   </button>}
  </div>
  {open&&createPortal(
   <div className={'veyra-interests-overlay'+(feed?' vx-feed-interests-overlay':'')} role="presentation" onClick={e=>{e.stopPropagation();close()}}>
    <section className="veyra-interests-sheet" role="dialog" aria-modal="true" aria-label="Все интересы"
     style={feed?{'--vx-sheet-drag':dragY+'px'}:undefined} onClick={e=>e.stopPropagation()}>
     {feed&&<div className="vx-feed-sheet-drag-area"
       onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={finishDrag}
       onPointerCancel={finishDrag} aria-label="Потяните вниз, чтобы закрыть">
       <span className="vx-feed-sheet-handle"/>
      </div>}
     <header><strong>{feed?'Все интересы':'Увлечения'}</strong>
      <button ref={closeRef} type="button" onClick={close} aria-label="Закрыть интересы">×</button>
     </header>
     <div className="veyra-interests-sheet-list">
      {items.map(label=><span key={label}><CatalogueIcon value={label} size={17}/>{label}</span>)}
     </div>
    </section>
   </div>,document.body)}
 </>;
}
