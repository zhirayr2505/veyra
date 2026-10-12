import React from 'react';
import './GoalIllustration.css';
/* Crisp Veyra crystal illustration drawn as brand artwork, animated in CSS. */
export function GoalIllustration(){return <div className="veyra-goal-jewel" aria-hidden="true">
<svg viewBox="0 0 330 250" className="veyra-goal-jewel-svg" xmlns="http://www.w3.org/2000/svg" focusable="false">
<defs>
 <radialGradient id="vj-glow"><stop stopColor="#C69BFF" stopOpacity=".7"/><stop offset="1" stopColor="#DEC3FF" stopOpacity="0"/></radialGradient>
 <linearGradient id="vj-shell" x1="72" y1="25" x2="260" y2="225" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF8FF"/><stop offset=".34" stopColor="#F6D9FF"/><stop offset=".68" stopColor="#CEAAFF"/><stop offset="1" stopColor="#ECDAFF"/></linearGradient>
 <linearGradient id="vj-heart" x1="101" y1="62" x2="231" y2="188" gradientUnits="userSpaceOnUse"><stop stopColor="#F5BEFF"/><stop offset=".37" stopColor="#A64AF6"/><stop offset=".75" stopColor="#6324F2"/><stop offset="1" stopColor="#CE8FFF"/></linearGradient>
 <linearGradient id="vj-ring" x1="20" y1="210" x2="305" y2="25" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".28" stopColor="#FFF"/><stop offset=".62" stopColor="#D9B9FF"/><stop offset="1" stopColor="#FFFFFF" stopOpacity=".18"/></linearGradient>
 <filter id="vj-shadow" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="13"/></filter>
</defs>
<ellipse cx="165" cy="126" rx="153" ry="112" fill="url(#vj-glow)" opacity=".68"/>
<g className="vj-float">
 <ellipse cx="163" cy="145" rx="104" ry="37" fill="#8D52EF" opacity=".15" filter="url(#vj-shadow)"/>
 <rect x="75" y="31" width="177" height="176" rx="65" transform="rotate(-9 75 31)" fill="url(#vj-shell)" stroke="#FFF" strokeWidth="3"/>
 <path d="M98 92C107 46 151 39 178 47" fill="none" stroke="white" strokeOpacity=".72" strokeWidth="7" strokeLinecap="round"/>
 <path className="vj-heart" d="M165 177L110 126C82 96 115 66 142 78C154 83 160 93 165 99C186 65 226 72 234 102C241 129 195 157 165 177Z" fill="url(#vj-heart)" stroke="#FFF3FF" strokeWidth="3" strokeLinejoin="round"/>
 <path d="M165 164L119 120C101 103 116 83 134 87" fill="none" stroke="#FFF" strokeOpacity=".48" strokeWidth="5" strokeLinecap="round"/>
 <ellipse className="vj-ring" cx="164" cy="128" rx="146" ry="42" transform="rotate(-20 164 128)" fill="none" stroke="url(#vj-ring)" strokeWidth="3"/>
 <ellipse cx="164" cy="128" rx="145" ry="40" transform="rotate(-20 164 128)" fill="none" stroke="#FFF" strokeOpacity=".18" strokeWidth="6"/>
</g>
<g className="vj-sparkles" fill="#A16AFA">
 <path d="M55 44Q59 60 75 64Q59 68 55 84Q51 68 35 64Q51 60 55 44Z"/>
 <path d="M282 129Q287 149 307 153Q287 157 282 177Q277 157 257 153Q277 149 282 129Z"/>
 <circle cx="280" cy="65" r="7" fill="#D8B5FC"/><circle cx="42" cy="182" r="5" fill="#8E5AEC"/>
 <path d="M250 40C250 28 265 28 269 39C276 28 288 33 285 45C282 55 270 60 268 64C259 55 250 48 250 40Z" fill="#BA72FA"/>
</g>
</svg></div>}