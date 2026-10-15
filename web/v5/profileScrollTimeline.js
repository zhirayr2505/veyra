import {profileFrame,profileCircleGeometry,profileMorphInset,PROFILE_MORPH_START,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT} from './profileMotionMath.js';
// ScrollTimeline uses one uniform portrait transform. The JS boundary switch
// owns the discrete clip-path; no radius interpolation runs on the compositor.
const rounded=n=>Math.round(n*1e5)/1e5;
const fade=(p,a,b)=>{const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t)};
export const profileTranslate=(x,y)=>'translate3d('+x.toFixed(3)+'px,'+y.toFixed(3)+'px,0)';
export function buildProfileScrollKeyframes(width,height,distance,maxScroll,compactHeight=292){
 const full=Math.max(1,maxScroll),limit=Math.min(1,Math.max(1,distance)/full);
 const points=[0,PROFILE_MORPH_START,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT,.78,.85,.9,.94,1];
 for(let i=0;i<=40;i++)points.push(i/40);
 const unique=[...new Set(points)].sort((a,b)=>a-b);
 const geometry=profileCircleGeometry(width,height,compactHeight);
 const tracks={hero:[],panel:[],lip:[],identity:[],actions:[],more:[],goal:[],bars:[],nav:[],grabber:[],backdropPhoto:[],rim:[],online:[],mainPhoto:[]};
 const append=(offset,f)=>{
  tracks.hero.push({offset,transform:profileTranslate(f.heroX,f.heroY)+' scale('+f.heroScale.toFixed(7)+')',clipPath:profileMorphInset(f.progress,width,height,geometry.diameter,geometry.maskCenterY)});
  tracks.panel.push({offset,transform:profileTranslate(0,f.sheetY-(height-30)),clipPath:'inset(0px 0px '+f.panelClipBottom.toFixed(3)+'px 0px)'});
  tracks.lip.push({offset,transform:profileTranslate(0,f.sheetY-(height-30))});
  tracks.identity.push({offset,transform:profileTranslate(f.nameX,f.nameY-(height+9)),opacity:f.nameOpacity});
  tracks.actions.push({offset,transform:profileTranslate(0,f.actionY-(height+123))});
  tracks.more.push({offset,transform:profileTranslate(0,f.moreY-(height+8))});
  tracks.goal.push({offset,transform:profileTranslate(f.goalX,f.goalY)});
  tracks.bars.push({offset,opacity:f.photoExtrasOpacity});
  tracks.nav.push({offset,opacity:f.photoExtrasOpacity});
  tracks.backdropPhoto.push({offset,opacity:fade(f.progress,.20,.55)});
  tracks.rim.push({offset,opacity:fade(f.progress,.52,.62)});
  tracks.mainPhoto.push({offset,opacity:f.mainPhotoOpacity});
  tracks.online.push({offset,opacity:fade(f.progress,.52,.62)});
  tracks.grabber.push({offset,opacity:1-fade(f.progress,.03,.24),transform:profileTranslate(0,f.sheetY-(height-30))});
 };
 for(const p of unique)append(rounded(p*limit),profileFrame(p,width,height,compactHeight));
 if(limit<1)append(1,profileFrame(1,width,height,compactHeight));
 return tracks;
}
export function supportsProfileTimeline(win=window){
 return typeof win.ScrollTimeline==='function' &&
  typeof win.Element?.prototype?.animate==='function' &&
  !win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}
export function createProfileScrollAnimations(scrollElement,parts,{width,height,distance,compactHeight}){
 if(!supportsProfileTimeline(scrollElement.ownerDocument.defaultView))return null;
 const win=scrollElement.ownerDocument.defaultView;
 const maxScroll=Math.max(1,scrollElement.scrollHeight-scrollElement.clientHeight);
 const keyframes=buildProfileScrollKeyframes(width,height,distance,maxScroll,compactHeight);
 const entries=[];
 try{
  const timeline=new win.ScrollTimeline({source:scrollElement,axis:'block'});
  for(const [key,frames] of Object.entries(keyframes)){
   const element=parts[key];if(!element)continue;
   const animation=element.animate(frames,{timeline,fill:'both'});entries.push(animation);
  }
  if(!entries.length)throw Error('No scroll linked layers');
  return {animations:entries,cancel:()=>entries.forEach(a=>a.cancel())};
 }catch{entries.forEach(a=>a.cancel());return null}
}
