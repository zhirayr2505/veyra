export function swipeAxis(dx,dy,ratio=1.15){
 if(Math.max(Math.abs(dx),Math.abs(dy))<=9)return null;
 return Math.abs(dx)>Math.abs(dy)*ratio?'x':'y';
}
export function swipeStep(dx,width,velocity){
 const size=Math.max(1,width);
 if(Math.abs(dx)>size*.25||Math.abs(velocity)>.35)return dx<0?-1:1;
 return 0;
}
export function swipeBound(dx,width){
 const max=Math.max(1,width)*1.07;
 return Math.max(-max,Math.min(max,dx));
}
