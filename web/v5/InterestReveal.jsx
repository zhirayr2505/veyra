import React,{useState} from 'react';
import {CatalogueIcon} from './OnboardingOptions.jsx';
import './InterestReveal.css';
export function InterestReveal({items=[],preview=false}){
 const [open,setOpen]=useState(false);if(!items.length)return null;
 return <><div className={'veyra-interest-inline '+(preview?'preview-card-chips':'')} aria-label="Интересы">
  {items.slice(0,4).map(label=><span key={label} className="veyra-interest-inline-chip"><CatalogueIcon value={label} size={14}/>{label}</span>)}
  {items.length>4&&<button type="button" className="veyra-interest-more" onClick={e=>{e.stopPropagation();setOpen(true)}} aria-label={'Ещё '+(items.length-4)+' интересов'}>+{items.length-4} ещё</button>}
 </div>
 {open&&<div className="veyra-interests-overlay" role="presentation" onClick={e=>{e.stopPropagation();setOpen(false)}}><section className="veyra-interests-sheet" role="dialog" aria-modal="true" aria-label="Интересы человека" onClick={e=>e.stopPropagation()}><header><strong>Увлечения</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Закрыть интересы">✕</button></header><div className="veyra-interests-sheet-list">{items.map(label=><span key={label}><CatalogueIcon value={label} size={17}/>{label}</span>)}</div></section></div>}
 </>;
}
