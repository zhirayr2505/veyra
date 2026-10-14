import React from 'react';
import './PhotoSegments.css';

/** Small compositor-safe portrait/gallery indicator; swipe progress can be supplied as 0..1. */
export function PhotoSegments({count=0,index=0,className='',progress=1}){
 if(count<2)return null;
 const current=Math.max(0,Math.min(count-1,index));
 return <div className={'veyra-photo-segments '+className} role="img" aria-label={'Фото '+(current+1)+' из '+count}>
  {Array.from({length:count},(_,i)=><span key={i} className={'veyra-photo-segment'+(i===current?' active':'')} aria-hidden="true">
   <span className="veyra-photo-segment-fill" style={i===current?{'--veyra-photo-progress':Math.max(0,Math.min(1,progress))}:undefined}/>
  </span>)}
 </div>;
}
