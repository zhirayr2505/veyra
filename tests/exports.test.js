import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {testDB,user,initData,env,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {one} from '../server/db.js';
let db,app,admin,normal,matchId,photo;
const auth=(r,t=admin)=>r.set('Authorization','Bearer '+t);
const binary=(res,cb)=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>cb(null,Buffer.concat(chunks)));};
before(async()=>{
 db=await testDB();await user(db,31);await user(db,32);
 await db.query("UPDATE profiles SET name='=SUM(1,2)' WHERE user_id=31");
 matchId=randomUUID();await db.query('INSERT INTO matches(id,a,b) VALUES($1,31,32)',[matchId]);
 // More than one transcript page, with identical sub-millisecond timestamps.
 await db.query(`INSERT INTO messages(id,match_id,sender,body,client_id,created_at)
  SELECT md5(n::text)::uuid,$1,CASE WHEN n%2=0 THEN 31 ELSE 32 END,'Message '||n,md5('client'||n)::uuid,'2026-10-06 12:00:00.123456+00'::timestamptz
  FROM generate_series(1,503) AS n`,[matchId]);
 photo=await one(db,'SELECT id FROM photos WHERE user_id=31');
 app=createApp(deps(db));
 for(const [uid,scope,token] of [[1,'admin',env.ADMIN_BOT_TOKEN],[31,'user',env.USER_BOT_TOKEN]]){
  const r=await request(app).post('/api/auth').send({scope,initData:initData(uid,token)});
  assert.equal(r.status,200);if(scope==='admin')admin=r.body.token;else normal=r.body.token;
 }
});
after(()=>db.close());

test('archives and user dossiers require owner session from the admin bot',async()=>{
 for(const path of ['/api/admin/export.zip','/api/admin/users/31/export.zip','/api/admin/users/31']){
  assert.equal((await request(app).get(path)).status,401);
  assert.equal((await auth(request(app).get(path),normal)).status,403);
 }
 assert.equal((await auth(request(app).get('/api/admin/users/999/export.zip'))).status,404);
});
test('user detail attaches photos and conversations with both participant IDs',async()=>{
 const a=await auth(request(app).get('/api/admin/users/31'));
 const b=await auth(request(app).get('/api/admin/users/32'));
 assert.equal(a.body.photos[0].id,photo.id);
 assert.equal(a.body.chats[0].id,b.body.chats[0].id);
 assert.equal(String(a.body.chats[0].other_id),'32');
 assert.equal(Number(a.body.chats[0].message_count),503);
});
test('complete ZIP is readable, contains photos and lossless transcripts attached to both users, and omits sessions',async()=>{
 const r=await auth(request(app).get('/api/admin/export.zip')).buffer(true).parse(binary);
 assert.equal(r.status,200);assert.match(r.headers['content-type'],/application\/zip/);
 const files=unzipSync(r.body),text=name=>strFromU8(files[name]);
 assert.ok(files['users/31/photos/'+photo.id+'.webp']);
 const a=text('users/31/chats/'+matchId+'.jsonl'),b=text('users/32/chats/'+matchId+'.jsonl');
 assert.equal(a,b);const messages=a.trim().split('\n').map(JSON.parse);
 assert.equal(messages.length,503);assert.equal(new Set(messages.map(x=>x.id)).size,503);
 assert.ok(messages[0].created_at.includes('123456'));
 assert.match(text('users.csv'),/"'=SUM\(1,2\)"/);
 assert.equal(Object.keys(files).some(x=>/sessions|\.env/.test(x)),false);
 const all=Object.values(files).map(strFromU8).join('');
 assert.ok(!all.includes(admin)&&!all.includes(normal));
 assert.ok(!all.includes(env.USER_BOT_TOKEN));
});
test('single-user archive excludes unrelated profiles and photos but retains the full shared conversation',async()=>{
 const r=await auth(request(app).get('/api/admin/users/31/export.zip')).buffer(true).parse(binary);
 assert.equal(r.status,200);const files=unzipSync(r.body);
 assert.ok(files['users/31/profile.json']);assert.equal(files['users/32/profile.json'],undefined);
 assert.equal(strFromU8(files['users/31/chats/'+matchId+'.jsonl']).trim().split('\n').length,503);
});
