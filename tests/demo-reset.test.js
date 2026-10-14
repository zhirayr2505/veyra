import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {seedTestProfiles} from '../server/test-profiles.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';
import {one} from '../server/db.js';

test('owner can repeat photo demo while real matches, chats, photos and users remain unchanged',async()=>{
 const db=await testDB();
 const photoBytes=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#dac3f4"/></svg>');
 try{
  await user(db,1);await user(db,2);
  const storage={put:async()=>{},remove:async()=>{}};
  await seedTestProfiles(db,storage,{APP_URL:'https://veyra-3806.onrender.com',RENDER_EXTERNAL_URL:'https://veyra-3806.onrender.com',OWNER_TELEGRAM_ID:'1'},{loadPortrait:async()=>photoBytes});
  const fake=TEST_PROFILE_IDS[0],demoMatch=randomUUID(),realMatch=randomUUID(),demoMsg=randomUUID(),realMsg=randomUUID();
  await db.query("INSERT INTO reactions(actor,target,kind) VALUES($1,$2,'like'),($2,$1,'like')",[1,fake]);
  await db.query("INSERT INTO impressions(viewer,target) VALUES($1,$2)",[1,fake]);
  await db.query("INSERT INTO matches(id,a,b) VALUES($1,$2,$3)",[demoMatch,1,fake]);
  await db.query("INSERT INTO messages(id,match_id,sender,body,client_id) VALUES($1,$2,$3,'Демо-чат',$4)",[demoMsg,demoMatch,1,randomUUID()]);
  await db.query("INSERT INTO matches(id,a,b) VALUES($1,$2,$3)",[realMatch,1,2]);
  await db.query("INSERT INTO messages(id,match_id,sender,body,client_id) VALUES($1,$2,$3,'Настоящий чат',$4)",[realMsg,realMatch,1,randomUUID()]);
  const app=createApp(deps(db));
  const ownerResponse=await request(app).post('/api/auth').send({initData:initData(1)});
  const otherResponse=await request(app).post('/api/auth').send({initData:initData(2)});
  const auth=t=>'Bearer '+t;
  const guest=await request(app).post('/api/owner/reset-demo-interactions').set('Authorization',auth(otherResponse.body.token)).send({});
  assert.equal(guest.status,403);
  const owner=await request(app).post('/api/owner/reset-demo-interactions').set('Authorization',auth(ownerResponse.body.token)).send({});
  assert.equal(owner.status,200);
  assert.deepEqual({profiles:owner.body.profiles,reset_matches:owner.body.reset_matches,reset_reactions:owner.body.reset_reactions},{profiles:12,reset_matches:1,reset_reactions:2});
  assert.equal(await one(db,'SELECT id FROM matches WHERE id=$1',[demoMatch]),undefined);
  assert.equal(await one(db,'SELECT id FROM messages WHERE id=$1',[demoMsg]),undefined);
  assert.ok(await one(db,'SELECT id FROM matches WHERE id=$1',[realMatch]));
  assert.ok(await one(db,'SELECT id FROM messages WHERE id=$1',[realMsg]));
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM photos WHERE user_id=ANY($1::bigint[])',[TEST_PROFILE_IDS])).n,48);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM reactions WHERE actor=$1 AND target=$2',[1,fake])).n,0);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM impressions WHERE viewer=$1 AND target=$2',[1,fake])).n,0);
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM audit_log WHERE action='owner.demo.reset'")).n,1);
  const again=await request(app).post('/api/owner/reset-demo-interactions').set('Authorization',auth(ownerResponse.body.token)).send({});
  assert.equal(again.status,200);assert.equal(again.body.reset_matches,0);
 }finally{await db.close();}
});


test('upgrading the photo gallery once restores exhausted demo cards without deleting real reactions',async()=>{
 const db=await testDB();
 const bytes=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#dab9f1"/></svg>');
 const files=new Map(),storage={put:async(key,data)=>files.set(key,data),get:async key=>{if(!files.has(key))throw Error('NOT_FOUND');return files.get(key)},remove:async key=>files.delete(key)};
 const env={APP_URL:'https://veyra-3806.onrender.com',RENDER_EXTERNAL_URL:'https://veyra-3806.onrender.com',OWNER_TELEGRAM_ID:'1'};
 try{
  await user(db,1);await user(db,2);
  const initial=await seedTestProfiles(db,storage,env,{loadPortrait:async()=>bytes});
  assert.equal(initial.photos_per_profile,4);
  assert.equal(files.size,48);
  const demoId=TEST_PROFILE_IDS[0],demoMatch=randomUUID(),realMatch=randomUUID();
  await db.query("INSERT INTO reactions(actor,target,kind) VALUES($1,$2,'like'),($2,$1,'like'),($1,2,'like')",[1,demoId]);
  await db.query('INSERT INTO impressions(viewer,target) VALUES($1,$2)',[1,demoId]);
  await db.query('INSERT INTO matches(id,a,b) VALUES($1,$2,$3)',[demoMatch,1,demoId]);
  await db.query('INSERT INTO matches(id,a,b) VALUES($1,$2,$3)',[realMatch,1,2]);
  // Simulate a previous gallery version becoming outdated.
  await db.query("DELETE FROM audit_log WHERE action='test_profiles.seed' AND subject LIKE 'owner-demo-gallery-four-photos-rich-interests-%'");
  const refreshed=await seedTestProfiles(db,storage,env,{loadPortrait:async()=>{throw Error('Existing portrait should be reused')}});
  assert.equal(refreshed.auto_reset,true);
  assert.equal(refreshed.reset_matches,1);
  assert.equal(refreshed.reset_reactions,2);
  assert.equal(files.size,48);
  assert.equal((await one(db,'SELECT count(*)::int n FROM reactions WHERE actor=$1 AND target=$2',[1,demoId])).n,0);
  assert.ok(await one(db,"SELECT 1 FROM reactions WHERE actor=$1 AND target=2 AND kind='like'",[1]));
  assert.equal(await one(db,'SELECT id FROM matches WHERE id=$1',[demoMatch]),undefined);
  assert.ok(await one(db,'SELECT id FROM matches WHERE id=$1',[realMatch]));
  assert.equal((await one(db,'SELECT count(*)::int n FROM photos WHERE user_id=ANY($1::bigint[])',[TEST_PROFILE_IDS])).n,48);
  assert.deepEqual((await db.query('SELECT position FROM photos WHERE user_id=$1 ORDER BY position',[demoId])).rows.map(row=>row.position),[0,1,2,3]);
  const repeated=await seedTestProfiles(db,storage,env);
  assert.equal(repeated.auto_reset,undefined);
  assert.equal((await one(db,'SELECT count(*)::int n FROM audit_log WHERE action=$1',['owner.demo.auto_reset'])).n,2);
 }finally{await db.close();}
});
