// VEYRA Motion 6 — deterministic compositor-safe scroll geometry.
// Sheet first covers ~30% of the full-size cover photo. Only then does the
// picture become a perfect circle; horizontal travel begins AFTER the circle.
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(t)=>{const x=clamp(t);return x*x*(3-2*x)};
export const segment=(p,a,b)=>smooth((p-a)/(b-a));
export const PROFILE_CIRCLE_AT=.34;
export const PROFILE_CENTER_AT=.46;
export function profileFrame(progress,width,height,compactHeight=292){
 const p=clamp(progress),w=Math.max(1,width),h=Math.max(1,height);
 const midW=Math.min(190,Math.max(154,w*.49));
 const midX=(w-midW)/2;
 const cover=p<PROFILE_CIRCLE_AT;
 const centering=segment(p,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT);
 const docking=segment(p,PROFILE_CENTER_AT,1);
 const bumpPhase=clamp((p-PROFILE_CIRCLE_AT)/.115);
 // Linked elastic lift during formation, rather than an extra delayed timer.
 const bump=!cover&&p<PROFILE_CIRCLE_AT+.115?Math.sin(Math.PI*bumpPhase):0;
 const photoW=cover?w:p<PROFILE_CENTER_AT?mix(w,midW,centering):mix(midW,98,docking);
 const photoX=cover?0:p<PROFILE_CENTER_AT?mix(0,midX,centering):mix(midX,16,docking);
 const photoY=cover?mix(0,-16,segment(p,0,PROFILE_CIRCLE_AT)):
  p<PROFILE_CENTER_AT?mix(-16,82,centering)-7*bump:mix(82,102,docking);
 const sheetY=mix(h-30,109,smooth(clamp(p/.78)));
 // Paint the opaque white sheet only up to the sticky tab rail. Any overflow
 // was previously hiding the first ~100px of the gallery below the tabs.
 const railY=mix(h+218,compactHeight,p);
 const panelClipBottom=Math.max(0,284-Math.max(0,railY-sheetY));
 return {
  progress:p,stage:cover?'sheet':p<PROFILE_CENTER_AT?'center':'avatar',
  x:photoX,y:photoY,width:photoW,height:cover?h:photoW,radius:cover?0:50,
  sheetY,panelClipBottom,
  nameX:110*segment(p,.30,.89),
  nameY:mix(h+9,116,smooth(p)),
  // The same accessible name slides invisibly and crossfades at endpoints.
  nameOpacity:1-segment(p,.17,.29)+segment(p,.94,1),
  actionY:mix(h+123,222,smooth(clamp(p/.88))),
  moreY:mix(h+8,113,smooth(p)),
  photoExtrasOpacity:1-segment(p,.20,.33),
  compactOnlineOpacity:segment(p,.82,.99),
  shadeOpacity:1-segment(p,.12,.34),
  goalX:0,goalY:0,compactHeight
 };
}
