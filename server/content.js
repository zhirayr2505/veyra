import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {z,parse,uuid,short} from './validation.js';
import {approved,audit,flag,moderate} from './domain.js';
import {fail} from './core.js';
const fields=z.object({title:short(100),body:short(2000),kind:z.enum(['today','faq']),activity:z.enum(['coffee','walk','dinner','cinema','ride','party','meet']).nullable(),city:z.string().trim().max(100),active:z.boolean()});
export function contentRoutes(app,{db,rate}){
 app.get('/api/content',async(req,res)=>{
  const kind=parse(z.enum(['today','faq']),req.query.kind||'today');
  if(kind==='today'&&!await flag(db,'today'))return res.json([]);
  const city=(await one(db,'SELECT city FROM profiles WHERE user_id=$1',[req.user.id]))?.city||'';
  res.json((await db.query(`SELECT c.id,c.title,c.body,c.kind,c.activity,c.city,EXISTS(SELECT 1 FROM content_interests i WHERE i.content_id=c.id AND i.user_id=$2 AND i.day=CURRENT_DATE) AS interested FROM content_items c WHERE c.active AND c.kind=$1 AND (c.city='' OR lower(c.city)=lower($3)) ORDER BY c.created_at,c.id LIMIT 50`,[kind,req.user.id,city])).rows);
 });
 app.put('/api/content/:id/interest',async(req,res)=>{
  await approved(db,req.user.id);if(!await flag(db,'today'))fail(403,'FEATURE_DISABLED');await rate('content:'+req.user.id,30);
  const cid=parse(uuid,req.params.id),value=parse(z.boolean(),req.body.interested);
  const row=await one(db,"SELECT id FROM content_items WHERE id=$1 AND active AND kind='today'",[cid]);if(!row)fail(404,'NOT_FOUND');
  if(value)await db.query('INSERT INTO content_interests(user_id,content_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,cid]);else await db.query('DELETE FROM content_interests WHERE user_id=$1 AND content_id=$2 AND day=CURRENT_DATE',[req.user.id,cid]);res.json({ok:true});
 });
 app.get('/api/admin/content',async(req,res)=>res.json((await db.query('SELECT * FROM content_items ORDER BY updated_at DESC LIMIT 200')).rows));
 app.post('/api/admin/content',async(req,res)=>{
  const b=parse(fields,req.body),cid=randomUUID();await db.tx(async q=>{await q.query('INSERT INTO content_items(id,title,body,kind,activity,city,active) VALUES($1,$2,$3,$4,$5,$6,$7)',[cid,b.title,b.body,b.kind,b.activity,b.city,b.active]);await audit(q,req.user.id,'content.create',cid);});res.json({id:cid});
 });
 app.patch('/api/admin/content/:id',async(req,res)=>{
  const b=parse(fields,req.body),cid=parse(uuid,req.params.id);await db.tx(async q=>{const r=await one(q,'UPDATE content_items SET title=$2,body=$3,kind=$4,activity=$5,city=$6,active=$7,updated_at=now() WHERE id=$1 RETURNING id',[cid,b.title,b.body,b.kind,b.activity,b.city,b.active]);if(!r)fail(404,'NOT_FOUND');await audit(q,req.user.id,'content.update',cid);});res.json({ok:true});
 });
 app.post('/api/admin/profiles/bulk',async(req,res)=>{
  const b=parse(z.object({profiles:z.array(z.object({id:z.string().regex(/^\d{1,16}$/),revision:z.number().int().positive()})).min(1).max(50),decision:z.enum(['approved','rejected']),reason:z.string().trim().max(1000),confirm:z.literal(true)}),req.body);
  if(b.decision==='rejected'&&!b.reason)fail(400,'REASON_REQUIRED');
  await db.tx(async q=>{for(const p of [...b.profiles].sort((a,b)=>a.id.localeCompare(b.id)))await moderate(q,req.user.id,p.id,b.decision,b.reason,p.revision);});res.json({ok:true,count:b.profiles.length});
 });
}
