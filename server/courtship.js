import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail} from './core.js';
import {z,parse,id,uuid} from './validation.js';
import {approved,ensurePair,pairLock,flag,audit,notify} from './domain.js';
import {StarsProvider} from './payments.js';

// The server, never the browser, owns the amount and term. No autorenewal.
export const COURTSHIP_STARS=99;
export const COURTSHIP_DAYS=30;

async function matched(q,a,b){
 const row=await one(q,'SELECT id FROM matches WHERE active=true AND (a=$1 AND b=$2 OR a=$2 AND b=$1)',[a,b]);
 if(!row)fail(403,'MATCH_REQUIRED');
 return row;
}
async function marker(q,uid){
 const suits=(await q.query(`SELECT c.id,c.sender,p.name AS sender_name,c.expires_at
 FROM courtships c JOIN profiles p ON p.user_id=c.sender
 JOIN users u ON u.id=c.sender JOIN matches m ON m.id=c.match_id
 WHERE c.recipient=$1 AND c.status='active' AND c.expires_at>now()
 AND m.active=true AND u.status='active' AND p.moderation='approved'
 AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
 (b.actor=c.sender AND b.target=c.recipient) OR (b.actor=c.recipient AND b.target=c.sender))
 ORDER BY c.activated_at DESC LIMIT 20`,[uid])).rows;
 return suits;
}
export async function activatePaidCourtship(q,order){
 const c=await one(q,"SELECT * FROM courtships WHERE order_id=$1 AND status='payment_pending' FOR UPDATE",[order.id]);
 if(!c)fail(409,'COURTSHIP_ORDER_UNAVAILABLE');
 const m=await one(q,'SELECT active FROM matches WHERE id=$1',[c.match_id]);
 if(!m?.active)fail(409,'MATCH_ENDED');
 const row=await one(q,`UPDATE courtships SET status='active',activated_at=now(),
 expires_at=now()+($2::text||' days')::interval WHERE id=$1 RETURNING *`,[c.id,COURTSHIP_DAYS]);
 await audit(q,c.sender,'courtship.activated',c.id,{recipient:c.recipient,stars:order.total,days:COURTSHIP_DAYS});
 await notify(q,c.sender,'💜 Статус ухажёра VEYRA активирован на '+COURTSHIP_DAYS+' дней.');
 await notify(q,c.recipient,'💜 В твоём профиле появился подтверждённый ухажёр. Публичную отметку можно скрыть в любое время.');
 return row;
}
export async function revokePaidCourtship(q,order){
 const c=await one(q,"UPDATE courtships SET status='revoked',expires_at=now() WHERE order_id=$1 AND status='active' RETURNING *",[order.id]);
 if(c)await audit(q,c.sender,'courtship.refunded',c.id,{recipient:c.recipient});
}
export function courtshipRoutes(app,{db,rate,tg,env}){
 app.get('/api/courtships/profile/:target',async(req,res)=>{
  const target=req.params.target==='me'?String(req.user.id):parse(id,req.params.target);
  if(String(target)===String(req.user.id))await approved(db,req.user.id);
  else await ensurePair(db,req.user.id,target);
  const mine=String(target)===String(req.user.id)?null:await one(db,`SELECT id,status,created_at,responded_at,expires_at
   FROM courtships WHERE sender=$1 AND recipient=$2`,[req.user.id,target]);
  res.json({suitors:await marker(db,target),mine:mine||null,stars:COURTSHIP_STARS,days:COURTSHIP_DAYS});
 });
 app.get('/api/courtships/inbox',async(req,res)=>{
  await approved(db,req.user.id);
  res.json((await db.query(`SELECT c.id,c.sender,p.name AS sender_name,c.status,c.created_at,c.expires_at
   FROM courtships c JOIN profiles p ON p.user_id=c.sender
   JOIN matches m ON m.id=c.match_id
   WHERE c.recipient=$1 AND c.status IN ('pending','accepted','payment_pending','active')
   AND (c.status<>'active' OR c.expires_at>now()) AND m.active=true
   AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
    (b.actor=c.sender AND b.target=c.recipient) OR (b.actor=c.recipient AND b.target=c.sender))
   ORDER BY c.created_at DESC LIMIT 30`,[req.user.id])).rows);
 });
 app.post('/api/courtships/request',async(req,res)=>{
  await rate('courtship-request:'+req.user.id,8,3600);
  const target=parse(z.object({target:id}).strict(),req.body).target;
  const c=await db.tx(async q=>{
   await pairLock(q,req.user.id,target);await ensurePair(q,req.user.id,target);
   const m=await matched(q,req.user.id,target);
   const old=await one(q,'SELECT * FROM courtships WHERE sender=$1 AND recipient=$2 FOR UPDATE',[req.user.id,target]);
   if(old&&(['pending','accepted','payment_pending'].includes(old.status)||(old.status==='active'&&new Date(old.expires_at)>new Date())))return old;
   const row=old?await one(q,`UPDATE courtships SET status='pending',match_id=$2,order_id=NULL,
    responded_at=NULL,activated_at=NULL,expires_at=NULL,created_at=now() WHERE id=$1 RETURNING *`,[old.id,m.id]):
    await one(q,`INSERT INTO courtships(id,sender,recipient,match_id,status)
    VALUES($1,$2,$3,$4,'pending') RETURNING *`,[randomUUID(),req.user.id,target,m.id]);
   await audit(q,req.user.id,'courtship.requested',row.id,{recipient:target});
   await notify(q,target,'💜 У тебя новое предложение об ухаживании в VEYRA. Принять или отклонить его можно в своём профиле. До согласия никакой публичной отметки и оплаты нет.');
   return row;
  });
  res.status(201).json({id:c.id,status:c.status});
 });
 app.post('/api/courtships/:id/respond',async(req,res)=>{
  const cid=parse(uuid,req.params.id);
  const {accept}=parse(z.object({accept:z.boolean()}).strict(),req.body);
  const row=await db.tx(async q=>{
   const initial=await one(q,'SELECT recipient FROM courtships WHERE id=$1',[cid]);
   if(!initial||String(initial.recipient)!==String(req.user.id))fail(404,'COURTSHIP_NOT_FOUND');
   const c=await one(q,'SELECT * FROM courtships WHERE id=$1 FOR UPDATE',[cid]);
   if(c.status!=='pending')fail(409,'COURTSHIP_ALREADY_HANDLED');
   await ensurePair(q,c.sender,c.recipient);await matched(q,c.sender,c.recipient);
   const updated=await one(q,"UPDATE courtships SET status=$2,responded_at=now() WHERE id=$1 RETURNING *",[cid,accept?'accepted':'declined']);
   await audit(q,req.user.id,accept?'courtship.accepted':'courtship.declined',cid);
   await notify(q,c.sender,accept?'💜 Предложение об ухаживании принято! Чтобы активировать публичную отметку, открой профиль и оплати Stars.':'Предложение об ухаживании отклонено.');
   return updated;
  });
  res.json({id:row.id,status:row.status});
 });
 app.post('/api/courtships/:id/pay',async(req,res)=>{
  const cid=parse(uuid,req.params.id);
  await rate('courtship-pay:'+req.user.id,10,3600);
  const order=await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const c=await one(q,'SELECT * FROM courtships WHERE id=$1 AND sender=$2 FOR UPDATE',[cid,req.user.id]);
   if(!c)fail(404,'COURTSHIP_NOT_FOUND');
   if(!['accepted','payment_pending'].includes(c.status))fail(409,'COURTSHIP_NOT_ACCEPTED');
   await ensurePair(q,c.sender,c.recipient);await matched(q,c.sender,c.recipient);
   if(String(req.user.id)===String(env.OWNER_TELEGRAM_ID)){await q.query("UPDATE courtships SET status='active',activated_at=now(),expires_at=now()+interval '30 days',order_id=NULL WHERE id=$1",[cid]);await audit(q,req.user.id,'owner.test.courtship',cid,{stars_charged:0});await notify(q,c.recipient,'💜 Предложение об ухаживании принято и активировано в VEYRA.');return {owner_free:true};}
   if(!await flag(q,'payments'))fail(503,'PAYMENTS_DISABLED');
   if(c.status==='payment_pending'){
    const pending=await one(q,'SELECT * FROM orders WHERE id=$1',[c.order_id]);
    if(pending?.status==='pending')return pending;
    fail(409,'COURTSHIP_ORDER_UNAVAILABLE');
   }
   const row=await one(q,`INSERT INTO orders(id,user_id,sku,total,kind,amount,first_only)
    VALUES($1,$2,NULL,$3,'courtship',$4,false) RETURNING *`,
    [randomUUID(),c.sender,COURTSHIP_STARS,COURTSHIP_DAYS]);
   await q.query("UPDATE courtships SET status='payment_pending',order_id=$2 WHERE id=$1",[cid,row.id]);
   return row;
  });
  if(order.owner_free){res.json({status:'active',stars_charged:0,days:COURTSHIP_DAYS});return;}
  const url=await new StarsProvider(tg).invoice({...order,title:'VEYRA · Ухажёр на '+COURTSHIP_DAYS+' дней'});
  res.json({status:'payment_required',order_id:order.id,invoice_url:url,stars:COURTSHIP_STARS,days:COURTSHIP_DAYS});
 });
 app.get('/api/courtships/:id/status',async(req,res)=>{
  const cid=parse(uuid,req.params.id);
  const c=await one(db,'SELECT id,sender,recipient,status,expires_at FROM courtships WHERE id=$1',[cid]);
  if(!c||![String(c.sender),String(c.recipient)].includes(String(req.user.id)))fail(404,'COURTSHIP_NOT_FOUND');
  res.json({id:c.id,status:c.status,expires_at:c.expires_at});
 });
 app.post('/api/courtships/:id/stop',async(req,res)=>{
  const cid=parse(uuid,req.params.id);
  const c=await db.tx(async q=>{
   const initial=await one(q,'SELECT sender,recipient FROM courtships WHERE id=$1',[cid]);
   if(!initial||![String(initial.sender),String(initial.recipient)].includes(String(req.user.id)))fail(404,'COURTSHIP_NOT_FOUND');
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[initial.sender]);
   const old=await one(q,'SELECT * FROM courtships WHERE id=$1 FOR UPDATE',[cid]);
   if(old.status==='payment_pending')fail(409,'COURTSHIP_PAYMENT_PENDING');
   if(!['pending','accepted','active'].includes(old.status))return old;
   const row=await one(q,"UPDATE courtships SET status='cancelled',expires_at=now() WHERE id=$1 RETURNING *",[cid]);
   await audit(q,req.user.id,'courtship.stopped',cid);
   await notify(q,String(req.user.id)===String(old.sender)?old.recipient:old.sender,'Статус ухаживания в VEYRA завершён.');
   return row;
  });
  res.json({id:c.id,status:c.status});
 });
}
