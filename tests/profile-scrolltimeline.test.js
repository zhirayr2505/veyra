import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProfileScrollKeyframes} from '../web/v5/profileScrollTimeline.js';
import {profileFrame} from '../web/v5/profileMotionMath.js';

test('ScrollTimeline motion covers exactly the collapsing distance and holds through rest of content',()=>{
 const width=390,height=447,distance=373,total=2000;
 const tracks=buildProfileScrollKeyframes(width,height,distance,total,292);
 for(const [name,frames] of Object.entries(tracks)){
  assert.ok(frames.length>=41,name);
  assert.equal(frames[0].offset,0,name);
  assert.equal(frames.at(-1).offset,1,name);
  for(let i=1;i<frames.length;i++)assert.ok(frames[i].offset>frames[i-1].offset,name+' duplicate/nonmonotonic offset at '+i);
  assert.deepEqual(Object.keys(frames[0]).sort(),Object.keys(frames.at(-1)).sort());
 }
 const p=tracks.hero.find(f=>Math.abs(f.offset-.39*distance/total)<.00002);
 assert.ok(p);
 assert.ok(p.transform.includes('translate3d'));
 assert.ok(tracks.image[0].transform.includes('scaleY'));
 assert.equal(tracks.actions.at(-1).transform,tracks.actions.at(-2).transform);
 assert.ok(tracks.identity[0].opacity>0.9);
});

test('ScrollTimeline frame geometry matches the existing approved three stage profile',()=>{
 const width=390,height=447,distance=373,total=1200;
 const tracks=buildProfileScrollKeyframes(width,height,distance,total,292);
 const f=profileFrame(.39,width,height,292);
 const middle=tracks.hero.find(v=>Math.abs(v.offset-.39*distance/total)<.00002);
 assert.ok(middle.transform.includes(f.x.toFixed(3)));
 assert.ok(middle.transform.includes(f.y.toFixed(3)));
});

test('Reference overlays preserve photo trajectory while tracking the collapse',()=>{
 const width=390,height=447,distance=373,total=1200;
 const tracks=buildProfileScrollKeyframes(width,height,distance,total,292);
 for(const name of ['blur','ring','onlineDot','grabber']){
  assert.ok(tracks[name].length>=41,'track '+name);
  assert.equal(tracks[name][0].offset,0);
  assert.equal(tracks[name].at(-1).offset,1);
 }
 assert.equal(tracks.blur[0].opacity,0);
 assert.equal(tracks.blur.at(-1).opacity,1);
 assert.equal(tracks.ring[0].opacity,0);
 assert.equal(tracks.ring.at(-1).opacity,1);
 assert.equal(tracks.onlineDot.at(-1).opacity,1);
 assert.equal(tracks.grabber[0].opacity,1);
 assert.equal(tracks.grabber.at(-1).opacity,0);
 assert.equal(tracks.hero[0].transform,'translate3d(0.000px,0.000px,0) scale(1.0000000,1.0000000)');
});
