import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {testDB,user,initData,env,deps} from './helpers.js';
import {createApp} from '../server/app.js';
import {react} from '../server/domain.js';
import {one} from '../server/db.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';
import {unzipSync,strFromU8} from 'fflate';
import {webhookSecret} from '../server/core.js';
let db,app;const tokens={};
before(async()=>{db=await testDB();for(const n of [1,10,11,12,13,...TEST_PROFILE_IDS])await user(db,n,{premium:n===10});await db.query("UPDATE users SET admin_role=CASE WHEN id=12 THEN 'moderator' ELSE 'support' END WHERE id IN(12,13)");app=createApp(deps(db));for(const n of [1,10,11,12,13]){const admin=[1,12,13].includes(n);const r=await request(app).post('/api/auth').send({scope:admin?'admin':'user',initData:initData(n,admin?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN)});assert.equal(r.status,200);tokens[n]=r.body.token;}});
after(()=>db.close());const auth=(r,n=10)=>r.set('Authorization','Bearer '+tokens[n]);
test('synthetic likes are reciprocal, labelled, retry safe and not charged twice',async()=>{
 const target=TEST_PROFILE_IDS[0];const first=await db.tx(q=>react(q,'10',target,'like'));const retry=await db.tx(q=>react(q,'10',target,'like'));
 assert.equal(first.matched,true);assert.equal(retry.match_id,first.match_id);
 const row=await one(db,'SELECT count(*)::int AS n,min(body) AS body FROM messages WHERE match_id=$1',[first.match_id]);assert.equal(row.n,1);assert.match(row.body,/автоматическое приветствие/);
 assert.equal((await one(db,'SELECT likes FROM daily_usage WHERE user_id=10')).likes,1);
 const regular=await db.tx(q=>react(q,'11','10','like'));assert.equal(regular.matched,false);
});
test('Undo supports the first daily free reversal and forbids reversing an active match',async()=>{
 await db.tx(q=>react(q,'10','11','pass'));
 assert.equal((await auth(request(app).post('/api/reactions/undo')).send({target:'11'})).status,200);
 assert.equal((await auth(request(app).post('/api/reactions/undo'),11).send({target:'10'})).status,200);
 assert.equal((await auth(request(app).get('/api/reactions/last'),11)).body.free_undo_left,0);
 assert.equal((await auth(request(app).post('/api/reactions/undo')).send({target:TEST_PROFILE_IDS[0]})).status,409);
});
test('hiding and reports exclude discovery; stranger profile lookup is forbidden',async()=>{
 assert.equal((await auth(request(app).get('/api/profiles/13'))).status,403);
 await auth(request(app).post('/api/profiles/13/hide')).send({});
 await db.query("INSERT INTO reports(id,reporter,target,reason) VALUES(gen_random_uuid(),10,12,'Spam')");
 const r=await auth(request(app).get('/api/feed'));assert.equal(r.status,200);assert(!r.body.profiles.some(p=>['12','13'].includes(String(p.id))));
});
test('support history and close are owned; staff replies retain conversation',async()=>{
 const ticket=await auth(request(app).post('/api/support')).send({body:'Help',category:'payment'});assert.equal(ticket.status,200);const path='/api/support/'+ticket.body.id;
 assert.equal((await auth(request(app).post(path+'/close'),11).send({})).status,404);
 assert.equal((await auth(request(app).post('/api/admin/tickets/'+ticket.body.id+'/reply'),13).send({reply:'Answer'})).status,200);
 assert.equal((await auth(request(app).get('/api/support'))).body[0].messages[0].body,'Answer');
 assert.equal((await auth(request(app).post(path+'/messages')).send({body:'Follow up'})).status,200);
 assert.equal((await auth(request(app).post(path+'/close')).send({})).status,200);
});
test('role boundaries survive normal reauthentication and revocation takes effect immediately',async()=>{
 assert.equal((await auth(request(app).get('/api/admin/profiles'),12)).status,200);
 for(const path of ['/api/admin/orders','/api/admin/users/10','/api/admin/export.zip','/api/admin/records/payments'])assert.equal((await auth(request(app).get(path),12)).status,403);
 assert.equal((await auth(request(app).get('/api/admin/profiles'),13)).status,403);
 await request(app).post('/api/auth').send({initData:initData(12)});assert.equal((await one(db,'SELECT admin_role FROM users WHERE id=12')).admin_role,'moderator');
 assert.equal((await auth(request(app).patch('/api/admin/roles/12'),1).send({role:null})).status,200);
 assert.equal((await auth(request(app).get('/api/admin/profiles'),12)).status,401);
});
test('Boost records are atomic and expired periods exclude later impressions',async()=>{
 const r=await auth(request(app).post('/api/boost')).send({});assert.equal(r.status,200);
 assert.equal((await auth(request(app).post('/api/boost')).send({})).status,409);
 await db.query("UPDATE boost_runs SET started_at=now()-interval '2 days',ends_at=now()-interval '1 day'");
 await db.query('INSERT INTO impressions(viewer,target) VALUES(11,10) ON CONFLICT DO NOTHING');
 const rows=await auth(request(app).get('/api/boost'));assert.equal(rows.body.runs.length,1);assert.equal(rows.body.runs[0].views,0);
});
test('operational datasets validate keys and return real metrics',async()=>{
 assert.equal((await auth(request(app).get('/api/admin/records/payments'),1)).status,200);
 assert.equal((await auth(request(app).get('/api/admin/records/sessions'),1)).status,400);
 assert.equal((await auth(request(app).get('/api/admin/metrics?days=7'),1)).body.series.length,7);
 assert.equal((await auth(request(app).get('/api/admin/health'),1)).status,200);
});
test('XLSX export escapes user content and restricts access',async()=>{
 await db.query("UPDATE users SET first_name='=HYPERLINK(<script>) & value' WHERE id=10");
 const r=await auth(request(app).get('/api/admin/records/users/export.xlsx'),1).buffer(true).parse((res,cb)=>{const parts=[];res.on('data',d=>parts.push(d));res.on('end',()=>cb(null,Buffer.concat(parts)));});
 assert.equal(r.status,200);const archive=unzipSync(r.body);const sheet=strFromU8(archive['xl/worksheets/sheet1.xml']);assert.match(sheet,/t="inlineStr"/);assert.match(sheet,/&lt;script&gt;/);assert(!sheet.includes('<f>'));
 assert.equal((await auth(request(app).get('/api/admin/records/users/export.xlsx'),13)).status,403);
});
test('broadcast draft is inert and confirmed queueing is idempotent',async()=>{
 const before=(await one(db,'SELECT count(*)::int AS n FROM outbox')).n;
 const r=await auth(request(app).post('/api/admin/broadcasts'),1).send({body:'Test broadcast',audience:'premium'});assert.equal(r.status,200);
 assert.equal((await one(db,'SELECT count(*)::int AS n FROM outbox')).n,before);
 const path='/api/admin/broadcasts/'+r.body.id+'/send';assert.equal((await auth(request(app).post(path),1).send({})).status,400);
 const first=await auth(request(app).post(path),1).send({confirm:true});assert.equal(first.status,200);
 await auth(request(app).post(path),1).send({confirm:true});assert.equal((await one(db,'SELECT count(*)::int AS n FROM outbox')).n,before+first.body.count);
});
test('content interests are private and Today respects its feature flag',async()=>{
 const rows=await auth(request(app).get('/api/content'));assert.equal(rows.body.length,3);const cid=rows.body[0].id;
 assert.equal((await auth(request(app).put('/api/content/'+cid+'/interest')).send({interested:true})).status,200);
 assert.equal((await auth(request(app).get('/api/content'))).body.find(r=>r.id===cid).interested,true);
 assert.equal((await auth(request(app).get('/api/content'),11)).body.find(r=>r.id===cid).interested,false);
 await db.query("UPDATE feature_flags SET enabled=false WHERE key='today'");assert.deepEqual((await auth(request(app).get('/api/content'))).body,[]);await db.query("UPDATE feature_flags SET enabled=true WHERE key='today'");
});
test('privileged bot commands reject support role and duplicate grants',async()=>{
 const secret=webhookSecret(env.ADMIN_BOT_TOKEN),message=(id,text,update_id)=>({update_id,message:{from:{id},chat:{type:'private'},text}});
 await request(app).post('/webhooks/admin').set('X-Telegram-Bot-Api-Secret-Token',secret).send(message(13,'/premium 11 7',501));
 assert.equal((await one(db,'SELECT premium_until FROM users WHERE id=11')).premium_until,null);
 const command=message(1,'/boost 11 2',502);for(let i=0;i<2;i++)assert.equal((await request(app).post('/webhooks/admin').set('X-Telegram-Bot-Api-Secret-Token',secret).send(command)).status,200);
 assert.equal((await one(db,'SELECT boosts FROM users WHERE id=11')).boosts,2);
});
test('single-photo onboarding is valid and bulk moderation rolls back stale revisions',async()=>{
 await user(db,14,{moderation:'draft'});await db.query('DELETE FROM photos WHERE user_id=14 AND position>0');
 tokens[14]=(await request(app).post('/api/auth').send({initData:initData(14)})).body.token;
 assert.equal((await auth(request(app).post('/api/profile/submit'),14).send({consent:true})).status,200);
 await user(db,15,{moderation:'pending'});
 const first=await one(db,'SELECT revision FROM profiles WHERE user_id=14');
 const path='/api/admin/profiles/bulk';const body={profiles:[{id:'14',revision:first.revision},{id:'15',revision:999}],decision:'approved',reason:'',confirm:true};
 assert.equal((await auth(request(app).post(path),1).send(body)).status,409);
 assert.equal((await one(db,'SELECT moderation FROM profiles WHERE user_id=14')).moderation,'pending');
 body.profiles.pop();assert.equal((await auth(request(app).post(path),1).send(body)).status,200);
 assert.equal((await one(db,'SELECT moderation FROM profiles WHERE user_id=14')).moderation,'approved');
});
