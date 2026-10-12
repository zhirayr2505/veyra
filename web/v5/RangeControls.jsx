import React from 'react';
import './RangeControls.css';
const pct=(value,min,max)=>Math.max(0,Math.min(100,((value-min)/(max-min))*100));
export function BrandedSlider({min=0,max=100,step=1,value=0,ariaLabel='Значение',disabled=false,onChange}){
 return <div className="vy-range" style={{'--vy-start':'0%','--vy-end':pct(value,min,max)+'%'}}>
   <div className="vy-range-track" aria-hidden="true"><i/></div>
   <input aria-label={ariaLabel} min={min} max={max} step={step} type="range" disabled={disabled} value={value} onChange={e=>onChange(Number(e.target.value))}/>
  </div>;
}
export function BrandedDualSlider({min=18,max=90,lower,upper,onChange}){
 const low=Math.max(min,Math.min(max,lower)),high=Math.max(low,Math.min(max,upper));
 return <div className="vy-range vy-range-dual" style={{'--vy-start':pct(low,min,max)+'%','--vy-end':pct(high,min,max)+'%'}}>
   <div className="vy-range-track" aria-hidden="true"><i/></div>
   <input className={'vy-range-lower '+(low>=high-1?'vy-range-front':'')} aria-label="Возраст от" type="range" min={min} max={max} value={low} step="1" onChange={e=>onChange(Math.min(Number(e.target.value),high),high)}/>
   <input className="vy-range-upper" aria-label="Возраст до" type="range" min={min} max={max} value={high} step="1" onChange={e=>onChange(low,Math.max(Number(e.target.value),low))}/>
  </div>;
}
