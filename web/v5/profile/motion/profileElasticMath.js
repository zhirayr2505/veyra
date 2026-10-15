// Pure elastic overscroll law: resistant, capped, never changes native
// scroll position or the ScrollTimeline's approved three-stage keyframes.
export function elasticPullDistance(deltaY){
 const dy=Math.max(0,Number.isFinite(deltaY)?deltaY:0);
 return Math.min(44,66*(1-Math.exp(-dy/140)));
}
export function elasticPhotoScale(pull){
 return 1+Math.max(0,Math.min(44,pull))*.00072;
}
