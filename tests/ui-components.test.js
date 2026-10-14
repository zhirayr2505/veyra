import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared controls support every button variant and accessible choices',()=>{
 const code=read('web/v5/UI.jsx'),css=read('web/v5/UiPrimitives.css');
 assert.match(code,/export function Button\(/);
 assert.match(code,/variant,size='large',loading=false/);
 for(const variant of ['primary','secondary','ghost','danger'])assert.ok(css.includes('.veyra-button-'+variant));
 assert.match(code,/export function Choice\(/);
 assert.match(code,/aria-pressed=\{selected\}/);
 assert.match(css,/--vx-radius-button/);
});
test('one InterestChip powers profile, preview, registration picker and feed',()=>{
 const code=read('web/v5/UI.jsx');
 assert.match(code,/export function InterestChip\(/);
 for(const file of ['Member.jsx','OnboardingOptions.jsx','Discover.jsx']){
  assert.ok(read('web/v5/'+file).includes('<InterestChip'),file);
 }
 assert.match(read('web/v5/OnboardingOptions.jsx'),/<Choice/);
 assert.match(read('web/v5/Registration.jsx'),/<Choice/);
 assert.match(read('web/v5/ProfilePreview.jsx'),/<Button variant="primary"/);
 assert.match(read('web/v5/ProfilePreview.jsx'),/<Member id="registration-preview" readOnly/);
});
