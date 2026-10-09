import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {react} from '../server/domain.js';
import {one} from '../server/db.js';
import {settle,validateCheckout,finalizeRefund} from '../server/payments.js';
import {COURTSHIP_STARS,COURTSHIP_DAYS} from '../server/courtship.js';

test('courtship: only matched members, recipient consent, Stars activation, public status and recipient stop',async()=>{
 const db=await testDB();
 try{
  for(const uid of [101,102,103])await user(db,uid);
  const app=createApp(deps(db));
  const auth=async uid=>(await request(app).post('/api/auth').send({initData:initData(uid)})).body.token;
  const tokens={101:await auth(101),102:await auth(102),103:await auth(103)};
  const aut=(uid,req)=>req.set('Authorization','Bearer '+tokens[uid]);
  const get=(uid,path)=>aut(uid,request(app).get('/api'+path));
  const send=(uid,path,body)=>aut(uid,request(app).post('/api'+path)).send(body);
  assert.equal((await send(101,'/courtships/request',{target:'102'})).status,403);
  await db.tx(q=>react(q,'101','102','like'));
  await db.tx(q=>react(q,'102','101','like'));
  const offered=await send(101,'/courtships/request',{target:'102'});
  assert.equal(offered.status,201);assert.equal(offered.body.status,'pending');
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  assert.equal((await get(102,'/courtships/inbox')).body.length,1);
  assert.equal((await send(101,'/courtships/'+offered.body.id+'/respond',{accept:true})).status,404);
  assert.equal((await send(102,'/courtships/'+offered.body.id+'/respond',{accept:true})).body.status,'accepted');
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  assert.equal((await send(101,'/courtships/'+offered.body.id+'/pay',{})).status,503);
  await db.query("UPDATE feature_flags SET enabled=true WHERE key='payments'");
  const pay=await send(101,'/courtships/'+offered.body.id+'/pay',{});
  assert.equal(pay.status,200);
  assert.equal(pay.body.stars,COURTSHIP_STARS);assert.equal(pay.body.days,COURTSHIP_DAYS);
  assert.equal(pay.body.status,'payment_required');
  assert.ok(pay.body.invoice_url);
  const order=await one(db,'SELECT * FROM orders WHERE id=$1',[pay.body.order_id]);
  assert.equal(order.kind,'courtship');
  assert.equal(order.total,COURTSHIP_STARS);
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  assert.equal(await db.tx(q=>validateCheckout(q,{
   invoice_payload:order.id,from:{id:101},currency:'XTR',total_amount:COURTSHIP_STARS,id:'pc-courtship-test'
  })),true);
  const pc={invoice_payload:order.id,currency:'XTR',total_amount:COURTSHIP_STARS,telegram_payment_charge_id:'courtship-test'};
  await db.tx(q=>settle(q,'101',pc));await db.tx(q=>settle(q,'101',pc));
  let publicStatus=(await get(103,'/courtships/profile/102')).body;
  assert.equal(publicStatus.suitors.length,1);assert.equal(String(publicStatus.suitors[0].sender),'101');
  assert.equal((await get(101,'/courtships/profile/102')).body.mine.status,'active');
  assert.equal((await send(102,'/courtships/'+offered.body.id+'/stop',{})).body.status,'cancelled');
  publicStatus=(await get(103,'/courtships/profile/102')).body;
  assert.equal(publicStatus.suitors.length,0);
  await db.tx(q=>finalizeRefund(q,order.id,'101'));
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
 }finally{await db.close();}
});

test('courtship: declined requests never take money and may be sent again',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);
  await db.tx(q=>react(q,'101','102','like'));
  await db.tx(q=>react(q,'102','101','like'));
  const app=createApp(deps(db));
  const auth=async uid=>(await request(app).post('/api/auth').send({initData:initData(uid)})).body.token;
  const first=await auth(101),second=await auth(102);
  const from=(tok,path,body)=>request(app).post('/api'+path).set('Authorization','Bearer '+tok).send(body);
  const result=await from(first,'/courtships/request',{target:'102'});
  assert.equal(result.status,201);
  assert.equal((await from(second,'/courtships/'+result.body.id+'/respond',{accept:false})).body.status,'declined');
  const repeat=await from(first,'/courtships/request',{target:'102'});
  assert.equal(repeat.status,201);assert.equal(repeat.body.status,'pending');assert.equal(repeat.body.id,result.body.id);
  assert.equal((await db.query("SELECT count(*)::int n FROM orders WHERE kind='courtship'")).rows[0].n,0);
 }finally{await db.close();}
});
