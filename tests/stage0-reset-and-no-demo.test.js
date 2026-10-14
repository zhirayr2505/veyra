import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {testDB,user,initData,deps} from './helpers.js';
import {one} from '../server/db.js';
import {createApp} from '../server/app.js';
import {recommendations,react} from '../server/domain.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';
import {applyRegistrationReset,RESET_ID,RESET_TARGET} from '../server/launch-reset.js';

const manifest={
 postgres:{id:'pg-test-snapshot',sha256:'a'.repeat(64),bytes:512000,restore_tested:true},
 storage:{id:'storage-test-snapshot',sha256:'b'.repeat(64),bytes:10000,objects:6,objects_verified:6,restore_tested:true}
};
const prod={APP_URL:RESET_TARGET,RENDER_EXTERNAL_URL:RESET_TARGET,OWNER_TELEGRAM_ID:'1'};
const count=async(db,table)=>(await one(db,`SELECT count(*)::int AS n FROM ${table}`)).n;

test('reset rejects missing/unverified backups and an unrelated Render URL',async()=>{
 const db=await testDB();
 try{
  await user(db,1);
  const blocked=await applyRegistrationReset(db,prod);
  assert.equal(blocked.status,'blocked_backup_required');
  assert.equal(blocked.id,RESET_ID);
  assert.equal((await applyRegistrationReset(db,prod,{backupManifest:{...manifest,storage:{...manifest.storage,objects_verified:0}}})).status,'blocked_backup_required');
  assert.equal((await applyRegistrationReset(db,{...prod,APP_URL:'https://other.invalid'},{backupManifest:manifest})).status,'not_applicable');
  assert.equal(await count(db,'profiles'),1);
  assert.equal(await count(db,'audit_log'),0);
 }finally{await db.close()}
});

test('one-time reset removes dating data, queues files and preserves all payment records and Premium',async()=>{
 const db=await testDB();
 try{
  await user(db,1,{premium:true});await user(db,2);
  const paid=randomUUID(),refunded=randomUUID(),match=randomUUID();
  await db.query("INSERT INTO orders(id,user_id,sku,kind,amount,total,status,precheckout_id) VALUES($1,1,'premium_day','premium',1,25,'paid','accepted-checkout')",[paid]);
  await db.query("INSERT INTO orders(id,user_id,sku,kind,amount,total,status,telegram_charge) VALUES($1,2,'premium_day','premium',1,25,'refunded','refunded-charge')",[refunded]);
  await db.query("INSERT INTO veys_wallets(user_id,balance) VALUES(1,100)");
  await db.query("INSERT INTO veys_ledger(id,user_id,delta,balance_after,action,source,reference) VALUES($1,1,100,100,'topup','stars',$2)",[randomUUID(),randomUUID()]);
  await db.query("INSERT INTO matches(id,a,b) VALUES($1,1,2)",[match]);
  await db.query("INSERT INTO messages(id,match_id,sender,body,client_id) VALUES($1,$2,1,'Message to remove',$3)",[randomUUID(),match,randomUUID()]);
  await db.query("INSERT INTO sessions(hash,user_id,scope,expires_at) VALUES('old-session',1,'user',now()+interval '1 day')");
  const first=await applyRegistrationReset(db,prod,{backupManifest:manifest});
  assert.equal(first.status,'completed');assert.equal(first.id,RESET_ID);
  assert.equal(first.deleted.profiles,2);assert.equal(first.deleted.photos,6);
  for(const table of ['profiles','photos','sessions','matches','messages','registration_drafts','reactions','impressions'])
   assert.equal(await count(db,table),0,table);
  assert.equal(await count(db,'storage_gc'),6);
  assert.equal(await count(db,'orders'),2);
  assert.equal(await count(db,'veys_wallets'),1);
  assert.equal(await count(db,'veys_ledger'),1);
  assert.equal((await one(db,"SELECT status,precheckout_id FROM orders WHERE id=$1",[paid])).precheckout_id,'accepted-checkout');
  assert.equal((await one(db,"SELECT status FROM orders WHERE id=$1",[refunded])).status,'refunded');
  assert.ok((await one(db,'SELECT premium_until FROM users WHERE id=1')).premium_until);
  const aud=await one(db,"SELECT metadata FROM audit_log WHERE action='registration.reset' AND subject=$1",[RESET_ID]);
  assert.equal(aud.metadata.deleted.profiles,2);
  assert.equal(aud.metadata.postgres_backup_id,manifest.postgres.id);
  await user(db,3);
  const again=await applyRegistrationReset(db,prod,{backupManifest:manifest});
  assert.equal(again.already_completed,true);
  assert.equal(await count(db,'profiles'),1,'repeat must preserve newly registered profiles');
  const app=createApp(deps(db));const auth=await request(app).post('/api/auth').send({initData:initData(1)});
  assert.equal(auth.status,200);
  const me=await request(app).get('/api/me').set('Authorization','Bearer '+auth.body.token);
  assert.equal(me.status,200);assert.equal(me.body.profile,null);
  assert.ok(me.body.user.premium_until);
 }finally{await db.close()}
});

test('owner login never seeds demo, endpoints are absent, legacy synthetic identities stay hidden',async()=>{
 const db=await testDB();
 try{
  await user(db,1);await user(db,TEST_PROFILE_IDS[0]);
  const app=createApp(deps(db));
  const auth=await request(app).post('/api/auth').send({initData:initData(1)});
  assert.equal(auth.status,200);
  const bearer='Bearer '+auth.body.token;
  const seed=await request(app).post('/api/owner/seed-test-profiles').set('Authorization',bearer).send({});
  assert.equal(seed.status,404);
  const demoReset=await request(app).post('/api/owner/reset-demo-interactions').set('Authorization',bearer).send({});
  assert.equal(demoReset.status,404);
  const owner=await one(db,'SELECT * FROM users WHERE id=1');
  const result=await db.tx(q=>recommendations(q,owner,false,8,'for_you',{demo:true}));
  assert.equal(result.profiles.length,0);
  await assert.rejects(()=>db.tx(q=>react(q,1,TEST_PROFILE_IDS[0],'like')),/PROFILE_NOT_FOUND/);
  const profile=await request(app).get('/api/profiles/'+TEST_PROFILE_IDS[0]).set('Authorization',bearer);
  assert.equal(profile.status,404);
  assert.equal(await count(db,'users'),2,'no extra fake profiles after sign-in');
 }finally{await db.close()}
});

test('production UI contains no demo mode, badges, or owner seed trigger',async()=>{
 for(const path of ['web/v5/App.jsx','web/v5/DiscoveryHub.jsx','web/v5/Discover.jsx','web/v5/Member.jsx']){
  const body=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.doesNotMatch(body,/DemoStrip|demoMode|demoStatus|seed-test-profiles|vx-demo|test_profile|ДЕМО|Тестовые анкеты VEYRA/i,path);
 }
 const server=await readFile(new URL('../server/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(server,/seed-test-profiles|reset-demo-interactions|req\.query\.demo|demo:b\.demo/i);
 const startup=await readFile(new URL('../server/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(startup,/applyRegistrationReset\(/);
});
