import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('step navigation uses supported native ViewTransition and a noninteractive WAAPI exit snapshot',()=>{
 const src=read('web/v5/Registration.jsx');
 for(const s of ['document.startViewTransition','flushSync(change)','cloneNode(true)','clone.inert=true','incoming.animate','outgoing.finished','prefers-reduced-motion','stepTransitionRef.current'])assert.ok(src.includes(s),s);
 assert.match(src,/setTimeout\(\(\)=>\{clone\?\.remove\(\);done\(\)\},duration\)/);
 assert.match(src,/data-step-heading/);
 assert.match(src,/\.focus\(\{preventScroll:true\}\)/);
});
test('one stable header and 8 progressive segments, moving CTA label and staggered entry',()=>{
 const src=read('web/v5/Registration.jsx'),header=read('web/v5/OnboardingHeader.jsx');
 const css=read('web/v5/RegistrationTransitions.css');
 assert.match(header,/n===step\?'current'/);
 assert.match(src,/<OnboardingHeader step=\{step\}/);
 assert.match(src,/veyra-smart-next-old-label/);
 for(const token of ['::view-transition-old(veyra-registration-step)','::view-transition-new(veyra-registration-step)','@keyframes veyraStepEnterLeft','@keyframes veyraStepEnterRight','@keyframes veyraItemReveal','@keyframes veyraLabelOut','@keyframes veyraLabelIn','@media(prefers-reduced-motion:reduce)'])assert.ok(css.includes(token),token);
});
