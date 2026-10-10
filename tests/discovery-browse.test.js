import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../server/app.js';
import {testDB,user,deps,initData} from './helpers.js';

let db,app,bearer;
before(async()=>{
 db=await testDB();
 await user(db,700,{premium:true});
 await db.query("UPDATE profiles SET interests=ARRAY['Кофе','Кино','Путешествия'] WHERE user_id=700");
 for(const id of [701,702,703,704,705,706,707]){
  await user(db,id);
  await db.query('UPDATE profiles SET interests=$2 WHERE user_id=$1',[id,id%2?['Кофе','Кино']:['Спорт']]);
 }
 app=createApp(deps(db));
 const login=await request(app).post('/api/auth').send({initData:initData(700)});
 assert.equal(login.status,200);
 bearer=login.body.token;
});
after(async()=>db?.close());
const auth=q=>q.set('Authorization','Bearer '+bearer);
test('browse modes paginate real approved users and preserve full profile/photo access',async()=>{
 const first=await auth(request(app).get('/api/feed?browse=true&mode=for_you&limit=3'));
 assert.equal(first.status,200);
 assert.equal(first.body.profiles.length,3);
 assert(first.body.profiles.every(p=>p.shared_interests>=0&&p.photos.length));
 assert(first.body.profiles.every(p=>!('lat' in p)&&!('lon' in p)));
 const seenIds=first.body.profiles.map(p=>String(p.id));
 const second=await auth(request(app).get('/api/feed?browse=true&mode=for_you&limit=3&skip='+seenIds.join(',')));
 assert.equal(second.status,200);
 assert.equal(second.body.profiles.length,3);
 assert(second.body.profiles.every(p=>!seenIds.includes(String(p.id))));
 const profile=await auth(request(app).get('/api/profiles/'+seenIds[0]));
 assert.equal(profile.status,200);
});
test('personal interests and nearby results are backend filtered, not fake cards',async()=>{
 const interest=await auth(request(app).get('/api/feed?browse=true&mode=for_you&limit=6&interest=%D0%BA%D0%BE%D1%84%D0%B5'));
 assert.equal(interest.status,200);
 assert(interest.body.profiles.length>0);
 assert(interest.body.profiles.every(p=>p.interests.some(v=>v.toLowerCase()==='кофе')));
 const nearby=await auth(request(app).get('/api/feed?browse=true&mode=nearby&limit=6'));
 assert.equal(nearby.status,200);
 const distances=nearby.body.profiles.map(p=>Number(p.distance_km));
 assert.deepEqual(distances,[...distances].sort((a,b)=>a-b));
 const invalid=await auth(request(app).get('/api/feed?browse=true&mode=nearby&limit=99'));
 assert.equal(invalid.status,400);
 const skipInvalid=await auth(request(app).get('/api/feed?browse=true&mode=nearby&skip=not-an-id'));
 assert.equal(skipInvalid.status,400);
});
test('classic feed remains one card and browse does not expose unmoderated profiles',async()=>{
 await db.query("UPDATE profiles SET moderation='pending' WHERE user_id=707");
 const original=await auth(request(app).get('/api/feed'));
 assert.equal(original.status,200);
 assert(original.body.profiles.length<=1);
 const browse=await auth(request(app).get('/api/feed?browse=true&mode=nearby&limit=8'));
 assert.equal(browse.status,200);
 assert(!browse.body.profiles.some(p=>String(p.id)==='707'));
});
