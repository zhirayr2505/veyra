import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('single 205ms clipped WAAPI transition preserves steps and cancels animations cleanly',()=>{
 const src=read('web/v5/Registration.jsx'),css=read('web/v5/RegistrationTransitions.css');
 for(const token of ['cloneNode(true)','clone.inert=true','incoming?.animate','clone?.animate','stepTransitionRef.current','Promise.allSettled','prefers-reduced-motion','duration=reduced?0:205','flushSync(()=>setStep(target))'])
  assert.ok(src.includes(token),token);
 assert.match(src,/data-transition-ms="205"/);
 assert.match(read('web/v5/Registration2026.css'),/registration-step-viewport/);
 assert.doesNotMatch(src,/document\.startViewTransition|setKeyboardActive/);
 assert.doesNotMatch(css,/::view-transition|@keyframes veyraStep|veyraItemReveal/);
 assert.doesNotMatch(read('web/v5/style.css'),/\.registration-step\.forward\{animation:/);
});
test('eight stable progress segments and circular validation-bound nav',()=>{
 const src=read('web/v5/Registration.jsx'),header=read('web/v5/OnboardingHeader.jsx'),css=read('web/v5/Registration2026.css');
 assert.match(header,/n===step\?'current'/);
 assert.match(src,/<OnboardingHeader step=\{step\}/);
 assert.match(src,/const stepValid=/);
 assert.match(src,/veyra-glass-navigation/);
 assert.match(src,/aria-label="Предыдущий шаг"/);
 assert.match(src,/Предпросмотр анкеты/);
 assert.match(css,/\.veyra-glass-arrow/);
 assert.match(css,/border-radius:50%!important/);
});
