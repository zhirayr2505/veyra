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
test('the Work-approved wordmark and all empty-state illustrations are served and wired',()=>{
 const logo='00_brand/veyra_logo_primary.svg';
 assert.equal(read('VEYRA_ASSET_PACK/'+logo),read('public/veyra-approved/'+logo));
 for(const name of ['no_matches_yet','no_messages_yet','no_incoming_likes','no_nearby_people','no_results','empty_gifts','nothing_here_yet','take_a_break','no_notifications','empty_favorites']){
  const rel='04_empty_states/svg/'+name+'.svg';
  assert.equal(read('VEYRA_ASSET_PACK/'+rel),read('public/veyra-approved/'+rel));
 }
 const ui=read('web/v5/UI.jsx');
 const liquid=read('web/v5/LiquidLogo.jsx');
 assert.ok(liquid.includes('/veyra-design/veyra-wordmark-purple.svg'));
 assert.ok(ui.includes("import {LiquidLogo} from './LiquidLogo.jsx'"));
 assert.ok(ui.includes("base+'04_empty_states/svg/'"));
 // Both Discover and DiscoveryHub render the shared approved LiquidLogo;
 // ErrorBoundary retains its static approved fallback.
 assert.ok(read('web/v5/Discover.jsx').includes('<Logo width={126} className="feed-brand"/>'));
 assert.ok(read('web/v5/DiscoveryHub.jsx').includes('<Logo width={145}'));
 assert.ok(read('web/v5/ErrorBoundary.jsx').includes('/veyra-approved/00_brand/veyra_logo_primary.svg'));
 assert.ok(read('web/v5/LiquidLogo.css').includes('veyra-wordmark-purple.svg'));
});
test('all five VEYRA navigation icons resolve through Work-approved pack with consistent inactive / active paths',()=>{
 const ui=read('web/v5/UI.jsx');
 assert.match(ui,/const approvedBase='\/veyra-approved\/'/);
 assert.match(ui,/heart_filled:'heart'/);
 assert.match(ui,/chat:'chats'/);
 assert.match(ui,/user:'profile'/);
 assert.match(ui,/encounters:'cards'/);
 assert.match(ui,/\?approvedBase\+'01_icons\/'.*state/);
 assert.match(ui,/approvedBase\+'01_icons\/'.*info\.svg/);
 assert.doesNotMatch(ui,/oldBase|veyra-v2/);
 assert.match(read('web/v5/preload.js'),/veyra-approved\/01_icons\/active/);
 const reg=read('web/v5/Registration.jsx');
 assert.match(reg,/veyra-design\/icons/);
 assert.match(reg,/DesignGlyph name=/);
 const filters=read('web/v5/FeedFilters.jsx');
 assert.match(filters,/veyra-approved\/01_icons/);
 assert.ok(existsSync(new URL('public/veyra-approved/01_icons/active/everyone.svg',root)));
});
