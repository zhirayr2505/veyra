import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('profile editor reuses the same phone image pipeline as onboarding',()=>{
 const reg=read('web/v5/Registration.jsx');
 const editor=read('web/v5/ProfileEditor.jsx');
 for(const code of [reg,editor]){
  assert.match(code,/compressPortrait\(/);
  assert.match(code,/uploadPhoto\(/);
  assert.match(code,/uploadPhoto\(compressed/);
 }
 assert.match(editor,/veyra-editor-upload-status/);
});
test('legal and completion actions use shared controls, logo and palette',()=>{
 const legal=read('web/v5/Legal.jsx'),completion=read('web/v5/CompletionScene.jsx');
 assert.match(legal,/<Button variant="primary"/);
 assert.match(completion,/<Button variant="secondary"/);
 for(const code of [legal,completion]){
  assert.match(code,/OnboardingUnified\.css/);
  assert.match(code,/<Logo /);
 }
 assert.doesNotMatch(read('web/v5/CompletionScene.css'),/\.vc-logo-sheen:after/);
 const style=read('web/v5/OnboardingUnified.css');
 for(const x of ['--vx-gradient-primary','--vx-radius-button','--vx-height-primary'])assert.ok(style.includes(x));
});
