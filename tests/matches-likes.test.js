import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
let db,app,auth={};
const call=(id,method,path,body)=>{const r=request(app)[method]('/api'+path).set('Authorization','Bearer '+auth[id]);return body===undefined?r:r.send(body)};
before(async()=>{db=await testDB();app=createApp(deps(db));for(const id of [30,31,32]){await user(db,id);const r=await request(app).post('/api/auth').send({scope:'user',initData:initData(id)});assert.equal(r.status,200);auth[id]=r.body.token}});
after(async()=>db.close());
test('incoming likes are real and locked for free users',async()=>{
 const r=await call(31,'post','/reactions',{target:'30',kind:'like'});assert.equal(r.status,200);assert.equal(r.body.matched,false);
 const locked=await call(30,'get','/likes');assert.equal(locked.status,200);assert.equal(locked.body.count,1);assert.equal(locked.body.locked,true);assert.deepEqual(locked.body.profiles,[]);
 await db.query("UPDATE users SET premium_until='2099-01-01' WHERE id=30");
 const open=await call(30,'get','/likes');assert.equal(open.status,200);assert.equal(open.body.locked,false);assert.equal(open.body.profiles.length,1);assert.equal(String(open.body.profiles[0].id),'31');
});
test('answering an incoming like produces mutual match, not a fake notification',async()=>{
 const r=await call(30,'post','/reactions',{target:'31',kind:'like'});assert.equal(r.status,200);assert.equal(r.body.matched,true);
 assert.equal((await call(30,'get','/likes')).body.count,0);
});
test('new status is separately tracked for each participant',async()=>{
 const response=await call(30,'get','/matches');assert.equal(response.status,200);assert.equal(response.body.length,1);
 const m=response.body[0];assert.equal(m.is_new,true);
 assert.equal((await call(32,'post','/matches/'+m.id+'/seen',{})).status,404);
 assert.equal((await call(30,'post','/matches/'+m.id+'/seen',{})).status,200);
 assert.equal((await call(30,'post','/matches/'+m.id+'/seen',{})).status,200);
 assert.equal((await call(30,'get','/matches')).body[0].is_new,false);
 assert.equal((await call(31,'get','/matches')).body[0].is_new,true);
});
