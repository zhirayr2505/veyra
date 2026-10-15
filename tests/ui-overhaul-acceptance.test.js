import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROFILE_CIRCLE_AT,profileFrame} from '../web/v5/profile/motion/profileMotionMath.js';
import {buildProfileScrollKeyframes} from '../web/v5/profile/motion/profileScrollTimeline.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const luminosity=hex=>{
 const [r,g,b]=rgb(hex).map(x=>{const u=x/255;return u<=0.04045?u/12.92:((u+0.055)/1.055)**2.4});
 return 0.2126*r+0.7152*g+0.0722*b;
};
const contrast=(light,dark)=>(luminosity(light)+0.05)/(luminosity(dark)+0.05);
const color=(name,source)=>{
 const match=source.match(new RegExp(name+':(#[\\da-fA-F]{6})\\b'));
 assert.ok(match,'Token '+name+' must be a six-digit color');return match[1];
};

test('approved brand gradient with its 20% dark text scrim passes WCAG AA white CTA contrast',()=>{
 const tokens=read('web/v5/tokens.css');
 const start=color('--vx-color-primary-start',tokens),end=color('--vx-color-primary-end',tokens);
 assert.equal(start.toLowerCase(),'#ae60fc');assert.equal(end.toLowerCase(),'#7628e5');
 assert.match(tokens,/--vx-gradient-primary:linear-gradient\(0deg,#251b3833,#251b3833\),var\(--vx-gradient-primary-base\)/);
 const ink=rgb('#251b38');
 for(const stop of [start,end]){
  const result=rgb(stop).map((v,i)=>Math.round(v*0.8+ink[i]*0.2));
  const blended='#'+result.map(x=>x.toString(16).padStart(2,'0')).join('');
  assert.ok(contrast('#ffffff',blended)>=4.5,stop+' contrast below WCAG AA');
 }
});

test('all seven interest chips meet 4.5:1 normal-text contrast',()=>{
 const css=read('web/v5/tokens.css');
 for(const tone of ['violet','rose','sky','mint','amber','iris','teal']){
  const bg=color('--vx-tone-'+tone+'-bg',css),fg=color('--vx-tone-'+tone+'-fg',css);
  assert.ok(contrast(bg,fg)>=4.5,tone+' failed text contrast');
 }
});

test('profile reaches a fitted circle by 35% of collapse with uniform scale',()=>{
 assert.equal(PROFILE_CIRCLE_AT,.35);
 const frame=profileFrame(PROFILE_CIRCLE_AT,390,447);
 assert.equal(frame.width,frame.height);
 assert.ok(frame.heroScale>0);
});

test('performance-sensitive 6.4 compositing retains scroll timeline and motion phase constants',()=>{
 const scroll=read('web/v5/profile/motion/profileScrollTimeline.js');
 const steps=read('web/v5/RegistrationTransitions.css');
 assert.match(scroll,/new win.ScrollTimeline/);
 assert.ok(buildProfileScrollKeyframes(390,447,373,1200).hero.every(frame=>frame.clipPath));
 assert.match(scroll,/PROFILE_CIRCLE_AT/);
 assert.doesNotMatch(scroll,/tracks.blur.push/);
 assert.doesNotMatch(scroll,/tracks.image.push/);
 assert.match(steps,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(steps,/view-transition-new\(veyra-registration-step\)/);
});
