// Pure, allocation-light interpolation math for the Telegram-style profile.
// Phase A: white sheet rises while cover stays full bleed.
// Phase B: cover rapidly becomes a small rounded card at screen center.
// Phase C: that same painted image settles into the left circular avatar.
// Every output is a function of scroll position (no time-based animation).
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(t)=>{const x=clamp(t);return x*x*(3-2*x)};
export const segment=(p,a,b)=>smooth((p-a)/(b-a));

export function profileFrame(progress,width,height,compactHeight=292){
 const p=clamp(progress),w=Math.max(1,width),h=Math.max(1,height);
 const middleW=Math.min(190,Math.max(154,w*.49));
 const middleH=Math.min(194,Math.max(158,w*.50));
 const coverToMiddle=segment(p,.14,.39);
 const middleToAvatar=segment(p,.39,1);
 const middleX=(w-middleW)*.5;
 const frame={
  progress:p,
  stage:p<.14?'sheet':p<.39?'center':'avatar',
  x:p<=.39?mix(0,middleX,coverToMiddle):mix(middleX,16,middleToAvatar),
  y:p<=.39?mix(0,82,coverToMiddle):mix(82,102,middleToAvatar),
  width:p<=.39?mix(w,middleW,coverToMiddle):mix(middleW,98,middleToAvatar),
  height:p<=.39?mix(h,middleH,coverToMiddle):mix(middleH,98,middleToAvatar),
  radius:p<=.39?mix(0,20,coverToMiddle):mix(20,50,middleToAvatar),
 };
 // The sheet lifts faster than its contents, preventing an empty gap behind
 // the shrinking photo; identity/buttons retain a calm independent trajectory.
 const sheet=smooth(clamp(p/.78));
 const content=smooth(p);
 // The actions move slightly ahead of the tab rail to maintain clearance
 // at every fractional scroll position, including slow finger dragging.
 const actionsProgress=smooth(clamp(p/.85));
 const expandedPanelY=h-30;
 const compactPanelY=109;
 const nameFrom=h+9,nameTo=116;
 const actionsFrom=h+123,actionsTo=216;
 const menuFrom=h+8,menuTo=113;
 const contentTop=compactHeight;
 // Avoid the face and name crossing in the transitional 0.6-0.8 zone.
 const identityOcclusion=1-segment(p,.49,.6)+segment(p,.76,.90);
 const xName=110*segment(p,.50,.91);
 return {
  ...frame,
  sheetY:mix(expandedPanelY,compactPanelY,sheet),
  nameX:xName,
  nameY:mix(nameFrom,nameTo,content),
  nameOpacity:clamp(identityOcclusion),
  actionY:mix(actionsFrom,actionsTo,actionsProgress),
  moreY:mix(menuFrom,menuTo,content),
  photoExtrasOpacity:1-segment(p,.07,.19),
  compactOnlineOpacity:segment(p,.78,.97),
  shadeOpacity:1-segment(p,.12,.43),
  goalX:-120*segment(p,.48,.90),
  goalY:26*segment(p,.48,.90),
  compactHeight:contentTop,
 };
}
