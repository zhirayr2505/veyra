import test from 'node:test';
import assert from 'node:assert/strict';
import {profileCircleGeometry,profileFrame} from '../web/v5/profile/motion/profileMotionMath.js';
import {profileStyles} from '../web/v5/profile/motion/profileScrollTimeline.js';
test('profile round portrait remains below dynamically measured Telegram TopZone',()=>{
 for(const [w,h] of [[360,322],[390,447],[430,600]])for(const top of [64,88,120,145]){
  const g=profileCircleGeometry(w,h,292,top),f=profileFrame(.35,w,h,292,top);
  assert.ok(f.y>=top-1e-6,`${w}/${h}/${top} - ${f.y}`);
  assert.ok(g.diameter>=98);
  assert.deepEqual(profileStyles(.35,w,h,292,top).hero.transform,profileStyles(.35,w,h,292,top).hero.transform);
 }
});
test('name cannot collide with photo in the central stage and remains visible',()=>{
 for(const [w,h] of [[360,355],[390,447],[430,600]])for(let i=35;i<=84;i++){
  const f=profileFrame(i/100,w,h);
  assert.equal(f.nameOpacity,1);
  assert.ok(f.nameY>=f.y+f.width+8 || f.nameX+19>=f.x+f.width+9,`${w}/${h} p=${i/100}: name ${f.nameY} photo ${f.y+f.width}`);
  assert.ok(f.actionOpacity>=-1e-8&&f.actionOpacity<=1+1e-8);
 }
});

test('buttons yield during in-between states and return at both endpoints',()=>{
 for(const [w,h] of [[360,355],[390,447],[430,600]]){
  for(let i=20;i<=90;i++)assert.ok(profileFrame(i/100,w,h).actionOpacity<.001,`buttons visible at ${i/100}`);
  assert.equal(profileFrame(0,w,h).actionOpacity,1);
  assert.equal(profileFrame(1,w,h).actionOpacity,1);
 }
});
