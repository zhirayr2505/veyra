import React from 'react';
import './GoalIllustration.css';
export function GoalIllustration(){return <div className="veyra-goal-jewel" aria-hidden="true">
<svg viewBox="0 0 400 290" className="veyra-goal-jewel-svg" xmlns="http://www.w3.org/2000/svg" focusable="false">
 <defs>
  <radialGradient id="goal-glow"><stop stopColor="#BD82FF" stopOpacity=".48"/><stop offset=".57" stopColor="#E1BAFF" stopOpacity=".2"/><stop offset="1" stopColor="#F5EEFF" stopOpacity="0"/></radialGradient>
  <linearGradient id="goal-shell" x1="104" x2="284" y1="44" y2="248" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF"/><stop offset=".31" stopColor="#FEF8FF"/><stop offset=".6" stopColor="#F1D9FF"/><stop offset=".86" stopColor="#DFBBFF"/><stop offset="1" stopColor="#F9EFFF"/></linearGradient>
  <linearGradient id="goal-inner" x1="124" x2="278" y1="44" y2="252" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" stopOpacity=".7"/><stop offset=".47" stopColor="#F6DDFE" stopOpacity=".5"/><stop offset="1" stopColor="#BB86F7" stopOpacity=".35"/></linearGradient>
  <linearGradient id="goal-heart" x1="156" x2="237" y1="85" y2="207" gradientUnits="userSpaceOnUse"><stop stopColor="#FACDFF"/><stop offset=".17" stopColor="#CB79FB"/><stop offset=".48" stopColor="#9346F9"/><stop offset=".78" stopColor="#7B26E6"/><stop offset="1" stopColor="#C377F9"/></linearGradient>
  <linearGradient id="goal-orbit" x1="20" x2="378" y1="238" y2="55" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".14" stopColor="#F8EAFF"/><stop offset=".43" stopColor="#FFFFFF"/><stop offset=".68" stopColor="#CEACFF"/><stop offset=".95" stopColor="#FFFFFF"/><stop offset="1" stopColor="#FFFFFF" stopOpacity=".1"/></linearGradient>
  <radialGradient id="goal-pearl"><stop stopColor="#F3D5FF"/><stop offset=".47" stopColor="#BF7FFC"/><stop offset="1" stopColor="#8547E7"/></radialGradient>
  <filter id="goal-blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="15"/></filter>
 </defs>
 <ellipse cx="199" cy="150" rx="186" ry="124" fill="url(#goal-glow)" className="goal-light"/>
 <ellipse cx="200" cy="239" rx="94" ry="16" fill="#9652F4" opacity=".14" filter="url(#goal-blur)"/>
 <g className="goal-orbit-motion">
  <ellipse cx="200" cy="145" rx="176" ry="51" transform="rotate(-20 200 145)" fill="none" stroke="#DBBDFF" strokeWidth="11" opacity=".2" filter="url(#goal-blur)"/>
  <ellipse cx="200" cy="145" rx="176" ry="51" transform="rotate(-20 200 145)" fill="none" stroke="url(#goal-orbit)" strokeWidth="3.5"/>
  <circle cx="45" cy="197" r="12" fill="url(#goal-pearl)"/><circle cx="41" cy="193" r="4" fill="#FFF" opacity=".75"/>
  <circle cx="348" cy="88" r="12" fill="url(#goal-pearl)"/><circle cx="344" cy="84" r="4" fill="#FFF" opacity=".77"/>
 </g>
 <g className="goal-jewel-float">
  <rect x="97" y="38" width="208" height="208" rx="72" transform="rotate(-8 201 142)" fill="url(#goal-shell)" stroke="#FFFFFF" strokeWidth="3"/>
  <rect x="105" y="45" width="190" height="193" rx="68" transform="rotate(-8 200 143)" fill="url(#goal-inner)"/>
  <path d="M129 99 Q142 52 206 51" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" opacity=".85"/>
  <path d="M269 195 Q277 186 283 169" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" opacity=".4"/>
  <image className="goal-real-heart" href="/veyra-library/goal-heart.webp" x="126" y="79" width="148" height="148" preserveAspectRatio="xMidYMid meet" />
 </g>
 <g className="goal-star-field">
  <path d="M57 50Q61 72 83 76Q61 80 57 103Q53 80 30 76Q53 72 57 50Z" fill="#FFFFFF"/>
  <path d="M341 192Q347 215 369 221Q347 226 341 249Q335 226 313 221Q335 215 341 192Z" fill="#FFFFFF"/>
  <path d="M330 22Q333 39 351 42Q333 45 330 62Q327 45 311 42Q327 39 330 22Z" fill="#C491FD"/>
  <path d="M303 37C301 23 315 19 324 31C330 19 346 23 345 38C344 48 331 58 324 63C317 56 304 48 303 37Z" fill="url(#goal-heart)" opacity=".85"/>
  <circle cx="80" cy="245" r="3" fill="#B47CF0"/><circle cx="363" cy="159" r="3" fill="#FFFFFF"/>
 </g>
</svg></div>}
