import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {react} from '../server/domain.js';
import {creditVeys} from '../server/veys.js';
import {COURTSHIP_VEYS,COURTSHIP_DAYS} from '../server/courtship.js';

test('courtship: matched consent, VEYS debit, idempotent activation and recipient stop',async()=>{
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
  await db.tx(q=>react(q,'101','102','like'));await db.tx(q=>react(q,'102','101','like'));
  const offered=await send(101,'/courtships/request',{target:'102'});
  assert.equal(offered.status,201);assert.equal(offered.body.status,'pending');
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  assert.equal((await get(102,'/courtships/inbox')).body.length,1);
  assert.equal((await send(101,'/courtships/'+offered.body.id+'/respond',{accept:true})).status,404);
  assert.equal((await send(102,'/courtships/'+offered.body.id+'/respond',{accept:true})).body.status,'accepted');
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  const path='/courtships/'+offered.body.id+'/pay';
  assert.equal((await send(101,path,{})).status,402);
  assert.equal((await get(103,'/courtships/profile/102')).body.suitors.length,0);
  await db.tx(async q=>{await q.query('SELECT id FROM users WHERE id=101 FOR UPDATE');await creditVeys(q,101,COURTSHIP_VEYS,'order',randomUUID())});
  await db.query('INSERT INTO blocks(actor,target) VALUES(102,101)');
  assert.equal((await send(101,path,{})).status,403);
  assert.equal((await get(101,'/veys')).body.balance,COURTSHIP_VEYS);
  await db.query('DELETE FROM blocks WHERE actor=102 AND target=101');
  const pay=await send(101,path,{});
  assert.equal(pay.status,200);assert.equal(pay.body.status,'active');
  assert.equal(pay.body.veys_spent,COURTSHIP_VEYS);assert.equal(pay.body.days,COURTSHIP_DAYS);
  assert.equal((await get(101,'/veys')).body.balance,0);
  assert.equal((await send(101,path,{})).body.duplicate,true);
  let publicStatus=(await get(103,'/courtships/profile/102')).body;
  assert.equal(publicStatus.suitors.length,1);assert.equal(String(publicStatus.suitors[0].sender),'101');
  assert.equal((await get(101,'/courtships/profile/102')).body.mine.status,'active');
  assert.equal((await send(102,'/courtships/'+offered.body.id+'/stop',{})).body.status,'cancelled');
  publicStatus=(await get(103,'/courtships/profile/102')).body;
  assert.equal(publicStatus.suitors.length,0);
 }finally{await db.close();}
});

test('courtship: declined requests never take money and may be sent again',async()=>{
 const db=await testDB();
 try{
  await user(db,101);await user(db,102);
  await db.tx(q=>react(q,'101','102','like'));await db.tx(q=>react(q,'102','101','like'));
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
