// VEYRA Stage 2 — one immutable WxH portrait canvas + a discrete round mask.
// All sizes are pixels in the profile scroll viewport; no animated border-radius.
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const mix=(a,b,t)=>a+(b-a)*t;
/** Pure release choice: late finger direction wins over the midpoint of the header. */
export function profileReleaseDirection({samples=[],startY=0,y=0,at=0}){
 const recent=samples.filter(point=>at-point.at<=120);
 if(recent.length>1){
  const first=recent[0],last=recent[recent.length-1];
  const dt=last.at-first.at;
  const velocity=dt>0?(first.finger-last.finger)/dt:0;
  if(Math.abs(velocity)>=.12)return {direction:Math.sign(velocity),velocity};
 }
 const displacement=y-startY;
 if(Math.abs(displacement)>=6)return {direction:Math.sign(displacement),velocity:0};
 return {direction:0,velocity:0};
}
export const releaseTarget=(direction,y,d,startY)=>direction>0?d:direction<0?0:startY>=d-.5?d:startY<=.5?0:y>=d/2?d:0;
export const smooth=(t)=>{const x=clamp(t);return x*x*(3-2*x)};
export const segment=(p,a,b)=>smooth((p-a)/(b-a));
export const PROFILE_MORPH_START=.18;
export const PROFILE_CIRCLE_AT=.60;
export const PROFILE_CENTER_AT=.70;
export const PROFILE_VISIBLE_TOP_INSET=64; // bottom edge of profile's native logo/header
export const PROFILE_CIRCLE_WIDTH_FRACTION=.62; // absolute upper bound at morph
export const PROFILE_AVATAR_DIAMETER=98;
export const PROFILE_PRE_DOCK_RATIO=.94;
export function profileCircleGeometry(width,height,compactHeight=292){
 const w=Math.max(1,width),h=Math.max(1,height);
 const coverY=-16*segment(PROFILE_MORPH_START,0,PROFILE_MORPH_START);
 const sheetY=mix(h-30,109,smooth(clamp(PROFILE_CIRCLE_AT/.78)));
 const visibleTop=Math.max(0,Math.min(PROFILE_VISIBLE_TOP_INSET,sheetY-PROFILE_AVATAR_DIAMETER));
 const visibleBottom=Math.min(h+coverY,sheetY);
 const visibleHeight=Math.max(PROFILE_AVATAR_DIAMETER,visibleBottom-visibleTop);
 const diameter=Math.max(PROFILE_AVATAR_DIAMETER,Math.min(visibleHeight,w*PROFILE_CIRCLE_WIDTH_FRACTION));
 const centerY=visibleTop+(visibleBottom-visibleTop)/2;
 return {diameter,visibleTop,visibleBottom,visibleHeight,centerY,
  maskCenterY:centerY-coverY,compactHeight};
}
export const profileMaskDiameter=(width,height,compactHeight=292)=>profileCircleGeometry(width,height,compactHeight).diameter;
export function profileFrame(progress,width,height,compactHeight=292){
 const p=clamp(progress),w=Math.max(1,width),h=Math.max(1,height);
 const circleGeometry=profileCircleGeometry(w,h,compactHeight);
 const {diameter:maskDiameter,maskCenterY}=circleGeometry;
 const circle=p>=PROFILE_CIRCLE_AT;
 const formation=segment(p,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT);
 const docking=segment(p,PROFILE_CENTER_AT,1);
 const coverY=-16*segment(p,0,PROFILE_MORPH_START);
 const midWidth=Math.max(PROFILE_AVATAR_DIAMETER,maskDiameter*PROFILE_PRE_DOCK_RATIO);
 const photoW=!circle?w:p<PROFILE_CENTER_AT?mix(maskDiameter,midWidth,formation):mix(midWidth,PROFILE_AVATAR_DIAMETER,docking);
 const photoX=!circle?0:p<PROFILE_CENTER_AT?(w-photoW)/2:mix((w-midWidth)/2,16,docking);
 const circleStartY=circleGeometry.centerY-maskDiameter/2;
 const photoY=!circle?coverY:p<PROFILE_CENTER_AT?mix(circleStartY,82,formation):mix(82,102,docking);
 const heroScale=circle?photoW/maskDiameter:1;
 const heroX=circle?photoX-(w/2-maskDiameter/2)*heroScale:0;
 const heroY=circle?photoY-(maskCenterY-maskDiameter/2)*heroScale:coverY;
 const sheetY=mix(h-30,109,smooth(clamp(p/.78)));
 const railY=mix(h+218,compactHeight,p);
 const panelClipBottom=Math.max(0,284-Math.max(0,railY-sheetY));
 return {
  progress:p,stage:!circle?'sheet':p<PROFILE_CENTER_AT?'center':'avatar',
  x:photoX,y:photoY,width:photoW,height:circle?photoW:h,radius:circle?50:0,
  heroX,heroY,heroScale,maskDiameter,maskCenterY,
  visibleTop:circleGeometry.visibleTop,visibleBottom:circleGeometry.visibleBottom,
  visibleHeight:circleGeometry.visibleHeight,
  sheetY,panelClipBottom,
  // Move the identity across the invisible middle, then reveal from the right.
  nameX:220*segment(p,.29,.70)-110*segment(p,.70,.96),
  nameY:mix(h+9,116,smooth(p)),
  nameOpacity:1-segment(p,.17,.29)+segment(p,.70,.96),
  actionY:mix(h+123,222,smooth(clamp(p/.88))),
  moreY:mix(h+8,113,smooth(p)),
  photoExtrasOpacity:1-segment(p,.20,.33),
  mainPhotoOpacity:segment(p,.12,.50),
  goalX:0,goalY:0,compactHeight
 };
}

export function profileMorphInset(p,width,height,diameter,centerY){
 const t=segment(p,PROFILE_MORPH_START,PROFILE_CIRCLE_AT),w=Math.max(1,width),h=Math.max(1,height),d=diameter;
 const top=(centerY-d/2)*t,side=((w-d)/2)*t,bottom=(h-centerY-d/2)*t,r=d/2*t;
 return 'inset('+top.toFixed(2)+'px '+side.toFixed(2)+'px '+bottom.toFixed(2)+'px '+side.toFixed(2)+'px round '+r.toFixed(2)+'px)';
}
