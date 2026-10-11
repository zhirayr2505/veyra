import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('Work-approved 52 system icons, 12 compatible glyphs and 20 interest icons are installed at repo root and served identically',()=>{
 const pack=JSON.parse(read('VEYRA_ASSET_PACK/asset_manifest.json'));
 assert.equal(pack.iconNames.length,64);
 assert.equal(pack.interestNames.length,20);
 for(const name of pack.iconNames)for(const [state,color] of [['inactive','#777185'],['active','#6817FF'],['on_dark','#FFFFFF']]){
  const rel='01_icons/'+state+'/'+name+'.svg';
  const source=read('VEYRA_ASSET_PACK/'+rel);
  assert.equal(source,read('public/veyra-approved/'+rel));
  assert.match(source,/viewBox="0 0 24 24"/);
  assert.match(source,/stroke-width="2"/);
  assert.ok(source.includes(color),rel);
  assert.doesNotMatch(source,/<script\b|<foreignObject\b|javascript:|xlink:href\s*=/i);
 }
 for(const name of pack.interestNames)for(const [state,color] of [['normal','#6817FF'],['selected','#FFFFFF']]){
  const rel='02_interest_icons/svg/'+state+'/'+name+'.svg';
  const source=read('VEYRA_ASSET_PACK/'+rel);
  assert.equal(source,read('public/veyra-approved/'+rel));
  assert.ok(source.includes(color));
 }
});
test('all five VEYRA navigation icons resolve through Work-approved pack with consistent inactive / active paths',()=>{
 const ui=read('web/v5/UI.jsx');
 assert.match(ui,/const approvedBase='\/veyra-approved\/'/);
 assert.match(ui,/heart_filled:'heart'/);
 assert.match(ui,/chat:'chats'/);
 assert.match(ui,/user:'profile'/);
 assert.match(ui,/encounters:'cards'/);
 assert.match(ui,/state==='inactive'/);
 assert.match(read('web/v5/preload.js'),/01_icons\/active\/heart\.svg/);
 const reg=read('web/v5/Registration.jsx');
 assert.match(reg,/veyra-approved\/01_icons/);
 assert.match(reg,/k==='all'\?'everyone':k/);
 const filters=read('web/v5/FeedFilters.jsx');
 assert.match(filters,/veyra-approved\/01_icons/);
 assert.ok(existsSync(new URL('public/veyra-approved/01_icons/active/everyone.svg',root)));
});
