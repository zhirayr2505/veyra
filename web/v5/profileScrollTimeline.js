import {profileFrame} from './profileMotionMath.js';

// ScrollTimeline spans the full scrollable range. Scale the 0..1 collapse
// progress to its actual distance, then hold the compact frame through
// the remaining content scroll. These keyframes are built ONLY on mount/resize.
const rounded=n=>Math.round(n*1e5)/1e5;
const fade=(p,a,b)=>{
 const t=Math.max(0,Math.min(1,(p-a)/(b-a)));
 return t*t*(3-2*t);
};
export const profileTranslate=(x,y)=>'translate3d('+x.toFixed(3)+'px,'+y.toFixed(3)+'px,0)';
export function buildProfileScrollKeyframes(width,height,distance,maxScroll,compactHeight=292){
 const full=Math.max(1,maxScroll),limit=Math.min(1,Math.max(1,distance)/full);
 const points=[0,.14,.39,.78,.85,.9,1];
 for(let i=0;i<=40;i++)points.push(i/40);
 const unique=[...new Set(points)].sort((a,b)=>a-b);
 const tracks={hero:[],image:[],panel:[],lip:[],identity:[],actions:[],more:[],goal:[],
  bars:[],nav:[],online:[],shade:[],blur:[],ring:[],onlineDot:[],grabber:[]};
 const append=(offset,frame)=>{
  const f=frame,scaleX=f.width/width,scaleY=f.height/height;
  const transform=profileTranslate(f.x,f.y)+' scale('+scaleX.toFixed(7)+','+scaleY.toFixed(7)+')';
  tracks.hero.push({offset,transform});
  tracks.image.push({offset,transform:'scaleY('+(scaleX/scaleY).toFixed(7)+')'});
  tracks.panel.push({offset,transform:profileTranslate(0,f.sheetY-(height-30))});
  tracks.lip.push({offset,transform:profileTranslate(0,f.sheetY-(height-30))});
  tracks.identity.push({offset,transform:profileTranslate(f.nameX,f.nameY-(height+9)),opacity:f.nameOpacity});
  tracks.actions.push({offset,transform:profileTranslate(0,f.actionY-(height+123))});
  tracks.more.push({offset,transform:profileTranslate(0,f.moreY-(height+8))});
  tracks.goal.push({offset,transform:profileTranslate(f.goalX,f.goalY)});
  tracks.bars.push({offset,opacity:f.photoExtrasOpacity});
  tracks.nav.push({offset,opacity:f.photoExtrasOpacity});
  tracks.online.push({offset,opacity:f.compactOnlineOpacity});
  tracks.shade.push({offset,opacity:f.shadeOpacity});
  // Decorative layers only: the approved hero trajectory stays unchanged.
  tracks.blur.push({offset,opacity:fade(f.progress,.24,.86)});
  tracks.ring.push({offset,opacity:fade(f.progress,.82,.99)});
  tracks.onlineDot.push({offset,opacity:fade(f.progress,.85,1)});
  tracks.grabber.push({
   offset,
   opacity:1-fade(f.progress,.03,.24),
   transform:profileTranslate(0,f.sheetY-(height-30)),
  });
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
   const element=parts[key];
   if(!element)continue;
   const animation=element.animate(frames,{timeline,fill:'both'});
   entries.push(animation);
  }
  if(!entries.length)throw Error('No scroll linked layers');
  return {animations:entries,cancel:()=>entries.forEach(a=>a.cancel())};
 }catch{
  entries.forEach(a=>a.cancel());
  return null;
 }
}
