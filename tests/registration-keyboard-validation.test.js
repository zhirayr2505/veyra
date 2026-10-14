import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('registration CTA hides when an editable field is focused and listens for viewport changes',()=>{
 const jsx=read('web/v5/Registration.jsx'),css=read('web/v5/Registration2026.css');
 assert.match(jsx,/visualViewport\?\.addEventListener\('resize'/);
 assert.match(jsx,/viewportChanged/);
 assert.match(jsx,/onFocusCapture=\{editing\}/);
 assert.match(jsx,/data-keyboard-open=\{keyboardActive/);
 assert.match(css,/registration-actions\[data-keyboard-open="true"\]/);
 assert.match(css,/pointer-events:none/);
});
test('registration local validation and Telegram error haptic are available',()=>{
 const jsx=read('web/v5/Registration.jsx');
 assert.match(jsx,/const invalid=\(field,message\)/);
 assert.match(jsx,/fieldError\?\.step===1/);
 assert.match(jsx,/fieldError\?\.step===3/);
 assert.match(jsx,/notificationOccurred\?\.\('error'\)/);
});
test('onboarding shows exactly six unambiguous goals with legacy labels',()=>{
 const jsx=read('web/v5/OnboardingOptions.jsx');
 const goals=jsx.slice(jsx.indexOf('export const GOALS=['),jsx.indexOf('];',jsx.indexOf('export const GOALS=[')));
 assert.equal((goals.match(/value:'/g)||[]).length,6);
 assert.match(jsx,/LEGACY_GOAL_TITLES/);
});
