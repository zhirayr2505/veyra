import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {creditVeys} from '../server/veys.js';

test('VEYRA gifts: genuine collection, free quota, VEYS payment and request idempotency',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);await user(db,103);
  const app=createApp(deps(db));
  const auth=async id=>(await request(app).post('/api/auth').send({initData:initData(id)})).body.token;
  const sender=await auth(101),recipient=await auth(102);
  const from101=r=>r.set('Authorization','Bearer '+sender);
  const from102=r=>r.set('Authorization','Bearer '+recipient);
  const catalog=await from101(request(app).get('/api/gifts/catalog'));
  assert.equal(catalog.status,200);assert.equal(catalog.body.gifts.length,37);
  assert.equal(catalog.body.gifts[0].veys,0);
  assert.equal(catalog.body.gifts.find(g=>g.key==='rose').veys,50);
  const free={target:'102',gift_key:'spark',note:'Первый подарок 💜',client_id:randomUUID()};
  const sent=await from101(request(app).post('/api/gifts/send')).send(free);
  assert.equal(sent.status,201);assert.equal(sent.body.status,'delivered');
  const second=await from101(request(app).post('/api/gifts/send')).send(free);
  assert.equal(second.status,201);assert.equal(second.body.gift_id,sent.body.gift_id);
  assert.equal((await from101(request(app).post('/api/gifts/send')).send({...free,client_id:randomUUID()})).status,429);
  const collected=await from102(request(app).get('/api/gifts/collection/me'));
  assert.equal(collected.body.total,1);assert.equal(collected.body.items[0].note,free.note);
  assert.equal((await from101(request(app).get('/api/gifts/collection/102'))).body.total,1);
  assert.equal((await from101(request(app).post('/api/gifts/send')).send({...free,target:'101',client_id:randomUUID()})).status,400);
  const paid={target:'102',gift_key:'rose',note:'Для тебя',client_id:randomUUID()};
  assert.equal((await from101(request(app).post('/api/gifts/send')).send(paid)).status,402);
  await db.tx(async q=>{await q.query('SELECT id FROM users WHERE id=101 FOR UPDATE');await creditVeys(q,101,50,'order',randomUUID())});
  const p=await from101(request(app).post('/api/gifts/send')).send(paid);
  assert.equal(p.status,201);assert.equal(p.body.status,'delivered');
  assert.equal(p.body.veys_spent,50);
  const duplicate=await from101(request(app).post('/api/gifts/send')).send(paid);
  assert.equal(duplicate.status,201);assert.equal(duplicate.body.gift_id,p.body.gift_id);
  const delivered=(await from102(request(app).get('/api/gifts/collection/me'))).body;
  assert.equal(delivered.total,2);
  assert.ok(delivered.items.some(g=>g.gift_key==='rose'&&Number(g.veys_cost)===50));
  assert.equal((await from101(request(app).get('/api/veys'))).body.balance,0);
 }finally{await db.close();}
});
