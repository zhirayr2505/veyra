import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('central haptics offer selection, light impact, and success/error notifications',()=>{
 const source=read('web/v5/haptics.js');
 for(const method of ['selectionChanged','impactOccurred','notificationOccurred'])assert.ok(source.includes(method));
 const reg=read('web/v5/Registration.jsx');
 for(const kind of ['light','success','error','selection'])assert.ok(reg.includes("haptic('"+kind+"')"));
});
test('interactive touch controls are at least 44px with accessible focus',()=>{
 const css=read('web/v5/UiPrimitives.css');
 const reg=read('web/v5/Registration2026.css');
 assert.match(css,/button\.veyra-interest-chip[^\n]*min-height:44px/);
 assert.match(reg,/min-width:44px;min-height:44px/);
 assert.match(css,/:focus-visible/);
});
