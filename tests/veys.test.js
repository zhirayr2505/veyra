import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
import {settle,finalizeRefund,validateCheckout} from '../server/payments.js';
import {VEYS_PER_STAR,VEYS_PACKS,VEYS_ITEMS} from '../server/veys.js';

const start=async(db,id=101)=>{
 const app=createApp(deps(db));
 const auth=await request(app).post('/api/auth').send({initData:initData(id)});
 assert.equal(auth.status,200);
 const token=auth.body.token;
 const get=path=>request(app).get('/api'+path).set('Authorization','Bearer '+token);
 const post=(path,body)=>request(app).post('/api'+path).set('Authorization','Bearer '+token).send(body);
 return {app,get,post};
};
test('VEYS: server-owned exchange rate, zero starting balance and Premium-only Stars offers',async()=>{
 const db=await testDB();
 try{
  await user(db,101);
  const c=await start(db);
  const w=await c.get('/veys');
  assert.equal(w.status,200);assert.equal(w.body.balance,0);
  assert.equal(w.body.rate,VEYS_PER_STAR);assert.equal(w.body.symbol,'diamond');
  assert.equal(w.body.packs.length,VEYS_PACKS.length);
  assert.equal(w.body.items.length,VEYS_ITEMS.length);
  const products=await c.get('/products');
  assert.ok(products.body.products.every(p=>p.kind==='premium'));
  const wrong=await c.post('/payments/invoice',{sku:'super_1',provider:'stars'});
  assert.equal(wrong.status,400);
  assert.equal(wrong.body.error,'USE_VEYS');
  const invalid=await c.post('/veys/invoice',{sku:'fake_999',amount:999999});
  assert.equal(invalid.status,400);
 }finally{await db.close();}
});

test('VEYS: authenticated Stars settlement, duplicate webhook, purchases, gift ledger and refund debt',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);
  const c=await start(db);
  const getBalance=async()=>Number((await c.get('/veys')).body.balance);
  assert.equal((await c.post('/veys/invoice',{sku:'veys_100'})).status,503);
  await db.query("UPDATE feature_flags SET enabled=true WHERE key='payments'");
  const pack=await c.post('/veys/invoice',{sku:'veys_250'});
  assert.equal(pack.status,201);assert.equal(pack.body.amount,250);assert.equal(pack.body.stars,25);
  const o=await one(db,'SELECT * FROM orders WHERE id=$1',[pack.body.order_id]);
  assert.equal(o.kind,'veys');assert.equal(Number(o.total),25);
  const pc={id:'pc-veys',invoice_payload:o.id,from:{id:101},currency:'XTR',total_amount:25};
  assert.equal(await db.tx(q=>validateCheckout(q,{...pc,total_amount:1})),false);
  assert.equal(await db.tx(q=>validateCheckout(q,pc)),true);
  assert.equal(await getBalance(),0);
  const charge={...pc,telegram_payment_charge_id:'veyra-veys-test-charge'};
  await db.tx(q=>settle(q,101,charge));
  await db.tx(q=>settle(q,101,charge));
  assert.equal(await getBalance(),250);
  // A paid VEYS funding order must not consume the introductory Premium offer.
  // Only a paid Premium order or another reserved introductory invoice can do so.
  const premiumBefore=await c.get('/products');
  assert.equal(premiumBefore.status,200);
  const intro=premiumBefore.body.products.find(p=>p.first_only);
  assert.ok(intro,'test catalog must contain an introductory Premium package');
  const premiumInvoice=await c.post('/payments/invoice',{sku:intro.sku,provider:'stars'});
  assert.equal(premiumInvoice.status,200);
  const premiumOrder=await one(db,'SELECT * FROM orders WHERE id=$1',[premiumInvoice.body.order_id]);
  assert.equal(premiumOrder.kind,'premium');
  assert.equal(await db.tx(q=>validateCheckout(q,{id:'pc-intro-after-veys',invoice_payload:premiumOrder.id,from:{id:101},currency:'XTR',total_amount:Number(premiumOrder.total)})),true);
  const bad=await c.post('/veys/buy',{sku:'super_1',client_id:randomUUID(),cost:0});
  assert.equal(bad.status,400);
  const firstId=randomUUID();
  const first=await c.post('/veys/buy',{sku:'super_1',client_id:firstId});
  assert.equal(first.status,201);assert.equal(first.body.balance,160);
  const second=await c.post('/veys/buy',{sku:'super_1',client_id:firstId});
  assert.equal(second.status,201);assert.equal(second.body.duplicate,true);
  const conflict=await c.post('/veys/buy',{sku:'boost_1',client_id:firstId});
  assert.equal(conflict.status,409);
  assert.equal((await one(db,'SELECT superlikes FROM users WHERE id=101')).superlikes,1);
  const insufficient=await c.post('/veys/buy',{sku:'boost_1',client_id:randomUUID()});
  assert.equal(insufficient.status,402);assert.equal(await getBalance(),160);
  const giftId=randomUUID();
  const gift=await c.post('/gifts/send',{target:'102',gift_key:'rose',note:'Цветы 💜',client_id:giftId});
  assert.equal(gift.status,201);assert.equal(gift.body.veys_spent,50);
  assert.equal(await getBalance(),110);
  const repeated=await c.post('/gifts/send',{target:'102',gift_key:'rose',client_id:giftId});
  assert.equal(repeated.status,201);assert.equal(await getBalance(),110);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM gifts WHERE sender=101 AND recipient=102')).n,1);
  await db.tx(q=>finalizeRefund(q,o.id,101));
  await db.tx(q=>finalizeRefund(q,o.id,101));
  assert.equal(await getBalance(),-140);
  const wallet=(await c.get('/veys')).body;
  assert.equal(wallet.history.filter(x=>x.action==='topup').length,1);
  assert.equal(wallet.history.filter(x=>x.action==='refund').length,1);
  assert.equal(wallet.history.filter(x=>x.action==='spend').length,2);
  assert.equal((await c.post('/veys/buy',{sku:'super_1',client_id:randomUUID()})).status,402);
 }finally{await db.close();}
});

test('VEYS: gift free allowance is unaffected by paid VEYS purchases',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);
  const c=await start(db);const auth=await c.get('/veys');
  assert.equal(auth.status,200);
  const free=await c.post('/gifts/send',{target:'102',gift_key:'spark',client_id:randomUUID()});
  assert.equal(free.status,201);
  assert.equal((await c.post('/gifts/send',{target:'102',gift_key:'spark',client_id:randomUUID()})).status,429);
 }finally{await db.close();}
});
