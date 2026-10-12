import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import {CatalogueIcon} from './OnboardingOptions.jsx';
import './InterestReveal.css';
export function InterestReveal({items=[],preview=false,maxVisible=4}){
 const [open,setOpen]=useState(false);if(!items.length)return null;
 return <><div className={'veyra-interest-inline '+(preview?'preview-card-chips':'')} aria-label="Интересы">
  {items.slice(0,maxVisible).map(label=><span key={label} className="veyra-interest-inline-chip"><CatalogueIcon value={label} size={14}/>{label}</span>)}
  {items.length>maxVisible&&<button type="button" className="veyra-interest-more" onClick={e=>{e.stopPropagation();setOpen(true)}} aria-label={'Ещё '+(items.length-maxVisible)+' интересов'}>+{items.length-maxVisible} ещё</button>}
 </div>
 {open&&createPortal(<div className="veyra-interests-overlay" role="presentation" onClick={e=>{e.stopPropagation();setOpen(false)}}><section className="veyra-interests-sheet" role="dialog" aria-modal="true" aria-label="Интересы человека" onClick={e=>e.stopPropagation()}><header><strong>Увлечения</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Закрыть интересы">✕</button></header><div className="veyra-interests-sheet-list">{items.map(label=><span key={label}><CatalogueIcon value={label} size={17}/>{label}</span>)}</div></section></div>,document.body)}
 </>;
}
