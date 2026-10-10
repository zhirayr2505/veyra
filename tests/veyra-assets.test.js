import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','veyra-assets');
const catalog=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
test('VEYRA v2 asset pack has complete independent SVG files',()=>{
 assert.equal(catalog.version,'2.0.0');
 assert.ok(catalog.assetsTotal>=330);
 assert.equal(catalog.assets.length,catalog.assetsTotal);
 assert.equal(catalog.counts.outline,catalog.counts.active);
 assert.equal(catalog.counts.active,catalog.counts.onDark);
 const unique=new Set(catalog.assets);assert.equal(unique.size,catalog.assets.length);
 for(const item of catalog.assets){
  assert.match(item,/^[a-z0-9/_.-]+\.svg$/i);
  const p=join(root,item);
  assert.ok(existsSync(p),item);
  const svg=readFileSync(p,'utf8');
  assert.match(svg,/^<svg\s[^>]*xmlns=/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|\sonload\s*=|javascript:|xlink:href\s*=|href\s*=\s*["']https?:/i);
 }
});
test('VEYRA v2 key onboarding and five navigation icons exist',()=>{
 for(const name of ['search','encounters','heart','chat','user','close','filter','location','premium','gift','verified','camera','check'])
  for(const folder of ['outline','active','on-dark'])assert.ok(existsSync(join(root,'icons',folder,name+'.svg')));
 for(const name of ['welcome','onboarding','no-profiles','no-likes','no-matches','no-chats','no-search','no-photos','premium','gift','safety','moderation'])
  assert.ok(existsSync(join(root,'illustrations',name+'.svg')));
 assert.ok(existsSync(join(root,'brand','veyra-wordmark-purple.svg')));
 assert.ok(existsSync(join(root,'brand','veyra-app-icon.svg')));
 assert.ok(existsSync(join(root,'tokens','tokens.css')));
});
