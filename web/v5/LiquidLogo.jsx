import React from 'react';
import './LiquidLogo.css';

/** Approved VEYRA lettering. The SVG is a *fixed* alpha mask; only the
 * inner color layers move on the compositor. No procedural SVG effects. */
export function LiquidLogo({width=131,className='',tone='light',ready=true,paused=false}){
 const value=tone==='dark'?'dark':tone==='adaptive'?'adaptive':'light';
 return <span role="img" aria-label="VEYRA" className={'logo vx-liquid-logo '+className}
  style={{width}} data-tone={value} data-ready={ready?'true':'false'} data-paused={paused?'true':'false'}>
  <img className="vx-liquid-logo-fallback" src="/veyra-design/veyra-wordmark-purple.svg" alt="" draggable="false"/>
  <span className="vx-liquid-logo-rim vx-liquid-logo-rim-light" aria-hidden="true"/>
  <span className="vx-liquid-logo-rim vx-liquid-logo-rim-dark" aria-hidden="true"/>
  <span className="vx-liquid-logo-letter-mask" aria-hidden="true">
   <span className="vx-liquid-logo-base"/>
   <span className="vx-liquid-logo-flow"/>
   <span className="vx-liquid-logo-refraction"/>
   <span className="vx-liquid-logo-sheen"/>
   <span className="vx-liquid-logo-ink"/>
  </span>
 </span>;
}
