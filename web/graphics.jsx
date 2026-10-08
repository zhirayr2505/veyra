import React from 'react';
export const graphicRoot='/graphics';
export function Artwork({name,className='',size=180}){
 return <img className={'artwork '+className} src={`${graphicRoot}/illustrations/${name}-512.webp`} width={size} height={size} alt="" decoding="async" draggable={false}/>;
}
export function Brand({large=false,animated=false}){
 return <div className={`brand approved-brand ${large?'large':'brand-horizontal'} ${animated?'brand-animated':''}`} aria-label="VEYRA">{large?<img src={`${graphicRoot}/brand/veyra-approved-512.webp`} width={240} height={240} alt="VEYRA" fetchPriority="high"/>:<><span className="brand-symbol" aria-hidden="true"><img src={`${graphicRoot}/brand/veyra-approved-256.webp`} width={80} height={80} alt="" fetchPriority="high"/></span><span className="brand-wordmark" aria-hidden="true">VEYRA</span></>}{animated&&<span className="brand-glint" aria-hidden="true"/>}</div>;
}
export function SectionHeading({eyebrow,title,body,art}){
 return <header className="section-heading"><div>{eyebrow&&<span className="section-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{body&&<p>{body}</p>}</div>{art&&<Artwork name={art} size={88}/>}</header>;
}
export function UIIcon({name,size=24,...props}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="veyra-icon" aria-hidden="true" {...props}><use href={`${graphicRoot}/icons/veyra-icons.sprite.svg#veyra-icon-${name}`}/></svg>;
}
