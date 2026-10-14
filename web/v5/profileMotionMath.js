// VEYRA Stage 2: fixed portrait canvas, uniform transform, discrete mask.
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(t)=>{const x=clamp(t);return x*x*(3-2*x)};
export const segment=(p,a,b)=>smooth((p-a)/(b-a));
export const PROFILE_CIRCLE_AT=.34;
export const PROFILE_CENTER_AT=.46;
export const profileMaskDiameter=(width,height)=>Math.min(180,Math.max(140,width*.46),Math.max(140,height*.52));
export function profileFrame(progress,width,height,compactHeight=292){
 const p=clamp(progress),w=Math.max(1,width),h=Math.max(1,height);
 const maskDiameter=profileMaskDiameter(w,h),maskTop=h*.36-maskDiameter/2;
 const circle=p>=PROFILE_CIRCLE_AT;
 const formation=segment(p,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT);
 const docking=segment(p,PROFILE_CENTER_AT,1);
 const coverY=-16*segment(p,0,PROFILE_CIRCLE_AT);
 // The unmodified WxH photo is revealed through a face-sized circle.
 const midWidth=maskDiameter*.94;
 const photoW=!circle?w:p<PROFILE_CENTER_AT?mix(maskDiameter,midWidth,formation):mix(midWidth,98,docking);
 const photoX=!circle?0:p<PROFILE_CENTER_AT?(w-photoW)/2:mix((w-midWidth)/2,16,docking);
 const photoY=!circle?coverY:p<PROFILE_CENTER_AT?mix(maskTop-16,82,formation):mix(82,102,docking);
 const heroScale=circle?photoW/maskDiameter:1;
 const heroX=circle?photoX-(w/2-maskDiameter/2)*heroScale:0;
 const heroY=circle?photoY-maskTop*heroScale:coverY;
 const sheetY=mix(h-30,109,smooth(clamp(p/.78)));
 const railY=mix(h+218,compactHeight,p);
 const panelClipBottom=Math.max(0,284-Math.max(0,railY-sheetY));
 return {
  progress:p,stage:!circle?'sheet':p<PROFILE_CENTER_AT?'center':'avatar',
  x:photoX,y:photoY,width:photoW,height:circle?photoW:h,radius:circle?50:0,
  heroX,heroY,heroScale,maskDiameter,
  sheetY,panelClipBottom,
  nameX:110*segment(p,.30,.89),
  nameY:mix(h+9,116,smooth(p)),
  nameOpacity:1-segment(p,.17,.29)+segment(p,.94,1),
  actionY:mix(h+123,222,smooth(clamp(p/.88))),
  moreY:mix(h+8,113,smooth(p)),
  photoExtrasOpacity:1-segment(p,.20,.33),
  goalX:0,goalY:0,compactHeight
 };
}
