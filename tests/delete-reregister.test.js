import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,env,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
test('deleted Telegram member can sign up again without restoring their old photos or conversations',async()=>{
 const db=await testDB();try{
 await user(db,60);await user(db,61);const app=createApp(deps(db));
 const auth=async (id=60)=>(await request(app).post('/api/auth').send({initData:initData(id)})).body.token;
 const first=await auth();assert.ok(first);
 const before=await request(app).get('/api/me').set('Authorization','Bearer '+first);assert.ok(before.body.profile);
 const del=await request(app).delete('/api/account').set('Authorization','Bearer '+first).send({confirm:'DELETE'});
 assert.equal(del.status,200);assert.equal(del.body.deleted,true);
 assert.equal((await request(app).get('/api/me').set('Authorization','Bearer '+first)).status,401);
 assert.equal((await one(db,'SELECT status FROM users WHERE id=60')).status,'deleted');
 assert.equal((await one(db,'SELECT count(*)::int n FROM photos WHERE user_id=60')).n,0);
 const notice=await one(db,"SELECT payload FROM outbox WHERE recipient=60 AND payload->>'text' LIKE '💔 Аккаунт VEYRA удалён%'");assert.ok(notice);
 const again=await auth();assert.ok(again);
 const fresh=await request(app).get('/api/me').set('Authorization','Bearer '+again);
 assert.equal(fresh.status,200);assert.equal(fresh.body.profile,null);assert.equal(fresh.body.registration,null);
 assert.equal(fresh.body.photos.length,0);
 }finally{await db.close();}
});
test('Telegram owner gets no-charge premium resources after signed re-registration',async()=>{
 const db=await testDB();try{
 await user(db,1);await db.query("UPDATE users SET status='deleted' WHERE id=1");
 const app=createApp(deps(db));
 const auth=await request(app).post('/api/auth').send({initData:initData(1)});
 assert.equal(auth.status,200);const me=await request(app).get('/api/me').set('Authorization','Bearer '+auth.body.token);
 assert.equal(me.status,200);assert.equal(me.body.user.admin_role,'owner');assert.ok(me.body.user.superlikes>=100000);
 const product=await request(app).get('/api/products').set('Authorization','Bearer '+auth.body.token);
 assert.equal(product.body.owner_free,true);assert.equal(product.body.enabled,true);
 }finally{await db.close();}
});

test('ordinary user cannot access synthetic profiles; owner can retry a match after test reset',async()=>{
 const {react}=await import('../server/domain.js');
 const {TEST_PROFILE_IDS}=await import('../server/test-profile-ids.js');
 const id=TEST_PROFILE_IDS[0],db=await testDB();
 try{
  await user(db,1);await user(db,71);await user(db,id);
  const app=createApp(deps(db));
  const auth=async id=>(await request(app).post('/api/auth').send({initData:initData(id)})).body.token;
  const owner=await auth(1),regular=await auth(71);
  assert.equal((await request(app).post('/api/reactions').set('Authorization','Bearer '+regular).send({target:id,kind:'like'})).status,403);
  assert.equal((await request(app).post('/api/owner/reset-test-interactions').set('Authorization','Bearer '+regular).send({})).status,403);
  const match=await db.tx(q=>react(q,'1',id,'like'));assert.equal(match.matched,true);
  const send=await request(app).post('/api/matches/'+match.match_id+'/messages').set('Authorization','Bearer '+owner).send({kind:'text',body:'Тестовое сообщение',client_id:'a787e9d3-5e6d-4270-a553-13053b246a89'});
  assert.equal(send.status,200);
  const simulated=await one(db,'SELECT body FROM messages WHERE match_id=$1 AND sender=$2 ORDER BY created_at DESC LIMIT 1',[match.match_id,id]);
  assert.match(simulated.body,/Тестов/iu);
  const reset=await request(app).post('/api/owner/reset-test-interactions').set('Authorization','Bearer '+owner).send({});
  assert.equal(reset.status,200);assert.equal(reset.body.reset_matches,1);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM matches')).n,0);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM reactions WHERE actor=1 OR target=1')).n,0);
  assert.equal((await db.tx(q=>react(q,'1',id,'like'))).matched,true);
 }finally{await db.close()}
});
