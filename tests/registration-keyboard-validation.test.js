import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('visualViewport height + offsetTop and scroll position keyboard-safe glass nav',()=>{
 const jsx=read('web/v5/Registration.jsx'),css=read('web/v5/Registration2026.css');
 for(const token of ['window.visualViewport','vv.height+vv.offsetTop',"'resize',schedule","'scroll',schedule",'requestAnimationFrame(update)',"'focusout',schedule","'viewportChanged',schedule",'removeEventListener','--veyra-nav-keyboard-gap'])assert.ok(jsx.includes(token),token);
 assert.match(css,/bottom:var\(--veyra-nav-keyboard-gap,0px\)/);
 assert.doesNotMatch(css,/registration-actions\[data-keyboard-open="true"\]/);
 assert.doesNotMatch(jsx,/setKeyboardActive/);
});
test('registration local validation and Telegram error haptic remain available',()=>{
 const jsx=read('web/v5/Registration.jsx');
 assert.match(jsx,/const invalid=\(field,message\)/);
 assert.match(jsx,/fieldError\?\.step===1/);
 assert.match(jsx,/fieldError\?\.step===3/);
 assert.match(jsx,/haptic\('error'\)/);
 assert.match(read('web/v5/haptics.js'),/notificationOccurred/);
});
test('onboarding retains six existing relationship goals',()=>{
 const jsx=read('web/v5/OnboardingOptions.jsx');
 const goals=jsx.slice(jsx.indexOf('export const GOALS=['),jsx.indexOf('];',jsx.indexOf('export const GOALS=[')));
 assert.equal((goals.match(/value:'/g)||[]).length,6);
 assert.match(jsx,/LEGACY_GOAL_TITLES/);
});
