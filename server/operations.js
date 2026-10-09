import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {z,parse,id,short} from './validation.js';
import {fail,safeCSV} from './core.js';
import {audit} from './domain.js';
import {writeXLSX} from './xlsx.js';

// Only these explicit projections are exportable. Never expose sessions, keys or storage paths.
const datasets={
 users:"SELECT u.id,u.first_name,u.username,u.status,u.admin_role,p.name,p.city,p.moderation,u.created_at FROM users u LEFT JOIN profiles p ON p.user_id=u.id",
 profiles:'SELECT user_id,name,city,moderation,revision,updated_at AS created_at FROM profiles',
 matches:'SELECT id,a,b,active,created_at FROM matches',
 chats:'SELECT m.id,m.a,m.b,m.active,m.created_at,count(ms.id)::int AS messages FROM matches m LEFT JOIN messages ms ON ms.match_id=m.id GROUP BY m.id',
 subscriptions:'SELECT id,first_name,premium_until,created_at FROM users WHERE premium_until IS NOT NULL',
 boosts:'SELECT id,user_id,source,started_at AS created_at,ends_at FROM boost_runs',
 referrals:'SELECT id,referrer_id,referral_rewarded,created_at FROM users WHERE referrer_id IS NOT NULL',
 today:'SELECT user_id,activity,time_slot,expires_at,created_at FROM today',
 payments:'SELECT id,user_id,sku,total,currency,status,created_at,paid_at FROM orders',
 reports:'SELECT id,reporter,target,reason,status,created_at FROM reports',
 support:'SELECT id,user_id,category,status,created_at,updated_at FROM tickets',
 admins:'SELECT id,first_name,username,admin_role,created_at FROM users WHERE admin_role IS NOT NULL',
 audit:'SELECT id,actor,action,subject,created_at FROM audit_log',
 broadcasts:'SELECT id,body,audience,status,recipient_count,created_at,queued_at FROM broadcasts'
};
export function operationsRoutes(app,{db,rate,env}){
 app.get('/api/admin/records/:dataset/export.xlsx',async(req,res)=>{
  await rate('export:'+req.user.id,3,3600);
  const dataset=parse(z.enum(Object.keys(datasets)),req.params.dataset),search=parse(z.string().max(100),req.query.q||'');
  const rows=(await db.query(`SELECT * FROM (${datasets[dataset]}) d WHERE to_jsonb(d)::text ILIKE $1 ORDER BY created_at DESC,to_jsonb(d)::text LIMIT 10001`,['%'+search+'%'])).rows;
  if(rows.length>10000)fail(400,'EXPORT_FILTER_REQUIRED');
  await audit(db,req.user.id,'admin.export',dataset,{format:'xlsx',count:rows.length});
  res.set('Content-Disposition',`attachment; filename="veyra-${dataset}.xlsx"`).type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');await writeXLSX(rows,res);
 });
 app.get('/api/admin/tickets',async(req,res)=>{
  const rows=(await db.query('SELECT * FROM tickets ORDER BY updated_at DESC LIMIT 100')).rows;
  for(const r of rows)r.messages=(await db.query('SELECT body,is_staff,created_at FROM support_messages WHERE ticket_id=$1 ORDER BY created_at,id',[r.id])).rows;
  res.json(rows);
 });
 app.get('/api/admin/access',(req,res)=>res.json({role:req.adminRole}));
 app.get('/api/admin/records/:dataset',async(req,res)=>{
  const dataset=parse(z.enum(Object.keys(datasets)),req.params.dataset);
  const search=parse(z.string().max(100),req.query.q||'');
  const page=parse(z.coerce.number().int().min(0).max(10000),req.query.page||0);
  const direction=parse(z.enum(['asc','desc']),req.query.order||'desc');
  const rows=(await db.query(`SELECT * FROM (${datasets[dataset]}) d WHERE to_jsonb(d)::text ILIKE $1 ORDER BY created_at ${direction} NULLS LAST,to_jsonb(d)::text LIMIT 26 OFFSET $2`,['%'+search+'%',page*25])).rows;
  res.json({rows:rows.slice(0,25),more:rows.length>25,page});
 });
 app.get('/api/admin/metrics',async(req,res)=>{
  const days=parse(z.coerce.number().int().min(1).max(90),req.query.days||7);
  const totals=await one(db,`SELECT (SELECT count(*)::int FROM users WHERE status='active') AS users,
   (SELECT count(*)::int FROM users WHERE last_seen>now()-interval '24 hours' AND status='active') AS active,
   (SELECT count(*)::int FROM profiles WHERE moderation='pending') AS pending,
   (SELECT count(*)::int FROM reactions WHERE kind<>'pass') AS likes,
   (SELECT count(*)::int FROM matches WHERE active) AS matches,
   (SELECT count(*)::int FROM messages) AS messages,
   (SELECT count(*)::int FROM users WHERE premium_until>now()) AS premium,
   (SELECT count(*)::int FROM users WHERE boost_until>now()) AS boosts,
   (SELECT count(*)::int FROM reports WHERE status='open') AS reports,
   (SELECT coalesce(sum(total),0)::int FROM orders WHERE status='paid') AS stars`);
  const series=(await db.query(`SELECT day::date AS day,
   (SELECT count(*)::int FROM users WHERE created_at>=day AND created_at<day+interval '1 day') AS registrations,
   (SELECT count(*)::int FROM matches WHERE created_at>=day AND created_at<day+interval '1 day') AS matches,
   (SELECT coalesce(sum(total),0)::int FROM orders WHERE status='paid' AND paid_at>=day AND paid_at<day+interval '1 day') AS stars
   FROM generate_series(CURRENT_DATE-($1::int-1),CURRENT_DATE,interval '1 day') AS day ORDER BY day`,[days])).rows;
  res.json({totals,series});
 });
 app.get('/api/admin/health',async(req,res)=>res.json(await one(db,`SELECT now() AS checked_at,
  (SELECT count(*)::int FROM outbox WHERE delivered_at IS NULL AND attempts<8) AS notifications_pending,
  (SELECT count(*)::int FROM outbox WHERE delivered_at IS NULL AND attempts>=8) AS notifications_failed,
  (SELECT count(*)::int FROM storage_gc) AS media_cleanup_pending,
  (SELECT max(created_at) FROM webhook_updates) AS last_webhook`)));
 app.get('/api/admin/products',async(req,res)=>res.json((await db.query('SELECT * FROM products ORDER BY kind,amount')).rows));
 app.patch('/api/admin/products/:sku',async(req,res)=>{
  const b=parse(z.object({title:short(100),stars:z.number().int().min(1).max(100000),active:z.boolean()}),req.body);
  await db.tx(async q=>{const row=await one(q,'UPDATE products SET title=$2,stars=$3,active=$4 WHERE sku=$1 RETURNING sku',[req.params.sku,b.title,b.stars,b.active]);if(!row)fail(404,'PRODUCT_NOT_FOUND');await audit(q,req.user.id,'product.update',row.sku,b);});res.json({ok:true});
 });
 app.patch('/api/admin/roles/:id',async(req,res)=>{
  const uid=parse(id,req.params.id),role=parse(z.enum(['moderator','support']).nullable(),req.body.role);
  if(uid===String(env.OWNER_TELEGRAM_ID))fail(400,'OWNER_PROTECTED');
  await db.tx(async q=>{const row=await one(q,"UPDATE users SET admin_role=$2 WHERE id=$1 AND status='active' RETURNING id",[uid,role]);if(!row)fail(404,'USER_NOT_FOUND');await q.query("DELETE FROM sessions WHERE user_id=$1 AND scope='admin'",[uid]);await audit(q,req.user.id,'admin.role',uid,{role});});res.json({ok:true});
 });
 app.patch('/api/admin/referral-reward',async(req,res)=>{
  const amount=parse(z.number().int().min(0).max(100),req.body.amount);
  await db.tx(async q=>{await q.query("UPDATE feature_flags SET config=jsonb_set(config,'{reward_superlikes}',$1::jsonb) WHERE key='referrals'",[String(amount)]);await audit(q,req.user.id,'referral.reward','referrals',{amount});});res.json({ok:true});
 });
 app.post('/api/admin/broadcasts',async(req,res)=>{
  const b=parse(z.object({body:short(3000),audience:z.enum(['all','premium'])}),req.body),bid=randomUUID();
  await db.tx(async q=>{await q.query('INSERT INTO broadcasts(id,created_by,body,audience) VALUES($1,$2,$3,$4)',[bid,req.user.id,b.body,b.audience]);await audit(q,req.user.id,'broadcast.draft',bid);});res.json({id:bid});
 });
 app.post('/api/admin/broadcasts/:id/send',async(req,res)=>{
  await rate('broadcast:'+req.user.id,3,3600);if(req.body.confirm!==true)fail(400,'CONFIRM_REQUIRED');
  const result=await db.tx(async q=>{
   const b=await one(q,'SELECT * FROM broadcasts WHERE id=$1 FOR UPDATE',[parse(z.string().uuid(),req.params.id)]);if(!b)fail(404,'NOT_FOUND');if(b.status==='queued')return {count:b.recipient_count};
   const users=(await q.query("SELECT id FROM users WHERE status='active' AND notifications AND id>0 AND ($1='all' OR premium_until>now())",[b.audience])).rows;
   await q.query(`INSERT INTO outbox(id,bot,recipient,payload) SELECT gen_random_uuid(),'user',id,jsonb_build_object('text',$2::text) FROM users WHERE status='active' AND notifications AND id>0 AND ($1='all' OR premium_until>now())`,[b.audience,b.body]);
   await q.query("UPDATE broadcasts SET status='queued',queued_at=now(),recipient_count=$2 WHERE id=$1",[b.id,users.length]);await audit(q,req.user.id,'broadcast.queued',b.id,{count:users.length});return {count:users.length};
  });res.json(result);
 });
}
