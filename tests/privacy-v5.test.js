import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,deps,env} from './helpers.js';
import {createApp} from '../server/app.js';
import {react} from '../server/domain.js';
import {drainOutbox} from '../server/bots.js';

test('deleted account shows clean registration on next Telegram sign-in, with confirmation queued',async()=>{
 const db=await testDB();
 try{
  await user(db,10);await user(db,11);
  await db.tx(q=>react(q,'10','11','like'));
  await db.tx(q=>react(q,'11','10','like'));
  const app=createApp(deps(db));
  const sign=()=>request(app).post('/api/auth').send({initData:initData(10)});
  const auth=await sign();assert.equal(auth.status,200);
  const before=await request(app).get('/api/me').set('Authorization','Bearer '+auth.body.token);
  assert.ok(before.body.profile);
  const del=await request(app).delete('/api/account').set('Authorization','Bearer '+auth.body.token).send({confirm:'DELETE'});
  assert.equal(del.status,200,JSON.stringify(del.body));
  assert.equal((await db.query("SELECT status FROM users WHERE id=10")).rows[0].status,'deleted');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM photos WHERE user_id=10')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM matches WHERE a=10 OR b=10')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM messages WHERE sender=10')).rows[0].n,0);
  assert.equal((await request(app).get('/api/me').set('Authorization','Bearer '+auth.body.token)).status,401);
  const notice=await db.query("SELECT payload->>'text' AS text FROM outbox WHERE recipient=10 AND delivered_at IS NULL");
  assert.ok(notice.rows.some(x=>x.text?.includes('аккаунт VEYRA удалён')));
  const fresh=await sign();assert.equal(fresh.status,200,JSON.stringify(fresh.body));
  const me=await request(app).get('/api/me').set('Authorization','Bearer '+fresh.body.token);
  assert.equal(me.status,200);assert.equal(me.body.profile,undefined);assert.equal(me.body.registration,undefined);assert.equal(me.body.photos.length,0);
 }finally{await db.close()}
});

test('deletion notification is sent by bot even though account is deleted',async()=>{
 const db=await testDB();try{
  await user(db,10);const app=createApp(deps(db));
  const token=(await request(app).post('/api/auth').send({initData:initData(10)})).body.token;
  await request(app).delete('/api/account').set('Authorization','Bearer '+token).send({confirm:'DELETE'});
  const sent=[];
  await drainOutbox({...deps(db),tg:async(bot,method,payload)=>{sent.push({bot,method,chat_id:payload.chat_id,text:payload.text});}});
  assert.ok(sent.some(x=>x.bot==='user'&&String(x.chat_id)==='10'&&x.text?.includes('удалён')));
 }finally{await db.close()}
});

test('banned Telegram user cannot bypass account ban through re-registration',async()=>{
 const db=await testDB();try{
  await user(db,10);await db.query("UPDATE users SET status='banned' WHERE id=10");
  const app=createApp(deps(db));assert.equal((await request(app).post('/api/auth').send({initData:initData(10)})).status,403);
 }finally{await db.close()}
});
