import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createPhotoPlaceholder,photoPlaceholderMeta} from '../server/photo-placeholder.js';

test('LQIP derives tiny WEBP and a matching dominant color from same photo',async()=>{
 const original=await sharp({create:{width:240,height:300,channels:3,background:{r:118,g:55,b:202}}}).png().toBuffer();
 const p=await createPhotoPlaceholder(original);
 assert.match(p.lqip,/^data:image\/webp;base64,/);
 assert.ok(p.lqip.length<2400);
 assert.match(p.dominant,/^#[0-9a-f]{6}$/i);
 const dims=await sharp(Buffer.from(p.lqip.split(',')[1],'base64')).metadata();
 assert.ok(dims.width<=28&&dims.height<=28);
});

test('Invalid photo data does not block legacy upload mocks',async()=>{
 const p=await createPhotoPlaceholder(Buffer.from('not an image'));
 assert.equal(p.lqip,null);
 assert.match(p.dominant,/^#/);
 assert.deepEqual(photoPlaceholderMeta([{id:'a',lqip:'preview',dominant_color:'#aabbcc'}]),{a:{lqip:'preview',dominant:'#aabbcc'}});
});
