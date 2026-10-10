import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,deps,env} from './helpers.js';
import {createApp} from '../server/app.js';
import {seedTestProfiles} from '../server/test-profiles.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';

test('owner gets Premium and paid gifts as zero-charge QA actions; ordinary user cannot bypass flags',async()=>{
 const db=await testDB();try{
  await user(db,1);await user(db,10);
  const app=createApp(deps(db));
  const ownerAuth=await request(app).post('/api/auth').send({initData:initData(1)});
  const normalAuth=await request(app).post('/api/auth').send({initData:initData(10)});
  const owner=ownerAuth.body.token,normal=normalAuth.body.token;
  assert.equal(ownerAuth.status,200);assert.equal(normalAuth.status,200);
  const ownMe=(await request(app).get('/api/me').set('Authorization','Bearer '+owner)).body;
  assert.equal(ownMe.user.owner_test,true);
  const normMe=(await request(app).get('/api/me').set('Authorization','Bearer '+normal)).body;
  assert.equal(normMe.user.owner_test,false);
  await db.query("UPDATE feature_flags SET enabled=false WHERE key='payments'");
  const catalog=await request(app).get('/api/gifts/catalog').set('Authorization','Bearer '+owner);
  assert.equal(catalog.body.owner_test,true);
  assert.equal(catalog.body.payments_enabled,true);
  const outsiderCatalog=await request(app).get('/api/gifts/catalog').set('Authorization','Bearer '+normal);
  assert.equal(outsiderCatalog.body.payments_enabled,false);
  const products=await request(app).get('/api/products').set('Authorization','Bearer '+owner);
  assert.equal(products.body.enabled,true);
  assert.equal(products.body.owner_test,true);
  const sku=products.body.products.find(p=>p.kind==='premium')?.sku;
  assert.ok(sku);
  const free=await request(app).post('/api/payments/invoice').set('Authorization','Bearer '+owner).send({sku,provider:'stars'});
  assert.equal(free.status,200,JSON.stringify(free.body));assert.equal(free.body.owner_test,true);assert.equal(free.body.url,undefined);
  const rejected=await request(app).post('/api/payments/invoice').set('Authorization','Bearer '+normal).send({sku,provider:'stars'});
  assert.equal(rejected.status,503);
  const gift=await request(app).post('/api/gifts/send').set('Authorization','Bearer '+owner).send({target:'10',gift_key:'rose',note:'test gift',client_id:'51fda4c7-33a7-40a1-86e1-99812826b28c'});
  assert.equal(gift.status,201,JSON.stringify(gift.body));assert.equal(gift.body.status,'delivered');
  const actual=(await db.query('SELECT stars,order_id FROM gifts WHERE sender=1')).rows[0];
  assert.equal(actual.stars,0);assert.equal(actual.order_id,null);
 }finally{await db.close()}
});

test('owner-only synthetic girls are labelled, approved, idempotent and cannot be seeded by outsiders',async()=>{
 const db=await testDB();try{
  await user(db,1);await user(db,10);
  const demo={...env,APP_URL:'https://veyra-3806.onrender.com',RENDER_EXTERNAL_URL:'https://veyra-3806.onrender.com',NODE_ENV:'production'};
  const d=deps(db);const uploads=[];const storage={...d.storage,put:async(k,b)=>{uploads.push(k)}};
  const app=createApp({...d,env:demo,storage});
  const normal=(await request(app).post('/api/auth').send({initData:initData(10)})).body.token;
  const forbidden=await request(app).post('/api/owner/test-profiles/seed').set('Authorization','Bearer '+normal).send({});
  assert.equal(forbidden.status,403);
  const owner=(await request(app).post('/api/auth').send({initData:initData(1)})).body.token;
  const seeded=await request(app).post('/api/owner/test-profiles/seed').set('Authorization','Bearer '+owner).send({});
  assert.equal(seeded.status,200,JSON.stringify(seeded.body));assert.equal(seeded.body.count,6);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM profiles WHERE moderation='approved' AND user_id=ANY($1::bigint[])",[TEST_PROFILE_IDS])).rows[0].n,6);
  assert.equal(uploads.length,18);
  const again=await request(app).post('/api/owner/test-profiles/seed').set('Authorization','Bearer '+owner).send({});
  assert.equal(again.status,200);assert.equal(uploads.length,18);
 }finally{await db.close()}
});
