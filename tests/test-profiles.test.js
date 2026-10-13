import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {testDB,user} from './helpers.js';
import {seedTestProfiles} from '../server/test-profiles.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';
import {notify,recommendations} from '../server/domain.js';
import {one} from '../server/db.js';
test('12 private fictional profiles: six women and six men, repeat-safe and no notifications',async()=>{
 const loadPortrait=async()=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b9a3dc"/></svg>');
 const db=await testDB(),images=new Map(),storage={put:async(k,b)=>images.set(k,await sharp(b).webp().toBuffer()),remove:async k=>images.delete(k)},env={APP_URL:'https://veyra-3806.onrender.com',RENDER_EXTERNAL_URL:'https://veyra-3806.onrender.com',OWNER_TELEGRAM_ID:'1'};
 try{await user(db,1);await db.query("UPDATE profiles SET looking_for=ARRAY['woman'],gender='man' WHERE user_id=1");assert.equal((await seedTestProfiles(db,storage,{...env,APP_URL:'https://other.example'},{loadPortrait})).status,'not_applicable');assert.equal((await seedTestProfiles(db,storage,env,{loadPortrait})).count,12);await seedTestProfiles(db,storage,env);assert.equal(images.size,12);assert.equal((await one(db,'SELECT count(*)::int n FROM profiles WHERE user_id=ANY($1::bigint[])',[TEST_PROFILE_IDS])).n,12);const sexes=(await db.query("SELECT gender,count(*)::int AS n FROM profiles WHERE user_id=ANY($1::bigint[]) GROUP BY gender",[TEST_PROFILE_IDS])).rows;
   assert.equal(sexes.find(row=>row.gender==='woman')?.n,6);
   assert.equal(sexes.find(row=>row.gender==='man')?.n,6);
   const owner=await one(db,'SELECT * FROM users WHERE id=1');const feed=await db.tx(q=>recommendations(q,owner,false,2));assert.equal(feed.profiles.length,2);for(const p of feed.profiles){assert.equal(p.gender,'woman');assert.equal(p.test_profile,true);assert.equal(p.photos.length,1);await notify(db,p.id,'test');}assert.equal((await one(db,'SELECT count(*)::int n FROM outbox')).n,0);assert.equal((await one(db,'SELECT count(*)::int n FROM users')).n,7);}finally{await db.close();}
});
