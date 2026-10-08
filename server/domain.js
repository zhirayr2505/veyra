import {isTestProfile} from './test-profile-ids.js';
import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail,premium} from './core.js';
export const flag=async(q,k)=>{const f=await one(q,'SELECT * FROM feature_flags WHERE key=$1',[k]);return f?.enabled;};
export const audit=(q,actor,action,subject,metadata={})=>q.query('INSERT INTO audit_log(actor,action,subject,metadata) VALUES($1,$2,$3,$4)',[actor,action,String(subject),JSON.stringify(metadata)]);
export async function notify(q,recipient,text,bot='user',markup){if(isTestProfile(recipient))return;await q.query('INSERT INTO outbox(id,bot,recipient,payload) VALUES($1,$2,$3,$4)',[randomUUID(),bot,recipient,JSON.stringify({text,...(markup?{reply_markup:markup}:{})})]);}
export async function notifyReview(q,env,userId){
 const p=await one(q,`SELECT p.*,u.username,extract(year FROM age(p.birth_date))::int AS age FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1`,[userId]);
 if(!p)return;
 const photo=await one(q,'SELECT id FROM photos WHERE user_id=$1 ORDER BY position,created_at LIMIT 1',[userId]);
 const text=`Анкета ${p.user_id} · ревизия ${p.revision}\n${p.name}, ${p.age}\n@${p.username||'—'}\n${p.city}, ${p.country}\nПол: ${p.gender} · Ищет: ${p.looking_for.join(', ')}\nЦель: ${p.goal}\n${p.bio.slice(0,250)}\nИнтересы: ${p.interests.join(', ').slice(0,100)}`.slice(0,1000);
 const reply_markup={inline_keyboard:[[{text:'Все фото и анкета',web_app:{url:env.APP_URL+'/admin'}}],[{text:'Одобрить',callback_data:`approve:${p.user_id}:${p.revision}`}]]};
 await q.query('INSERT INTO outbox(id,bot,recipient,payload) VALUES($1,$2,$3,$4)',[randomUUID(),'admin',env.OWNER_TELEGRAM_ID,JSON.stringify({text,photo_id:photo?.id,reply_markup})]);
}
export async function approved(q,id){const p=await one(q,"SELECT p.* FROM profiles p JOIN users u ON u.id=p.user_id WHERE user_id=$1 AND u.status='active'",[id]);if(p?.moderation!=='approved')fail(403,'PROFILE_NOT_APPROVED');return p;}
export async function pairLock(q,a,b){const ids=[BigInt(a),BigInt(b)].sort((x,y)=>x<y?-1:1);await q.query('SELECT id FROM users WHERE id=$1 OR id=$2 ORDER BY id FOR UPDATE',[...ids.map(String)]);}
export const blocked=async(q,a,b)=>!!await one(q,'SELECT 1 FROM blocks WHERE (actor=$1 AND target=$2) OR (actor=$2 AND target=$1)',[a,b]);
export async function ensurePair(q,a,b){if(String(a)===String(b))fail(400,'SELF_ACTION');await approved(q,a);await approved(q,b);if(await blocked(q,a,b))fail(403,'BLOCKED');}
export async function activeMatch(q,id,user,lock=false){const m=await one(q,`SELECT * FROM matches WHERE id=$1 AND (a=$2 OR b=$2) AND active=true ${lock?'FOR UPDATE':''}`,[id,user]);if(!m)fail(404,'MATCH_NOT_FOUND');const other=String(m.a)===String(user)?m.b:m.a;await ensurePair(q,user,other);return {...m,other};}
export async function usage(q,id){await q.query('INSERT INTO daily_usage(user_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);return one(q,'SELECT * FROM daily_usage WHERE user_id=$1 AND day=CURRENT_DATE FOR UPDATE',[id]);}
export async function publicProfile(q,id){const p=await one(q,`SELECT p.user_id AS id,p.name,extract(year FROM age(p.birth_date))::int AS age,p.gender,p.bio,p.interests,p.goal,p.smoking,p.leisure,p.city,p.country,u.boost_until,u.last_seen,(u.last_seen>now()-interval '5 minutes') AS online,t.activity,t.time_slot,t.expires_at AS today_until FROM profiles p JOIN users u ON u.id=p.user_id LEFT JOIN today t ON t.user_id=p.user_id AND t.expires_at>now() WHERE p.user_id=$1`,[id]);if(!p)return null;p.photos=(await q.query('SELECT id FROM photos WHERE user_id=$1 ORDER BY position,created_at',[id])).rows.map(x=>x.id);return p;}
export async function recommendations(q,user,todayOnly=false,limit=1){const p=await approved(q,user.id);const use=await usage(q,user.id);if(!premium(user)&&use.views>=30) return {profiles:[],limited:true};
 const rows=(await q.query(`SELECT p.user_id,
  6371*2*asin(sqrt(least(1.0,power(sin(radians(p.lat-$2)/2),2)+cos(radians($2))*cos(radians(p.lat))*power(sin(radians(p.lon-$3)/2),2)))) AS distance,
  (SELECT count(*) FROM unnest(p.interests) i WHERE i=ANY($9::text[])) AS shared,
  u.boost_until>now() AS boosted, u.last_seen
 FROM profiles p JOIN users u ON u.id=p.user_id
 WHERE p.user_id<>$1 AND p.moderation='approved' AND u.status='active' AND NOT u.paused AND (NOT u.invisible OR u.premium_until IS NULL OR u.premium_until<=now())
 AND p.gender=ANY($4::text[]) AND $5=ANY(p.looking_for)
 AND extract(year FROM age(p.birth_date)) BETWEEN $6 AND $7
 AND extract(year FROM age($8::date)) BETWEEN p.min_age AND p.max_age
 AND NOT EXISTS(SELECT 1 FROM blocks WHERE (actor=$1 AND target=p.user_id) OR (target=$1 AND actor=p.user_id))
 AND NOT EXISTS(SELECT 1 FROM reactions WHERE actor=$1 AND target=p.user_id)
 AND NOT EXISTS(SELECT 1 FROM matches WHERE (a=$1 AND b=p.user_id) OR (b=$1 AND a=p.user_id))
 AND EXISTS(SELECT 1 FROM photos WHERE user_id=p.user_id)
 ${todayOnly?'AND EXISTS(SELECT 1 FROM today WHERE user_id=p.user_id AND expires_at>now())':''}
 ORDER BY boosted DESC NULLS LAST,shared DESC,distance ASC,u.last_seen DESC LIMIT 200`,[user.id,p.lat,p.lon,p.looking_for,p.gender,p.min_age,p.max_age,p.birth_date,p.interests])).rows;
 const candidates=rows.filter(x=>p.radius_km===20000||x.distance<=p.radius_km).slice(0,Math.min(limit,premium(user)?limit:30-use.views));
 const profiles=[];
 for(const candidate of candidates){
  const seen=await q.query('INSERT INTO impressions(viewer,target) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING viewer',[user.id,candidate.user_id]);
  if(seen.rowCount)await q.query('UPDATE daily_usage SET views=views+1 WHERE user_id=$1 AND day=CURRENT_DATE',[user.id]);
  const card=await publicProfile(q,candidate.user_id);card.distance_km=Math.max(1,Math.round(candidate.distance/5)*5);profiles.push(card);
 }
 return {profiles,limited:false};
}
export async function react(q,actor,target,kind,message){await pairLock(q,actor,target);await ensurePair(q,actor,target);const u=await one(q,'SELECT * FROM users WHERE id=$1',[actor]);const old=await one(q,'SELECT * FROM reactions WHERE actor=$1 AND target=$2',[actor,target]);if(await one(q,'SELECT 1 FROM matches WHERE (a=$1 AND b=$2 OR a=$2 AND b=$1) AND NOT active',[actor,target]))fail(409,'MATCH_ENDED');if(old&&old.kind!=='pass'){if(isTestProfile(target)&&!isTestProfile(actor))await q.query("INSERT INTO reactions(actor,target,kind) VALUES($1,$2,'like') ON CONFLICT(actor,target) DO UPDATE SET kind='like'",[target,actor]);return {matched:!!await one(q,'SELECT 1 FROM matches WHERE (a=$1 AND b=$2 OR a=$2 AND b=$1) AND active',[actor,target])};}
 if(await one(q,'SELECT 1 FROM matches WHERE (a=$1 AND b=$2 OR a=$2 AND b=$1) AND NOT active',[actor,target]))fail(409,'MATCH_ENDED');
 const d=await usage(q,actor);if(kind!=='pass'&&!premium(u)&&d.likes>=15)fail(429,'LIKE_LIMIT');
 if(kind==='super'){if(premium(u)&&d.superlikes<3)await q.query('UPDATE daily_usage SET superlikes=superlikes+1 WHERE user_id=$1 AND day=CURRENT_DATE',[actor]);else {if(u.superlikes<1)fail(402,'SUPERLIKE_REQUIRED');await q.query('UPDATE users SET superlikes=superlikes-1 WHERE id=$1',[actor]);}}
 if(message){if(kind==='pass')fail(400,'INVALID_MESSAGE');if(u.prematches<1)fail(402,'PREMATCH_REQUIRED');await q.query('UPDATE users SET prematches=prematches-1 WHERE id=$1',[actor]);}
 await q.query('INSERT INTO reactions(actor,target,kind,message) VALUES($1,$2,$3,$4) ON CONFLICT(actor,target) DO UPDATE SET kind=EXCLUDED.kind,message=EXCLUDED.message',[actor,target,kind,message||null]);
 if(kind!=='pass'&&isTestProfile(target)&&!isTestProfile(actor))await q.query("INSERT INTO reactions(actor,target,kind) VALUES($1,$2,'like') ON CONFLICT(actor,target) DO UPDATE SET kind='like'",[target,actor]);
 if(kind==='pass')return {matched:false};await q.query('UPDATE daily_usage SET likes=likes+1 WHERE user_id=$1 AND day=CURRENT_DATE',[actor]);
 const mutual=await one(q,"SELECT 1 FROM reactions WHERE actor=$1 AND target=$2 AND kind<>'pass'",[target,actor]);if(mutual){const [a,b]=[String(actor),String(target)].sort((x,y)=>BigInt(x)<BigInt(y)?-1:1);let m=await one(q,'INSERT INTO matches(id,a,b) VALUES($1,$2,$3) ON CONFLICT(a,b) DO NOTHING RETURNING *',[randomUUID(),a,b]);if(!m)m=await one(q,'SELECT * FROM matches WHERE a=$1 AND b=$2',[a,b]);if(isTestProfile(target)&&!isTestProfile(actor)&&!await one(q,'SELECT 1 FROM messages WHERE match_id=$1',[m.id]))await q.query('INSERT INTO messages(id,match_id,sender,body,client_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),m.id,target,'Привет! Я увидела твою симпатию 💜 Давай знакомиться?',randomUUID()]);await notify(q,actor,'💜 Взаимная симпатия! Новый чат уже в VEYRA.');await notify(q,target,'💜 Взаимная симпатия! Новый чат уже в VEYRA.');return {matched:true,match_id:m.id};}
 await notify(q,target,kind==='super'?'✨ Вам отправили Super Like в VEYRA!':'💜 Вы кому-то понравились в VEYRA.');return {matched:false};
}
export async function grant(q,id,kind,amount){if(kind==='premium')await q.query("UPDATE users SET premium_until=greatest(coalesce(premium_until,now()),now())+($2::text||' days')::interval WHERE id=$1",[id,amount]);else if(['superlikes','boosts','prematches'].includes(kind))await q.query(`UPDATE users SET ${kind}=${kind}+$2 WHERE id=$1`,[id,amount]);else fail(400,'INVALID_PRODUCT');}
export async function moderate(q,actor,id,decision,reason,revision){await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id]);const p=await one(q,'SELECT * FROM profiles WHERE user_id=$1 FOR UPDATE',[id]);if(!p||p.moderation!=='pending'||p.revision!==revision)fail(409,'STALE_REVIEW');if(decision==='approved'&&(await one(q,'SELECT count(*)::int AS n FROM photos WHERE user_id=$1',[id])).n<3)fail(400,'THREE_PHOTOS_REQUIRED');await q.query('UPDATE profiles SET moderation=$2,moderation_reason=$3 WHERE user_id=$1',[id,decision,reason||null]);await audit(q,actor,'profile.'+decision,id,{reason,revision});
 if(decision==='approved'&&await flag(q,'referrals')){const u=await one(q,'SELECT * FROM users WHERE id=$1',[id]);if(u.referrer_id&&!u.referral_rewarded){await q.query('UPDATE users SET referral_rewarded=true WHERE id=$1',[id]);const f=await one(q,"SELECT config FROM feature_flags WHERE key='referrals'");const n=Math.min(10,Math.max(0,Number(f.config.reward_superlikes)||0));await grant(q,u.referrer_id,'superlikes',n);}}
 await notify(q,id,decision==='approved'?'💜 Ваша анкета одобрена. Знакомства начинаются!':'Анкета требует изменений: '+reason);
}
