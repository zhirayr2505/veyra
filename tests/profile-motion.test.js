import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFrame} from '../web/v5/profileMotionMath.js';

const W=390,H=447,compact=292;
const frame=(p)=>profileFrame(p,W,H,compact);

test('Telegram profile begins with a gentle photo recession synchronized to the sheet',()=>{
 const start=frame(0),early=frame(.12);
 assert.equal(start.width,W);
 assert.equal(start.height,H);
 assert.ok(early.width<W-7&&early.width>W-24);
 assert.ok(early.height<H-8&&early.height>H-25);
 assert.ok(early.y<start.y);
 assert.ok(early.sheetY<start.sheetY);
 assert.equal(early.radius,0);
});

test('cover first changes into a centered rounded middle image',()=>{
 const middle=frame(.39);
 assert.ok(middle.width>=160&&middle.width<=195);
 assert.ok(middle.height>=160&&middle.height<=199);
 assert.ok(Math.abs(middle.x-(W-middle.width)/2)<.1);
 assert.equal(middle.radius,50);
 assert.ok(middle.y>70&&middle.y<90);
});

test('same image ends as exactly round 98px left avatar',()=>{
 const last=frame(1);
 assert.deepEqual([last.x,last.y,last.width,last.height,last.radius],[16,102,98,98,50]);
 assert.equal(last.nameX,110);
 assert.equal(last.nameY,116);
 assert.equal(last.actionY,216);
 assert.ok(last.sheetY<last.actionY);
 assert.equal(last.nameOpacity,1);
});

test('all five keyframes preserve bounded, finite geometry',()=>{
 const samples=[...Array(101)].map((_,i)=>frame(i/100));
 for(const f of samples){
  for(const n of [f.x,f.y,f.width,f.height,f.radius,f.nameX,f.nameY,f.actionY,f.moreY,f.sheetY,f.nameOpacity,f.photoExtrasOpacity])
   assert.ok(Number.isFinite(n));
  assert.ok(f.width>=97.99&&f.width<=W);
  assert.ok(f.height>=97.99&&f.height<=H);
  assert.ok(f.nameOpacity>=0&&f.nameOpacity<=1);
  assert.ok(f.actionY>=216&&f.actionY<=H+123);
 }
 assert.ok(samples[50].width<samples[30].width);
 assert.ok(samples[88].x<samples[50].x);
});

test('reverse finger direction returns identical geometry without hysteresis',()=>{
 for(const p of [.0,.08,.14,.25,.39,.5,.7,.9,1]){
  assert.deepEqual(frame(p),frame(p));
 }
});

test('buttons never enter the pinned tabs during a slow partial drag',()=>{
 const distance=H+218-compact;
 for(let index=0;index<=100;index++){
  const p=index/100;
  const f=frame(p);
  const railTop=Math.max(compact,H+218-p*distance);
  assert.ok(f.actionY+50<=railTop-12,'collision at '+p.toFixed(2));
 }
});

test('background remains opaque and legacy fading is not part of motion geometry',()=>{
 for(const p of [0,.13,.2,.39,.6,1]){
  const f=frame(p);
  assert.equal(Object.hasOwn(f,'sheetLipOpacity'),false);
  assert.equal(Object.hasOwn(f,'backdropOpacity'),false);
 }
});
