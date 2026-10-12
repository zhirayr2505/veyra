import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const rooted=path=>new URL('../'+path,import.meta.url);
const contents=path=>readFileSync(rooted(path),'utf8');
const iconNames=readdirSync(rooted('public/veyra-v2/icons/outline')).filter(f=>f.endsWith('.svg'));
test('all 83 icons share one stroke system, no random selected backgrounds, identical published originals',()=>{
 assert.equal(iconNames.length,83);
 for(const name of iconNames)for(const [state,color] of [['outline','#777185'],['active','#6817FF'],['on-dark','#FFFFFF']]){
  const p='icons/'+state+'/'+name,served=contents('public/veyra-v2/'+p),original=contents('veyra-assets/'+p);
  assert.equal(served,original,p+' differs from its source asset');
  assert.match(served,/^<svg\b[^>]*xmlns=/);
  assert.match(served,/<\/svg>\s*$/);
  assert.ok(served.includes(color),p+' must use '+color);
  assert.doesNotMatch(served,/linearGradient|radialGradient|<filter\b|<script\b|javascript:|#FF6A9B|#FF126B|#FF4058|#F92377|#8F4AFF|circle cx="12" cy="12" r="11\.5"/i,p+' includes unsupported old decorations');
  const colors=[...served.matchAll(/#[\da-f]{6}/gi)].map(x=>x[0].toUpperCase());
  for(const actual of colors)assert.ok([color.toUpperCase(),'#FFFFFF'].includes(actual),p+' unexpected color '+actual);
 }
});
test('all core screens use one branded rounded wordmark, including error and discovery routes',()=>{
 const logo=contents('public/veyra-v2/brand/veyra-wordmark-purple.svg');
 assert.equal(logo,contents('veyra-assets/brand/veyra-wordmark-purple.svg'));
 assert.match(logo,/viewBox="0 0 905 207"/);
 assert.match(logo,/fill="#6817FF"/);
 assert.doesNotMatch(logo,/gradient|linearGradient|<text\b/i);
 assert.ok(logo.length>6500,'use the detailed approved rounded wordmark, not the crude capital letter construction');
 for(const p of ['web/v5/UI.jsx','web/v5/App.jsx','web/v5/Discover.jsx','web/v5/DiscoveryHub.jsx','web/v5/ErrorBoundary.jsx']){
  assert.doesNotMatch(contents(p),/\/assets\/veyra\/00_brand\/veyra_logo\.svg/,p+' still references an old logo');
 }
 assert.ok(contents('web/v5/UI.jsx').includes('veyra-wordmark-purple.svg'));
 assert.ok(contents('web/v5/DiscoveryHub.jsx').includes('<Logo width={145}'),'DiscoveryHub renders the approved shared wordmark');
 assert.ok(contents('web/v5/ErrorBoundary.jsx').includes('veyra_logo_primary.svg'));
});
test('brand-wide asset illustrations and badges use the same violet palette',()=>{
 for(const dir of ['illustrations','badges']){
  const filenames=readdirSync(rooted('public/veyra-v2/'+dir)).filter(x=>x.endsWith('.svg'));
  for(const name of filenames){
   const p=dir+'/'+name,s=contents('public/veyra-v2/'+p);
   assert.equal(s,contents('veyra-assets/'+p));
   assert.doesNotMatch(s,/#FF6A9B|#FF314E|#FC3458|#FC2362|linearGradient|radialGradient|<script\b/i,p);
  }
 }
 const css=contents('web/v5/BrandConsistency.css');
 assert.ok(contents('web/v5/App.jsx').includes("import './BrandConsistency.css'"));
 assert.ok(css.includes('#6817FF'));
 assert.doesNotMatch(css,/#FF6A9B|#FF126B|#FF4058/);
});
