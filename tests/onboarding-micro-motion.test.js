import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('selected gender, preference and goal Choice pulses via transform only for 220ms',()=>{
 const css=read('web/v5/UiPrimitives.css');
 assert.match(css,/@keyframes veyraChoiceSelect/);
 assert.match(css,/\.22s cubic-bezier\(\.2,\.8,\.2,1\)/);
 assert.match(css,/transform:scale\(\.97\)/);
 assert.match(css,/transform:scale\(1\.02\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('registration camera progress scales on compositor and photo tiles reveal once',()=>{
 const reg=read('web/v5/Registration.jsx'),css=read('web/v5/Registration2026.css');
 assert.match(reg,/style=\{\{transform:'scaleX\('/);
 assert.match(css,/@keyframes veyraPhotoSlotIn/);
 assert.match(css,/transition:transform \.18s linear/);
});
test('successful final registration shows a one-shot 1.4s heart burst',()=>{
 const jsx=read('web/v5/CompletionScene.jsx'),css=read('web/v5/CompletionScene.css');
 assert.match(jsx,/pending&&<div className="vc-success-burst"/);
 assert.match(css,/@keyframes vcOneShotHeart/);
 assert.match(css,/animation:vcOneShotHeart 1\.4s/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(read('web/v5/Registration.jsx'),/haptic\('success'\)/);
});
