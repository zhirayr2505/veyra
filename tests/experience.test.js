import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
import {react} from '../server/domain.js';
async function fixture(ids){const db=await testDB();for(const id of ids)await user(db,id);const app=createApp(deps(db));const token=(await request(app).post('/api/auth').send({initData:initData(ids[0])})).body.token;return {db,app,aut:r=>r.set('Authorization','Bearer '+token)};}
test('profile pause hides discovery and incoming likes without revoking an existing chat',async()=>{
 const{db,app,aut}=await fixture([40,41,42]);try{
  await db.tx(q=>react(q,'40','41','like'));const match=await db.tx(q=>react(q,'41','40','like'));
  await db.tx(q=>react(q,'40','42','like'));
  assert.equal((await request(app).patch('/api/profile/visibility').send({paused:true})).status,401);
  assert.equal((await aut(request(app).patch('/api/profile/visibility')).set('Origin','https://foreign.example').send({paused:true})).status,403);
  assert.equal((await aut(request(app).patch('/api/profile/visibility')).send({paused:true})).status,200);
  assert.equal((await aut(request(app).get('/api/me'))).body.user.paused,true);
  const other=(await request(app).post('/api/auth').send({initData:initData(42)})).body.token;
  const incoming=await request(app).get('/api/likes').set('Authorization','Bearer '+other);
  assert.equal(incoming.body.count,0);
  const feed=await request(app).get('/api/feed').set('Authorization','Bearer '+other);assert.ok(feed.body.profiles.every(p=>String(p.id)!=='40'));
  assert.equal((await aut(request(app).get('/api/matches/'+match.match_id+'/messages'))).status,200);
  await aut(request(app).patch('/api/profile/visibility')).send({paused:false});
  const restored=await request(app).get('/api/likes').set('Authorization','Bearer '+other);assert.equal(restored.body.count,1);
 }finally{await db.close();}
});
test('Today batch respects remaining free views and never returns paused profiles',async()=>{
 const{db,app,aut}=await fixture([50,51,52,53,54,55,56]);try{
  for(const id of [51,52,53,54,55,56])await db.query("INSERT INTO today(user_id,activity,time_slot,expires_at) VALUES($1,'coffee','now',now()+interval '2 hours')",[id]);
  await db.query('UPDATE users SET paused=true WHERE id=51');
  await db.query('INSERT INTO daily_usage(user_id,views) VALUES(50,28)');
  const r=await aut(request(app).get('/api/feed?today=true&limit=6'));assert.equal(r.status,200);assert.equal(r.body.profiles.length,2);assert.ok(r.body.profiles.every(p=>String(p.id)!=='51'));
  assert.equal((await one(db,'SELECT views FROM daily_usage WHERE user_id=50')).views,30);
  const end=await aut(request(app).get('/api/feed?today=true&limit=6'));assert.equal(end.body.limited,true);assert.equal(end.body.profiles.length,0);
 }finally{await db.close();}
});
test('Today batch validates its size and repeat rendering does not charge duplicate views',async()=>{
 const{db,app,aut}=await fixture([60,61,62,63]);try{
  for(const id of [61,62,63])await db.query("INSERT INTO today(user_id,activity,time_slot,expires_at) VALUES($1,'walk','evening',now()+interval '2 hours')",[id]);
  assert.equal((await aut(request(app).get('/api/feed?today=true&limit=1000'))).status,400);
  for(let i=0;i<2;i++){const r=await aut(request(app).get('/api/feed?today=true&limit=6'));assert.equal(r.body.profiles.length,3);}
  assert.equal((await one(db,'SELECT views FROM daily_usage WHERE user_id=60')).views,3);
 }finally{await db.close();}
});

test('Undo permits one free reversal daily, and Premium permits more',async()=>{
 const{db,app,aut}=await fixture([70,71,72]);try{
  await db.tx(q=>react(q,'70','71','like'));
  const available=await aut(request(app).get('/api/reactions/last'));
  assert.equal(available.body.free_undo_left,1);
  const first=await aut(request(app).post('/api/reactions/undo')).send({target:'71'});
  assert.equal(first.status,200,JSON.stringify(first.body));
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM reactions WHERE actor=70 AND target=71")).n,0);
  await db.tx(q=>react(q,'70','72','pass'));
  const remaining=await aut(request(app).get('/api/reactions/last'));
  assert.equal(remaining.body.free_undo_left,0);
  assert.equal((await aut(request(app).post('/api/reactions/undo')).send({target:'72'})).status,402);
  await db.query("UPDATE users SET premium_until=now()+interval '1 day' WHERE id=70");
  const paid=await aut(request(app).post('/api/reactions/undo')).send({target:'72'});
  assert.equal(paid.status,200,JSON.stringify(paid.body));
 }finally{await db.close();}
});
