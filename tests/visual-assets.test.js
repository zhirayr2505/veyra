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
