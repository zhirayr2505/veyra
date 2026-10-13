import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFrame,PROFILE_CIRCLE_AT,PROFILE_CENTER_AT} from '../web/v5/profileMotionMath.js';

const W=390,H=447,compact=292;
const frame=p=>profileFrame(p,W,H,compact);

test('sheet covers about 30% before unchanged full-width cover becomes circular',()=>{
 const start=frame(0),early=frame(PROFILE_CIRCLE_AT-.00001);
 assert.equal(start.width,W);assert.equal(start.height,H);
 assert.equal(early.x,0);assert.equal(early.width,W);assert.equal(early.height,H);
 assert.equal(early.radius,0);
 assert.ok(early.y<0&&early.y>-22);
 assert.ok(early.sheetY<H*.75&&early.sheetY>H*.60);
 assert.ok(early.sheetY<start.sheetY);
});

test('circle is immediate: no rounded rectangle, no pre-circle horizontal drift',()=>{
 const circle=frame(PROFILE_CIRCLE_AT);
 assert.equal(circle.width,circle.height);assert.equal(circle.radius,50);
 for(let i=0;i<=1000;i++){
  const p=i/1000,f=frame(p);
  if(p<PROFILE_CIRCLE_AT){
   assert.equal(f.x,0);assert.equal(f.width,W);assert.equal(f.height,H);assert.equal(f.radius,0);
  }else{
   assert.equal(f.width,f.height);assert.equal(f.radius,50);
  }
 }
 const centered=frame(PROFILE_CENTER_AT);
 assert.ok(centered.width>=154&&centered.width<=190);
 assert.ok(Math.abs(centered.x-(W-centered.width)/2)<.01);
});

test('one moving photograph settles into precisely 98px avatar and safe actions',()=>{
 const last=frame(1);
 assert.deepEqual([last.x,last.y,last.width,last.height,last.radius],[16,102,98,98,50]);
 assert.equal(last.nameX,110);assert.equal(last.nameY,116);
 assert.equal(last.actionY,222);assert.equal(last.nameOpacity,1);
});

test('identity fades completely during travel and only returns once avatar docks',()=>{
 assert.equal(frame(0).nameOpacity,1);
 for(const p of [.30,.43,.75,.94])assert.equal(frame(p).nameOpacity,0);
 assert.ok(frame(.98).nameOpacity>0);
 assert.equal(frame(1).nameOpacity,1);
});

test('buttons never touch tab bar and panel never obscures first content frames',()=>{
 for(let i=0;i<=1000;i++){
  const p=i/1000,f=frame(p),railTop=H+218-p*(H+218-compact);
  for(const n of [f.x,f.y,f.width,f.height,f.radius,f.nameX,f.nameY,f.actionY,f.moreY,f.sheetY,f.panelClipBottom])
   assert.ok(Number.isFinite(n),'non-finite value at '+p);
  assert.ok(f.actionY+51<=railTop-7,'CTA/tab collision at '+p);
  assert.ok(f.sheetY+284-f.panelClipBottom<=railTop+.001,'panel/content collision at '+p);
  assert.deepEqual(frame(p),f,'reverse scroll must be deterministic');
 }
});
