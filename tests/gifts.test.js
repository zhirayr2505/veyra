import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
import {settle,finalizeRefund,validateCheckout} from '../server/payments.js';

test('VEYRA gifts: real collection, free quota, paid Stars settlement, idempotency and refund',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);await user(db,103);
  const app=createApp(deps(db));
  const auth=async id=>(await request(app).post('/api/auth').send({initData:initData(id)})).body.token;
  const sender=await auth(101),recipient=await auth(102);
  const from101=r=>r.set('Authorization','Bearer '+sender);
  const from102=r=>r.set('Authorization','Bearer '+recipient);
  const catalog=await from101(request(app).get('/api/gifts/catalog'));
  assert.equal(catalog.status,200);
  assert.equal(catalog.body.gifts.length,16);
  assert.equal(catalog.body.gifts[0].stars,0);
  const idempotent=randomUUID();
  const free={target:'102',gift_key:'spark',note:'Первый подарок 💜',client_id:idempotent};
  const sent=await from101(request(app).post('/api/gifts/send')).send(free);
  assert.equal(sent.status,201);
  assert.equal(sent.body.status,'delivered');
  const second=await from101(request(app).post('/api/gifts/send')).send(free);
  assert.equal(second.status,201);
  assert.equal(second.body.gift_id,sent.body.gift_id);
  const limited=await from101(request(app).post('/api/gifts/send')).send({...free,client_id:randomUUID()});
  assert.equal(limited.status,429);
  const collected=await from102(request(app).get('/api/gifts/collection/me'));
  assert.equal(collected.status,200);
  assert.equal(collected.body.total,1);
  assert.equal(collected.body.items[0].gift_key,'spark');
  assert.equal(collected.body.items[0].note,free.note);
  assert.equal((await from101(request(app).get('/api/gifts/collection/102'))).body.total,1);
  assert.equal((await from101(request(app).post('/api/gifts/send')).send({...free,target:'101',client_id:randomUUID()})).status,400);
  assert.equal((await from101(request(app).post('/api/gifts/send')).send({...free,gift_key:'rose',client_id:randomUUID()})).status,503);
  await db.query("UPDATE feature_flags SET enabled=true WHERE key='payments'");
  const paid=await from101(request(app).post('/api/gifts/send')).send({target:'102',gift_key:'rose',note:'Для тебя',client_id:randomUUID()});
  assert.equal(paid.status,201);
  assert.equal(paid.body.status,'payment_required');
  assert.ok(paid.body.invoice_url);
  assert.equal((await from102(request(app).get('/api/gifts/collection/me'))).body.total,1);
  const order=await one(db,'SELECT * FROM orders WHERE id=$1',[paid.body.order_id]);
  assert.equal(order.kind,'gift');assert.equal(order.total,5);
  assert.equal(await db.tx(q=>validateCheckout(q,{
   invoice_payload:order.id,from:{id:101},currency:'XTR',total_amount:5,id:'test-pc'
  })),true);
  const payment={invoice_payload:order.id,currency:'XTR',total_amount:5,telegram_payment_charge_id:'test-gift-charge'};
  await db.tx(q=>settle(q,'101',payment));
  await db.tx(q=>settle(q,'101',payment));
  const delivered=(await from102(request(app).get('/api/gifts/collection/me'))).body;
  assert.equal(delivered.total,2);
  assert.ok(delivered.items.some(g=>g.gift_key==='rose'));
  await db.tx(q=>finalizeRefund(q,order.id,'101'));
  const refunded=(await from102(request(app).get('/api/gifts/collection/me'))).body;
  assert.equal(refunded.total,1);
  assert.equal(refunded.items[0].gift_key,'spark');
 }finally{await db.close();}
});
