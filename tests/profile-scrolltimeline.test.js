import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProfileScrollKeyframes} from '../web/v5/profile/motion/profileScrollTimeline.js';
import {profileFrame} from '../web/v5/profile/motion/profileMotionMath.js';
test('ScrollTimeline keyframes stay ordered through the collapse and hold compact',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 for(const [name,frames] of Object.entries(tracks)){
  assert.ok(frames.length>=41,name);
  assert.equal(frames[0].offset,0);
  assert.equal(frames.at(-1).offset,1);
  for(let i=1;i<frames.length;i++)assert.ok(frames[i].offset>frames[i-1].offset,name+' duplicate '+i);
  assert.deepEqual(Object.keys(frames[0]).sort(),Object.keys(frames.at(-1)).sort());
 }
 assert.deepEqual(Object.keys(tracks).sort(),['hero','panel','photoContent','identity','actions','more','goal','bars','grabber','backdrop','backdropPhoto','rim','online','mainPhoto'].sort());
 assert.equal(tracks.actions.at(-1).transform,tracks.actions.at(-2).transform);
});
test('hero uses uniform scale, not an independent scaleX/scaleY and the inner image is fitted uniformly',()=>{
 const width=390,height=447,distance=373,total=1200;
 const tracks=buildProfileScrollKeyframes(width,height,distance,total,292);
 const f=profileFrame(.60,width,height,292);
 const at=tracks.hero.find(v=>Math.abs(v.offset-.60*distance/total)<.00002);
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
 for(const frames of [tracks.hero,tracks.panel,tracks.photoContent,tracks.identity,tracks.actions,tracks.more,tracks.backdropPhoto])for(const f of frames)assert.ok(Object.keys(f).every(k=>['offset','transform','opacity','clipPath'].includes(k)));

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

test('compact backdrop photo is fully visible before the hero starts to shrink',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 const at=p=>tracks.backdropPhoto.find(f=>Math.abs(f.offset-p*373/2000)<.00002);
 assert.equal(at(0).opacity,0);
 assert.ok(at(0.17).opacity>=.99,'backdrop must be opaque at 0.17');
 assert.equal(tracks.backdropPhoto.at(-1).opacity,1);
});
test('compact backdrop is clipped to the sheet and ends at the compact height',()=>{
 const tracks=buildProfileScrollKeyframes(390,447,373,2000,292);
 const bottom=f=>parseFloat(f.clipPath.split(' ')[2]);
 assert.ok(tracks.backdrop.every(f=>f.clipPath.startsWith('inset(0px 0px ')));
 assert.ok(Math.abs(bottom(tracks.backdrop.at(-1))-(447-292))<.01);
 for(const f of tracks.backdrop)assert.ok(bottom(f)>=0&&bottom(f)<=447-292+.01);
});
test('range mode keeps offsets independent of the total scroll height',()=>{
 const a=buildProfileScrollKeyframes(390,447,373,900,292,64,true);
 const b=buildProfileScrollKeyframes(390,447,373,5000,292,64,true);
 assert.deepEqual(a,b);
 assert.equal(a.hero.at(-1).offset,1);
});
