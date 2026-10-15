import test from 'node:test';
import assert from 'node:assert/strict';
import {profileReleaseDirection,releaseTarget} from '../web/v5/profile/motion/profileMotionMath.js';

test('direction rather than midpoint determines rest after a drag',()=>{
 const down=profileReleaseDirection({samples:[{at:0,finger:550},{at:100,finger:510}],startY:0,y:90,at:100});
 assert.equal(down.direction,1);assert.equal(releaseTarget(down.direction,90,300,0),300);
 const up=profileReleaseDirection({samples:[{at:0,finger:510},{at:100,finger:550}],startY:300,y:210,at:100});
 assert.equal(up.direction,-1);assert.equal(releaseTarget(up.direction,210,300,300),0);
});
test('slow drag uses scroll displacement; tiny gesture returns to original rest',()=>{
 const down=profileReleaseDirection({samples:[{at:0,finger:440},{at:120,finger:435}],startY:0,y:95,at:120});
 assert.equal(down.direction,1);
 const stationary=profileReleaseDirection({samples:[{at:0,finger:440},{at:120,finger:442}],startY:300,y:297,at:120});
 assert.equal(stationary.direction,0);assert.equal(releaseTarget(0,297,300,300),300);
});
test('late-window motion beats stale gesture direction, clamped samples stay finite',()=>{
 const window=[{at:0,finger:300},{at:50,finger:200},{at:180,finger:210},{at:220,finger:270}];
 const release=profileReleaseDirection({samples:window,startY:0,y:85,at:220});
 assert.equal(release.direction,-1);
});
