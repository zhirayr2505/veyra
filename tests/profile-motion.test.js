import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFrame,profileMaskDiameter,profileCircleGeometry,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT,PROFILE_VISIBLE_TOP_INSET,PROFILE_CIRCLE_WIDTH_FRACTION,PROFILE_AVATAR_DIAMETER} from '../web/v5/profileMotionMath.js';
const W=390,H=447,D=profileMaskDiameter(W,H);
const frame=p=>profileFrame(p,W,H,292);
const close=(a,b,eps=.1)=>Math.abs(a-b)<=eps;
test('initial photo is full-size unchanged rectangle; the sheet rises over it',()=>{
 const start=frame(0),early=frame(PROFILE_CIRCLE_AT-.000001);
 assert.equal(start.width,W);assert.equal(start.height,H);assert.equal(start.heroScale,1);
 assert.equal(early.width,W);assert.equal(early.height,H);assert.equal(early.radius,0);
 assert.equal(early.heroX,0);assert.ok(early.heroY<0);
 assert.ok(early.sheetY<H*.75&&early.sheetY>H*.60);
 assert.ok(early.sheetY<start.sheetY);
});
test('circle starts face-sized at one exact threshold, without intermediate square or oval',()=>{
 assert.ok(D>=PROFILE_AVATAR_DIAMETER&&D<=W*PROFILE_CIRCLE_WIDTH_FRACTION);
 const circle=frame(PROFILE_CIRCLE_AT);
 assert.equal(circle.width,D);assert.equal(circle.height,D);assert.equal(circle.radius,50);
 assert.equal(circle.heroScale,1);
 assert.ok(close(circle.heroX,0,.001));assert.ok(close(circle.heroY,frame(PROFILE_CIRCLE_AT-1e-9).heroY,.001));
 const visible=profileCircleGeometry(W,H,292);
 assert.equal(visible.visibleTop,PROFILE_VISIBLE_TOP_INSET);
 assert.ok(close(circle.y+circle.height/2,(visible.visibleTop+visible.visibleBottom)/2,.00001));
 assert.ok(close(D,Math.min(visible.visibleHeight,PROFILE_CIRCLE_WIDTH_FRACTION*W),.00001));
 for(let i=0;i<=1000;i++){
  const p=i/1000,f=frame(p);
  assert.equal(f.radius,p<PROFILE_CIRCLE_AT?0:50);
  if(p<PROFILE_CIRCLE_AT){assert.equal(f.width,W);assert.equal(f.height,H);assert.equal(f.heroScale,1)}
  else{assert.equal(f.width,f.height);assert.ok(f.width<=D);assert.ok(f.width>=98)}
 }
});
test('uniformly scaled photo is reversible and docks at 98px in the approved location',()=>{
 for(let i=0;i<=1000;i++){
  const p=i/1000,f=frame(p);
  for(const key of ['x','y','width','height','heroX','heroY','heroScale','sheetY','panelClipBottom','nameX','nameY','actionY','moreY'])
   assert.ok(Number.isFinite(f[key]),key+' non-finite at '+p);
  assert.ok(f.heroScale>0&&f.heroScale<=1);
  assert.deepEqual(profileFrame(p,W,H,292),f);
 }
 const last=frame(1);
 assert.deepEqual([last.x,last.y,last.width,last.height,last.radius],[16,102,98,98,50]);
 assert.equal(last.nameX,110);assert.equal(last.nameY,116);assert.equal(last.actionY,222);
});
test('the circular mask remains centered on the transformed photo as it moves',()=>{
 for(let i=340;i<=1000;i++){
  const f=frame(i/1000);
  const photoCenterX=f.heroX+W/2*f.heroScale;
  const photoCenterY=f.heroY+f.maskCenterY*f.heroScale;
  assert.ok(close(photoCenterX,f.x+f.width/2,.0001),'x at '+i);
  assert.ok(close(photoCenterY,f.y+f.height/2,.0001),'y at '+i);
 }
});
test('no discontinuous transform at the mask boundary; no wide circle',()=>{
 const a=frame(PROFILE_CIRCLE_AT-1e-8),b=frame(PROFILE_CIRCLE_AT);
 assert.ok(close(a.heroX,b.heroX,.001));
 assert.ok(close(a.heroY,b.heroY,.001));
 assert.ok(close(a.heroScale,b.heroScale,.001));
 assert.ok(b.width<=W*PROFILE_CIRCLE_WIDTH_FRACTION);
 assert.ok(b.width<=profileCircleGeometry(W,H).visibleHeight);
});
test('identity is temporarily hidden during travel; action/sheet never overlap tabs',()=>{
 assert.equal(frame(0).nameOpacity,1);
 for(const p of [.30,.43,.69])assert.equal(frame(p).nameOpacity,0);
 assert.ok(frame(.75).nameOpacity>0&&frame(.75).nameOpacity<1);
 assert.ok(frame(.94).nameOpacity>.9);
 assert.equal(frame(1).nameOpacity,1);
 assert.equal(frame(.61).nameX,0);
 assert.ok(frame(.80).nameX>0&&frame(.80).nameX<110);
 assert.equal(frame(1).nameOpacity,1);
 for(let i=0;i<=1000;i++){
  const p=i/1000,f=frame(p),railTop=H+218-p*(H+218-292);
  assert.ok(f.actionY+51<=railTop-7,'action/rail '+p);
  assert.ok(f.sheetY+284-f.panelClipBottom<=railTop+.001,'panel/rail '+p);
 }
});

test('short viewport has the same visible-region-center and maximum width bounds',()=>{
 for(const [w,h] of [[360,355],[390,447],[430,480]]){
  const g=profileCircleGeometry(w,h),f=profileFrame(PROFILE_CIRCLE_AT,w,h);
  assert.ok(g.diameter<=.62*w+1e-8);
  assert.ok(g.diameter<=g.visibleHeight+1e-8);
  assert.ok(g.diameter>=PROFILE_AVATAR_DIAMETER);
  assert.ok(close(f.y+f.height/2,(g.visibleTop+g.visibleBottom)/2,1e-6));
  assert.ok(close(f.heroY,profileFrame(PROFILE_CIRCLE_AT-1e-9,w,h).heroY,1e-3));
 }
});
