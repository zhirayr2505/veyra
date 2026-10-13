import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import sharp from 'sharp';

const root=new URL('../public/veyra-approved/dating_stage02/',import.meta.url);
const entries=[
 ['for_you_hero.webp',600,300],
 ['nearby_hero.webp',600,300],
 ['collection_common_interests.webp',320,426],
 ['collection_serious_relationships.webp',320,426],
 ['collection_travel.webp',320,426]
];
test('all five user-approved Dating Stage 02 image files are served from approved asset directory',async()=>{
 for(const [name,w,h] of entries){
  const path=new URL(name,root);
  assert.ok(existsSync(path),name+' must exist at approved runtime URL');
  const buf=readFileSync(path);
  assert.equal(buf.toString('ascii',0,4),'RIFF',name+' is a valid WebP binary');
  const meta=await sharp(buf).metadata();
  assert.equal(meta.format,'webp');
  assert.ok(meta.width>=w&&meta.height>=h,name+' has mobile-ready dimensions');
  assert.ok(buf.length>1400&&buf.length<450000,name+' is nonempty and cache-friendly');
  // A black export strip must never make it into a production illustration.
  const {data,info}=await sharp(buf).extract({left:0,top:meta.height-6,width:meta.width,height:6})
    .raw().toBuffer({resolveWithObject:true});
  let black=0;
  for(let i=0;i<data.length;i+=info.channels){
   if(data[i]<12&&data[i+1]<12&&data[i+2]<12)black++;
  }
  assert.ok(black<info.width*2,name+' has no black bar along its lower edge');
 }
});
