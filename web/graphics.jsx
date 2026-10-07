import React from 'react';
export const graphicRoot='/graphics';
export function Artwork({name,className='',size=180}){
 return <img className={'artwork '+className} src={`${graphicRoot}/illustrations/${name}-512.webp`} width={size} height={size} alt="" decoding="async" draggable={false}/>;
}
export function Brand({large=false,animated=false}){
 return <div className={`brand approved-brand ${large?'large':''} ${animated?'brand-animated':''}`}><img src={`${graphicRoot}/brand/veyra-approved-${large?'512':'256'}.webp`} width={large?240:72} height={large?240:72} alt="VEYRA" fetchPriority="high"/>{animated&&<span className="brand-glint" aria-hidden="true"/>}</div>;
}
export function UIIcon({name,size=24,...props}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="veyra-icon" aria-hidden="true" {...props}><use href={`${graphicRoot}/icons/veyra-icons.sprite.svg#veyra-icon-${name}`}/></svg>;
}
