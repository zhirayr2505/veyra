import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProfileScrollKeyframes} from '../web/v5/profileScrollTimeline.js';
import {profileFrame} from '../web/v5/profileMotionMath.js';
test('ScrollTimeline keyframes stay ordered through the collapse and hold compact',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 for(const [name,frames] of Object.entries(tracks)){
  assert.ok(frames.length>=41,name);
  assert.equal(frames[0].offset,0);
  assert.equal(frames.at(-1).offset,1);
  for(let i=1;i<frames.length;i++)assert.ok(frames[i].offset>frames[i-1].offset,name+' duplicate '+i);
  assert.deepEqual(Object.keys(frames[0]).sort(),Object.keys(frames.at(-1)).sort());
 }
 assert.deepEqual(Object.keys(tracks).sort(),['hero','panel','lip','identity','actions','more','goal','bars','nav','grabber','backdropPhoto','rim','online','mainPhoto'].sort());
 assert.equal(tracks.actions.at(-1).transform,tracks.actions.at(-2).transform);
});
test('hero uses uniform scale, not an independent scaleX/scaleY or compensation layer',()=>{
 const width=390,height=447,distance=373,total=1200;
 const tracks=buildProfileScrollKeyframes(width,height,distance,total,292);
 const f=profileFrame(.38,width,height,292);
 const at=tracks.hero.find(v=>Math.abs(v.offset-.38*distance/total)<.00002);
 assert.ok(at);
 assert.equal(at.transform,`translate3d(${f.heroX.toFixed(3)}px,${f.heroY.toFixed(3)}px,0) scale(${f.heroScale.toFixed(7)})`);
 assert.equal(tracks.hero[0].transform,'translate3d(0.000px,0.000px,0) scale(1.0000000)');
 assert.ok(!/scale\([^)]*,/.test(at.transform));
});
test('no extra image, shade, blur or orphaned ring track',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 for(const k of ['image','shade','blur','ring','onlineDot'])assert.ok(!(k in tracks),'duplicate track '+k);
 assert.equal(tracks.grabber[0].opacity,1);
 assert.equal(tracks.grabber.at(-1).opacity,0);
 assert.equal(tracks.backdropPhoto[0].opacity,0);
 assert.equal(tracks.backdropPhoto.at(-1).opacity,1);
 for(const frames of [tracks.hero,tracks.panel,tracks.lip,tracks.identity,tracks.actions,tracks.more,tracks.backdropPhoto])for(const f of frames)assert.ok(Object.keys(f).every(k=>['offset','transform','opacity','clipPath'].includes(k)));

});

test('one hero track owns scroll progress and the interpolated mask',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 const hero=tracks.hero;
 assert.ok(hero.every(f=>f.clipPath.startsWith('inset(')));
 assert.equal(hero[0].clipPath,'inset(0.00px 0.00px 0.00px 0.00px round 0.00px)');
 assert.ok(hero.at(-1).clipPath.includes('round '));
 assert.equal(tracks.rim[0].opacity,0);
 assert.equal(tracks.rim.at(-1).opacity,1);
 assert.equal(tracks.online.at(-1).opacity,1);
});
