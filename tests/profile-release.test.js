import test from 'node:test';
import assert from 'node:assert/strict';
import {
 profileReleaseVelocity,profileReleaseTarget,
 PROFILE_COMMIT_RATIO,PROFILE_FLICK_VELOCITY,PROFILE_FLICK_MIN_RATIO,
} from '../web/v5/profile/motion/profileMotionMath.js';

const D=300;
test('velocity: positive when the finger moves up (header collapses), 0 without samples',()=>{
 assert.equal(profileReleaseVelocity([],100),0);
 assert.ok(profileReleaseVelocity([{at:0,finger:550},{at:100,finger:510}],100)>0);
 assert.ok(profileReleaseVelocity([{at:0,finger:510},{at:100,finger:550}],100)<0);
 // samples older than 120 ms are ignored
 assert.equal(profileReleaseVelocity([{at:0,finger:500},{at:10,finger:400}],500),0);
});
test('a tiny slow push returns to the state it started from',()=>{
 assert.equal(profileReleaseTarget({y:25,startScroll:0,distance:D,velocity:.2}),0);
 assert.equal(profileReleaseTarget({y:D-25,startScroll:D,distance:D,velocity:-.2}),D);
 assert.equal(profileReleaseTarget({y:60,startScroll:0,distance:D,velocity:0}),0);
});
test('travelling the commit ratio switches state, in both directions',()=>{
 const over=Math.ceil(PROFILE_COMMIT_RATIO*D)+2;
 assert.equal(profileReleaseTarget({y:over,startScroll:0,distance:D,velocity:0}),D);
 assert.equal(profileReleaseTarget({y:D-over,startScroll:D,distance:D,velocity:0}),0);
 const under=Math.floor(PROFILE_COMMIT_RATIO*D)-2;
 assert.equal(profileReleaseTarget({y:under,startScroll:0,distance:D,velocity:0}),0);
 assert.equal(profileReleaseTarget({y:D-under,startScroll:D,distance:D,velocity:0}),D);
});
test('a moving finger counts the distance the fling would still cover',()=>{
 // 70 px is below 30 % of 300, but a firm (not flick) movement completes it
 assert.equal(profileReleaseTarget({y:70,startScroll:0,distance:D,velocity:.5}),D);
 assert.equal(profileReleaseTarget({y:70,startScroll:0,distance:D,velocity:.1}),0);
});
test('a fast flick switches earlier, but not before the minimum distance',()=>{
 const v=PROFILE_FLICK_VELOCITY+.2,min=Math.ceil(PROFILE_FLICK_MIN_RATIO*D);
 assert.equal(profileReleaseTarget({y:min+1,startScroll:0,distance:D,velocity:v}),D);
 assert.equal(profileReleaseTarget({y:D-min-1,startScroll:D,distance:D,velocity:-v}),0);
 assert.equal(profileReleaseTarget({y:min-3,startScroll:0,distance:D,velocity:v}),0);
});
test('flicking back toward the origin cancels a long drag',()=>{
 assert.equal(profileReleaseTarget({y:200,startScroll:0,distance:D,velocity:-(PROFILE_FLICK_VELOCITY+.1)}),0);
 assert.equal(profileReleaseTarget({y:100,startScroll:D,distance:D,velocity:PROFILE_FLICK_VELOCITY+.1}),D);
});
test('content scroll and rest positions are never touched',()=>{
 for(const y of [0,D,D+20,D+200,1800])
  for(const startScroll of [0,D,y-50,y+50])
   for(const velocity of [-2,-.3,0,.3,2])
    assert.equal(profileReleaseTarget({y,startScroll,distance:D,velocity}),y);
});
test('a gesture started in the content counts as started from compact',()=>{
 assert.equal(profileReleaseTarget({y:D-20,startScroll:900,distance:D,velocity:-.2}),D);
 assert.equal(profileReleaseTarget({y:D-120,startScroll:900,distance:D,velocity:-.2}),0);
});
test('an interrupted settle completes by its direction or, when still, to the nearest rest',()=>{
 assert.equal(profileReleaseTarget({y:200,startScroll:150,distance:D,velocity:.3}),D);
 assert.equal(profileReleaseTarget({y:200,startScroll:150,distance:D,velocity:-.3}),0);
 assert.equal(profileReleaseTarget({y:200,startScroll:150,distance:D,velocity:0}),D);
 assert.equal(profileReleaseTarget({y:100,startScroll:150,distance:D,velocity:0}),0);
});
