import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,env,initData,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
test('72-hour deletion can be restored; after finalization new registration never recovers old photos',async()=>{
 const {finalizeDueDeletions}=await import('../server/privacy.js');
 const db=await testDB();try{
 await user(db,60);await user(db,61);
 const app=createApp(deps(db));
 const auth=async(id=60)=>(await request(app).post('/api/auth').send({initData:initData(id)})).body.token;
 const first=await auth();assert.ok(first);
 const missing=await request(app).delete('/api/account').set('Authorization','Bearer '+first).send({confirm:'DELETE'});
 assert.equal(missing.status,400);
 const del=await request(app).delete('/api/account').set('Authorization','Bearer '+first).send({confirm:'DELETE',acknowledged:true});
 assert.equal(del.status,200);assert.equal(del.body.pending,true);
 assert.equal((await one(db,'SELECT status FROM users WHERE id=60')).status,'deleting');
 assert.equal((await one(db,'SELECT count(*)::int n FROM photos WHERE user_id=60')).n,3);
 const pause=await request(app).get('/api/me').set('Authorization','Bearer '+first);
 assert.equal(pause.status,200);assert.equal(pause.body.user.status,'deleting');
 assert.equal((await request(app).get('/api/feed').set('Authorization','Bearer '+first)).status,403);
 const notice=await one(db,"SELECT payload FROM outbox WHERE recipient=60 AND payload->>'text' LIKE '🕒 Твой аккаунт VEYRA поставлен%'");assert.ok(notice);
 const second=await auth();assert.ok(second);
 assert.equal((await request(app).post('/api/account/restore').set('Authorization','Bearer '+second).send({})).status,200);
 assert.equal((await one(db,'SELECT status FROM users WHERE id=60')).status,'active');
 assert.equal((await one(db,'SELECT count(*)::int n FROM photos WHERE user_id=60')).n,3);
 const againDel=await request(app).delete('/api/account').set('Authorization','Bearer '+second).send({confirm:'DELETE',acknowledged:true});
 assert.equal(againDel.status,200);
 await db.query("UPDATE users SET deletion_due_at=now()-interval '1 second' WHERE id=60");
 assert.equal(await finalizeDueDeletions({db}),1);
 assert.equal((await one(db,'SELECT status FROM users WHERE id=60')).status,'deleted');
 assert.equal((await one(db,'SELECT count(*)::int n FROM photos WHERE user_id=60')).n,0);
 assert.equal(await one(db,'SELECT * FROM profiles WHERE user_id=60'),undefined);
 assert.equal((await request(app).get('/api/me').set('Authorization','Bearer '+second)).status,401);
 const freshToken=await auth();assert.ok(freshToken);
 const fresh=await request(app).get('/api/me').set('Authorization','Bearer '+freshToken);
 assert.equal(fresh.status,200);assert.equal(fresh.body.profile,null);
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
