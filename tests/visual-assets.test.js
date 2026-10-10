import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const dir=new URL('../public/assets/veyra/04_details/',import.meta.url);
const svg=name=>readFileSync(new URL(name+'.svg',dir),'utf8');
test('branded SVG assets exist and contain safe markup',()=>{
 for(const name of ["interest-music","interest-travel","interest-cinema","interest-sport","interest-books","interest-coffee","interest-technology","interest-pets","interest-camera","interest-walk","interest-food","interest-art","interest-dance","interest-yoga","interest-fashion","reply","checks","check","refresh","people","down","views","online","match","missing-photo","gender-man","gender-woman","gender-all","empty-default","empty-match","empty-chat","empty-profile","empty-discover"]){
 const asset=svg(name);
 assert.match(asset,/<svg[^>]*xmlns=/);
 assert.match(asset,/<\/svg>$/);
 assert.doesNotMatch(asset,/<script\b|onload=|javascript:/i);
 }
});
test('registration and filtering have matching gender art',()=>{
 for(const name of ['man','woman','all'])assert.ok(existsSync(new URL('gender-'+name+'.svg',dir)));
});

test('premium icon system covers every tab, shortcut and three tones',()=>{
 const iconNames=['cards','cards_filled','heart','heart_filled','chat','chat_filled','user','user_filled','crown','gift','star','settings','filters','refresh','search','check','checks','camera','send','back','close','more','pin','plus','shield_check','sparkle','verified','undo','online','people','reply','down','match','missing-photo','views'];
 const root=new URL('../public/assets/veyra/05_premium_icons/',import.meta.url);
 for(const tone of ['pink','dark','white'])for(const name of iconNames){
  const url=new URL(tone+'/'+name+'.svg',root);
  assert.ok(existsSync(url),tone+'/'+name);
  const content=readFileSync(url,'utf8');
  assert.match(content,/^<svg[^>]+xmlns=/);
  assert.doesNotMatch(content,/<script\\b|onload=|javascript:/i);
 }
 for(const name of ['music','travel','cinema','sport','books','coffee','technology','pets','camera','walk','food','art','dance','yoga','fashion']){
  assert.ok(existsSync(new URL('interests/'+name+'.svg',root)));
 }
 for(const name of ['man','woman','all'])assert.ok(existsSync(new URL('gender/'+name+'.svg',root)));
 for(const art of ['discover-cards','match-hearts','chat-bubbles','review-shield','referral-gift']){
  assert.ok(existsSync(new URL('../public/graphics/illustrations/'+art+'-512.webp',import.meta.url)));
 }
});

test('approved refined duotone pack is complete and wired in every core screen',()=>{
 const path=new URL('../public/assets/veyra/05_premium_icons/',import.meta.url);
 for(const tone of ['dark','pink','white']){
  for(const name of ['home','home_filled','heart','heart_filled','chat','chat_filled','user','user_filled','crown','gift','star','settings','filters','search','verified','refresh']){
   const asset=new URL(tone+'/'+name+'.svg',path);
   assert.ok(existsSync(asset),asset.href);
   const source=readFileSync(asset,'utf8');
   assert.match(source,/^<svg[^>]*xmlns=/);
   assert.doesNotMatch(source,/<linearGradient\b|<radialGradient\b|<filter\b|javascript:|<script\b/i);
  }
 }
 for(const name of ['match','incoming','chat','discover','nearby','profile','gift','default']){
  const asset=new URL('../public/assets/veyra/06_duotone_art/'+name+'.svg',import.meta.url);
  assert.ok(existsSync(asset),asset.href);
  const source=readFileSync(asset,'utf8');
  assert.match(source,/^<svg[^>]*xmlns=/);
  assert.doesNotMatch(source,/<linearGradient\b|<radialGradient\b|<filter\b|javascript:|<script\b/i);
 }
 const ui=readFileSync(new URL('../web/v5/UI.jsx',import.meta.url),'utf8');
 assert.ok(ui.includes('/06_duotone_art/'));
 const discovery=readFileSync(new URL('../web/v5/Discover.jsx',import.meta.url),'utf8');
 assert.ok(discovery.includes('/06_duotone_art/discover.svg'));
 assert.doesNotMatch(discovery,/\/graphics\/illustrations\/discover-cards-512\.webp/);
});
