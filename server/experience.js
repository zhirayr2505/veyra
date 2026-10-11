import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail,premium} from './core.js';
import {z,parse,id,uuid,short} from './validation.js';
import {approved,ensurePair,pairLock,publicProfile,audit,notify} from './domain.js';

export async function profileStats(q,uid){
 const p=await one(q,'SELECT * FROM profiles WHERE user_id=$1',[uid]);
 const n=await one(q,`SELECT (SELECT count(*)::int FROM impressions WHERE target=$1) AS views,
 (SELECT count(*)::int FROM reactions WHERE target=$1 AND kind<>'pass') AS likes,
 (SELECT count(*)::int FROM impressions WHERE target=$1 AND day>=CURRENT_DATE-6) AS views_7d,
 (SELECT count(*)::int FROM reactions WHERE target=$1 AND kind<>'pass' AND created_at>=now()-interval '7 days') AS likes_7d,
 (SELECT count(*)::int FROM matches WHERE active AND (a=$1 OR b=$1)) AS matches,
 (SELECT count(*)::int FROM photos WHERE user_id=$1) AS photos`,[uid]);
 const fields=[!!p?.name,!!p?.city,n.photos>=3,!!p?.goal,(p?.interests||[]).length>=3,!!p?.bio,(p?.languages||[]).length>0,(p?.prompts||[]).some(x=>x.answer?.trim())];
 return {...n,completion:Math.round(fields.filter(Boolean).length/fields.length*100)};
}
export async function undoReaction(q,uid,target){
 await pairLock(q,uid,target);await ensurePair(q,uid,target);
 // Serialize undo requests per account to prevent double-spending the daily allowance.
 const u=await one(q,'SELECT * FROM users WHERE id=$1 FOR UPDATE',[uid]);
 const used=await one(q,"SELECT count(*)::int AS n FROM audit_log WHERE actor=$1 AND action='reaction.undo' AND created_at>=CURRENT_DATE AND created_at<CURRENT_DATE+interval '1 day'",[uid]);
 if(!premium(u)&&used.n>=1)fail(402,'PREMIUM_REQUIRED');
 const last=await one(q,'SELECT * FROM reactions WHERE actor=$1 ORDER BY created_at DESC,target DESC LIMIT 1',[uid]);
 if(!last||String(last.target)!==String(target))fail(409,'UNDO_CHANGED');
 if(await one(q,'SELECT 1 FROM matches WHERE (a=$1 AND b=$2) OR (a=$2 AND b=$1)',[uid,target]))fail(409,'UNDO_MATCH_EXISTS');
 await q.query('DELETE FROM reactions WHERE actor=$1 AND target=$2',[uid,target]);
 await audit(q,uid,'reaction.undo',target,{kind:last.kind});
 // Undo never refunds consumables/daily allowance, preventing quota bypass.
 return publicProfile(q,target);
}
export function experienceRoutes(app,{db,rate,env}){
 app.get('/api/profile/stats',async(req,res)=>res.json(await profileStats(db,req.user.id)));
 app.get('/api/reactions/last',async(req,res)=>{
  const row=await one(db,'SELECT target,kind FROM reactions WHERE actor=$1 ORDER BY created_at DESC,target DESC LIMIT 1',[req.user.id]);
  const matched=row&&await one(db,'SELECT 1 FROM matches WHERE (a=$1 AND b=$2) OR (a=$2 AND b=$1)',[req.user.id,row.target]);
  const used=await one(db,"SELECT count(*)::int AS n FROM audit_log WHERE actor=$1 AND action='reaction.undo' AND created_at>=CURRENT_DATE AND created_at<CURRENT_DATE+interval '1 day'",[req.user.id]);
  res.json({action:row||null,can_undo:!!row&&!matched,premium:premium(req.user),free_undo_left:Math.max(0,1-used.n)});
 });
 app.post('/api/reactions/undo',async(req,res)=>{
  await rate('undo:'+req.user.id,15);const target=parse(id,req.body.target);
  res.json({profile:await db.tx(q=>undoReaction(q,req.user.id,target))});
 });
 app.patch('/api/preferences',async(req,res)=>{
  const b=parse(z.object({min_age:z.number().int().min(18).max(110),max_age:z.number().int().min(18).max(110),radius_km:z.number().int().min(1).max(20000),looking_for:z.array(z.enum(['man','woman','other'])).min(1).max(3).optional(),city:z.string().trim().max(100).optional()}).refine(x=>x.max_age>=x.min_age),req.body);
  await approved(db,req.user.id);
  await db.query('UPDATE profiles SET min_age=$2,max_age=$3,radius_km=$4,looking_for=coalesce($5::text[],looking_for),filter_city=coalesce($6,filter_city) WHERE user_id=$1',[req.user.id,b.min_age,b.max_age,b.radius_km,b.looking_for||null,b.city??null]);res.json({ok:true});
 });
 app.get('/api/profiles/:id',async(req,res)=>{
  const target=parse(id,req.params.id);await ensurePair(db,req.user.id,target);
  const allowed=await one(db,`SELECT 1 WHERE EXISTS(SELECT 1 FROM impressions WHERE viewer=$1 AND target=$2)
   OR EXISTS(SELECT 1 FROM reactions WHERE actor=$1 AND target=$2)
   OR EXISTS(SELECT 1 FROM matches WHERE active AND (a=$1 AND b=$2 OR a=$2 AND b=$1))
   OR ($3::boolean AND EXISTS(SELECT 1 FROM reactions WHERE actor=$2 AND target=$1 AND kind<>'pass'))`,[req.user.id,target,premium(req.user)]);
  if(!allowed)fail(403,'PROFILE_FORBIDDEN');
  const [p,mine,match]=await Promise.all([publicProfile(db,target),approved(db,req.user.id),one(db,'SELECT id FROM matches WHERE active AND (a=$1 AND b=$2 OR a=$2 AND b=$1)',[req.user.id,target])]);
  p.shared_interests=p.interests.filter(x=>mine.interests.includes(x));
  res.json({...p,match_id:match?.id||null});
 });
 app.post('/api/profiles/:id/hide',async(req,res)=>{
  const target=parse(id,req.params.id);await ensurePair(db,req.user.id,target);
  await db.query('INSERT INTO profile_hides(actor,target) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,target]);res.json({ok:true});
 });
 app.patch('/api/profile/location',async(req,res)=>{
  const p=parse(z.object({city:short(100),country:short(100),lat:z.number().min(-90).max(90),lon:z.number().min(-180).max(180),consent:z.literal(true)}),req.body);
  await db.query('UPDATE profiles SET city=$2,country=$3,lat=$4,lon=$5,location_updated_at=now(),location_consent_at=now() WHERE user_id=$1',[req.user.id,p.city,p.country,Math.round(p.lat*100)/100,Math.round(p.lon*100)/100]);res.json({ok:true});
 });
 app.get('/api/likes/history',async(req,res)=>{
  await approved(db,req.user.id);const kind=parse(z.enum(['outgoing','super','matches']),req.query.kind||'outgoing');
  const page=parse(z.coerce.number().int().min(0).max(10000),req.query.page||0);
  const rows=kind==='matches'?(await db.query('SELECT CASE WHEN a=$1 THEN b ELSE a END AS target,id AS match_id,created_at FROM matches WHERE active AND (a=$1 OR b=$1) ORDER BY created_at DESC LIMIT 21 OFFSET $2',[req.user.id,page*20])).rows
   :(await db.query("SELECT target,kind,created_at FROM reactions WHERE actor=$1 AND kind<>'pass' AND ($2='outgoing' OR kind='super') ORDER BY created_at DESC LIMIT 21 OFFSET $3",[req.user.id,kind,page*20])).rows;
  const profiles=[];for(const row of rows.slice(0,20)){
   try{await ensurePair(db,req.user.id,row.target);const p=await publicProfile(db,row.target);profiles.push({...p,match_id:row.match_id||null,reaction:row.kind});}catch(e){if(!e.status)throw e;}
  }res.json({profiles,more:rows.length>20,page});
 });
 app.get('/api/boost',async(req,res)=>{
  const u=await one(db,'SELECT * FROM users WHERE id=$1',[req.user.id]);
  const runs=(await db.query('SELECT * FROM boost_runs WHERE user_id=$1 ORDER BY started_at DESC LIMIT 10',[u.id])).rows;
  for(const r of runs){const counts=await one(db,`SELECT (SELECT count(*)::int FROM impressions WHERE target=$1 AND created_at BETWEEN $2 AND $3) AS views,(SELECT count(*)::int FROM reactions WHERE target=$1 AND kind<>'pass' AND created_at BETWEEN $2 AND $3) AS likes`,[u.id,r.started_at,r.ends_at]);Object.assign(r,counts);}
  res.json({active:new Date(u.boost_until)>new Date(),until:u.boost_until,credits:u.boosts,weekly_available:premium(u)&&(!u.weekly_boost_at||Date.now()-new Date(u.weekly_boost_at).getTime()>=7*86400000),runs});
 });
 app.post('/api/boost',async(req,res)=>{
  const result=await db.tx(async q=>{
   await approved(q,req.user.id);const u=await one(q,'SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   if(new Date(u.boost_until)>new Date())fail(409,'BOOST_ACTIVE');
   const weekly=premium(u)&&(!u.weekly_boost_at||Date.now()-new Date(u.weekly_boost_at).getTime()>=7*86400000);
   if(!weekly&&u.boosts<1)fail(402,'BOOST_REQUIRED');const stats=await profileStats(q,u.id);
   const r=await one(q,"UPDATE users SET boost_until=now()+interval '30 minutes',boosts=boosts-$2,weekly_boost_at=CASE WHEN $3 THEN now() ELSE weekly_boost_at END WHERE id=$1 RETURNING boost_until",[u.id,weekly?0:1,weekly]);
   await q.query('INSERT INTO boost_runs(id,user_id,ends_at,source,views_before,likes_before) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),u.id,r.boost_until,weekly?'weekly':'credit',stats.views,stats.likes]);await audit(q,u.id,'boost.started',u.id,{source:weekly?'weekly':'credit'});return {ok:true,until:r.boost_until};
  });res.json(result);
 });
 app.get('/api/referrals',async(req,res)=>{
  const config=await one(db,"SELECT enabled,config FROM feature_flags WHERE key='referrals'");
  const rows=(await db.query('SELECT first_name,created_at,referral_rewarded FROM users WHERE referrer_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id])).rows;
  const counts=await one(db,'SELECT count(*)::int AS invited,count(*) FILTER(WHERE referral_rewarded)::int AS verified FROM users WHERE referrer_id=$1',[req.user.id]);
  res.json({enabled:!!config?.enabled,code:req.user.referral_code,...counts,reward_superlikes:config?.config.reward_superlikes||0,history:rows.map(r=>({name:r.first_name,joined_at:r.created_at,rewarded:r.referral_rewarded}))});
 });
 app.post('/api/support',async(req,res)=>{
  await rate('support:'+req.user.id,5,3600);
  const b=parse(z.object({body:short(3000),category:z.enum(['general','payment','profile','safety','bug']).default('general')}),req.body),tid=randomUUID();
  await db.tx(async q=>{await q.query('INSERT INTO tickets(id,user_id,body,category) VALUES($1,$2,$3,$4)',[tid,req.user.id,b.body,b.category]);await notify(q,env.OWNER_TELEGRAM_ID,'Новое обращение в поддержку. /queue','admin');});res.json({id:tid});
 });
 app.get('/api/support',async(req,res)=>{
  const rows=(await db.query('SELECT * FROM tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id])).rows;
  for(const row of rows)row.messages=(await db.query('SELECT id,body,is_staff,created_at FROM support_messages WHERE ticket_id=$1 ORDER BY created_at,id',[row.id])).rows;res.json(rows);
 });
 app.post('/api/support/:id/close',async(req,res)=>{
  const row=await one(db,"UPDATE tickets SET status='resolved',closed_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",[parse(uuid,req.params.id),req.user.id]);if(!row)fail(404,'TICKET_NOT_FOUND');res.json({ok:true});
 });
 app.post('/api/support/:id/messages',async(req,res)=>{
  await rate('support-reply:'+req.user.id,15,3600);const tid=parse(uuid,req.params.id),body=parse(short(3000),req.body.body);
  await db.tx(async q=>{const row=await one(q,'SELECT id FROM tickets WHERE id=$1 AND user_id=$2 FOR UPDATE',[tid,req.user.id]);if(!row)fail(404,'TICKET_NOT_FOUND');await q.query('INSERT INTO support_messages(id,ticket_id,sender,body) VALUES($1,$2,$3,$4)',[randomUUID(),tid,req.user.id,body]);await q.query("UPDATE tickets SET status='open',closed_at=NULL,updated_at=now() WHERE id=$1",[tid]);});res.json({ok:true});
 });
}
