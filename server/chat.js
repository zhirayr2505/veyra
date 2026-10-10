import {randomUUID} from 'node:crypto';
import {chatMediaRoutes} from './chat-media.js';
import stickers from '../shared/chat-stickers.json' with {type:'json'};
import {one} from './db.js';
import {fail} from './core.js';
import {z,parse,uuid,short} from './validation.js';
import {approved,pairLock,publicProfile,publicProfiles,notify} from './domain.js';

const visible=`m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM message_hides h WHERE h.message_id=m.id AND h.user_id=$2)`;
const fields=`m.id,m.match_id,m.sender,m.body,m.client_id,m.kind,m.sticker_id,(SELECT jsonb_build_object('mime',mm.mime,'size',mm.size_bytes,'width',mm.width,'height',mm.height,'duration',mm.duration,'waveform',mm.waveform) FROM message_media mm WHERE mm.message_id=m.id) AS media,m.created_at::text AS created_at,m.read_at,m.delivered_at,m.edited_at,m.reply_to,m.deleted_at,m.chat_revision::text AS revision,
 EXISTS(SELECT 1 FROM message_hides h WHERE h.message_id=m.id AND h.user_id=$2) AS hidden`;
const cursor=m=>m?Buffer.from(JSON.stringify([m.created_at,m.id])).toString('base64url'):null;
function decode(value){try{const [time,id]=JSON.parse(Buffer.from(value,'base64url').toString());if(!Number.isFinite(Date.parse(time)))throw Error();parse(uuid,id);return [time,id];}catch{fail(400,'INVALID_CURSOR');}}
async function access(q,mid,uid,write=false){
 const raw=await one(q,'SELECT * FROM matches WHERE id=$1 AND (a=$2 OR b=$2)',[mid,uid]);if(!raw)fail(404,'MATCH_NOT_FOUND');
 const other=String(raw.a)===String(uid)?raw.b:raw.a;
 // Same lock order as block/reaction actions. Serializes a send against a block.
 await pairLock(q,uid,other);
 const m=await one(q,'SELECT * FROM matches WHERE id=$1 FOR UPDATE',[mid]);await approved(q,uid);
 const b=(await q.query('SELECT actor FROM blocks WHERE (actor=$1 AND target=$2) OR (actor=$2 AND target=$1)',[uid,other])).rows;
 const target=await one(q,"SELECT u.last_seen,u.status,p.moderation FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=$1",[other]);
 const blocked_by_me=b.some(x=>String(x.actor)===String(uid));
 const unavailable=!m.active||b.length>0||target?.status!=='active'||target?.moderation!=='approved';
 if(write&&unavailable)fail(403,'CHAT_UNAVAILABLE');
 return {...m,other,blocked_by_me,unavailable,last_seen:target?.last_seen};
}
async function serialize(q,rows,uid){
 if(!rows.length)return [];
 const ids=rows.filter(x=>!x.hidden&&!x.deleted_at).map(x=>x.id);
 const reactions=ids.length?(await q.query('SELECT message_id,emoji,count(*)::int AS count,bool_or(user_id=$2) AS mine FROM message_reactions WHERE message_id=ANY($1::uuid[]) GROUP BY message_id,emoji ORDER BY emoji',[ids,uid])).rows:[];
 const replyIds=[...new Set(rows.filter(x=>!x.hidden&&!x.deleted_at&&x.reply_to).map(x=>x.reply_to))];
 const replies=replyIds.length?(await q.query(`SELECT m.id,m.sender,m.kind,m.sticker_id,left(m.body,180) AS body,p.name FROM messages m LEFT JOIN profiles p ON p.user_id=m.sender WHERE m.id=ANY($1::uuid[]) AND ${visible}`,[replyIds,uid])).rows:[];
 return rows.map(m=>m.hidden||m.deleted_at?{id:m.id,revision:m.revision,deleted:true}:{...m,hidden:undefined,deleted_at:undefined,reply:m.reply_to?(replies.find(x=>x.id===m.reply_to)||{id:m.reply_to,unavailable:true}):null,reactions:reactions.filter(x=>x.message_id===m.id).map(({emoji,count,mine})=>({emoji,count,mine}))});
}
async function record(q,mid,id,uid){const m=await one(q,`SELECT ${fields} FROM messages m WHERE m.match_id=$1 AND m.id=$3`,[mid,uid,id]);if(!m||m.hidden||m.deleted_at)fail(404,'MESSAGE_NOT_FOUND');return m;}
async function version(q,mid){return (await one(q,"SELECT coalesce(max(chat_revision),0)::text AS value FROM messages WHERE match_id=$1",[mid])).value;}
async function state(q,m,uid){
 const presence=await one(q,'SELECT seen_at,typing_until FROM chat_presence WHERE match_id=$1 AND user_id=$2',[m.id,m.other]);
 return {blocked_by_me:m.blocked_by_me,unavailable:m.unavailable,typing:!m.unavailable&&new Date(presence?.typing_until)>new Date(),online:!m.unavailable&&Date.now()-new Date(presence?.seen_at||0).getTime()<45000,last_seen:m.unavailable?null:m.last_seen,exchange:{mine:String(m.a)===String(uid)?m.a_exchange:m.b_exchange,mutual:!m.unavailable&&m.a_exchange&&m.b_exchange,...(!m.unavailable&&m.a_exchange&&m.b_exchange?{username:(await one(q,'SELECT username FROM users WHERE id=$1',[m.other]))?.username}: {})}};
}
const emojiSchema=z.string().max(32).refine(s=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(s)].length===1&&/\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(s),'emoji');
export function chatRoutes(app,{db,rate,env,storage}){
 chatMediaRoutes(app,{db,rate,env,storage,access,serialize,record,fields});
 app.get('/api/chat/stickers',(req,res)=>res.json(stickers));
 app.get('/api/matches',async(req,res)=>{
  await approved(db,req.user.id);
  const uid=String(req.user.id);
  const rows=(await db.query('SELECT m.*,NOT EXISTS(SELECT 1 FROM match_views v WHERE v.match_id=m.id AND v.user_id=$1) AS is_new FROM matches m WHERE m.active AND (m.a=$1 OR m.b=$1) ORDER BY m.created_at DESC LIMIT 100',[uid])).rows;
  if(!rows.length)return res.json([]);
  const other=m=>String(m.a)===uid?String(m.b):String(m.a);
  const ids=rows.map(m=>String(m.id));
  // Previous implementation sent 3-4 sequential SQL queries per match.
  // Gather message preview, unread count and block status in one batch query.
  const [profiles,metaRows]=await Promise.all([
   publicProfiles(db,[...new Set(rows.map(other))]),
   db.query(`SELECT mx.id,
      (SELECT row_to_json(last_message) FROM
       (SELECT msg.body,msg.kind,msg.sticker_id,msg.created_at,msg.sender,msg.edited_at
        FROM messages msg WHERE msg.match_id=mx.id AND msg.deleted_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM message_hides h WHERE h.message_id=msg.id AND h.user_id=$2)
        ORDER BY msg.created_at DESC,msg.id DESC LIMIT 1) last_message) AS last,
      (SELECT count(*)::int FROM messages msg
        WHERE msg.match_id=mx.id AND msg.sender<>$2 AND msg.read_at IS NULL AND msg.deleted_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM message_hides h WHERE h.message_id=msg.id AND h.user_id=$2)) AS unread,
      (SELECT b.actor FROM blocks b
       WHERE (b.actor=$2 AND b.target=(CASE WHEN mx.a=$2 THEN mx.b ELSE mx.a END))
       OR (b.target=$2 AND b.actor=(CASE WHEN mx.a=$2 THEN mx.b ELSE mx.a END))
       ORDER BY (b.actor=$2) DESC LIMIT 1) AS block_actor
     FROM matches mx WHERE mx.id=ANY($1::uuid[])`,[ids,uid])
  ]);
  const meta=new Map(metaRows.rows.map(x=>[String(x.id),x]));
  const result=rows.flatMap(m=>{
   const profile=profiles.get(other(m));if(!profile)return [];
   const item=meta.get(String(m.id))||{},block=String(item.block_actor||'');
   return [{...m,profile,blocked_by_me:block===uid,unavailable:!!item.block_actor,last:item.last||null,unread:item.unread||0}];
  });
  res.json(result);
 });
 app.post('/api/matches/:id/seen',async(req,res)=>{
  const mid=parse(uuid,req.params.id),uid=String(req.user.id);
  const result=await db.query(`INSERT INTO match_views(match_id,user_id)
    SELECT id,$2::bigint FROM matches WHERE id=$1 AND active AND (a=$2 OR b=$2)
    ON CONFLICT(match_id,user_id) DO UPDATE SET seen_at=now() RETURNING match_id`,[mid,uid]);
  if(!result.rowCount)fail(404,'MATCH_NOT_FOUND');
  res.json({ok:true});
 });
 app.get('/api/matches/:id/messages',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id;const before=req.query.before?decode(req.query.before):null;const after=req.query.after?decode(req.query.after):null;const since=req.query.since===undefined?null:parse(z.string().regex(/^\d{1,19}$/),req.query.since);const around=req.query.around?parse(uuid,req.query.around):null;
 res.json(await db.tx(async q=>{const m=await access(q,mid,uid);let rows,more,newer=false;const args=[mid,uid];
 if(since!==null){rows=(await q.query(`SELECT ${fields} FROM messages m WHERE m.match_id=$1 AND m.chat_revision>$3::bigint ORDER BY m.chat_revision LIMIT 101`,[...args,since])).rows;more=rows.length>100;rows=rows.slice(0,100);}
 else if(around){const target=await record(q,mid,around,uid);const a=[...args,target.created_at,target.id];const left=(await q.query(`SELECT ${fields} FROM messages m WHERE m.match_id=$1 AND ${visible} AND (m.created_at,m.id)<=($3::timestamptz,$4::uuid) ORDER BY m.created_at DESC,m.id DESC LIMIT 26`,a)).rows;const right=(await q.query(`SELECT ${fields} FROM messages m WHERE m.match_id=$1 AND ${visible} AND (m.created_at,m.id)>($3::timestamptz,$4::uuid) ORDER BY m.created_at,m.id LIMIT 26`,a)).rows;more=left.length>25;newer=right.length>25;rows=[...left.slice(0,25).reverse(),...right.slice(0,25)];}
 else {const c=before||after;rows=(await q.query(`SELECT ${fields} FROM messages m WHERE m.match_id=$1 AND ${visible} ${c?`AND (m.created_at,m.id)${after?'>':'<'}($3::timestamptz,$4::uuid)`:''} ORDER BY m.created_at ${after?'ASC':'DESC'},m.id ${after?'ASC':'DESC'} LIMIT 51`,c?[...args,...c]:args)).rows;more=rows.length>50;rows=rows.slice(0,50);if(!after)rows.reverse();newer=!!after&&more;}
 const queriedRevision=rows.at(-1)?.revision||since;
 // Fetching a page is delivery, never an implicit read of unseen history.
 const incoming=rows.filter(x=>String(x.sender)!==String(uid)&&!x.hidden&&!x.deleted_at&&!x.delivered_at).map(x=>x.id);
 if(incoming.length){const now=new Date().toISOString();const changed=(await q.query("UPDATE messages SET delivered_at=$2,chat_revision=nextval('chat_revision_seq') WHERE id=ANY($1::uuid[]) RETURNING id,chat_revision::text AS revision",[incoming,now])).rows;for(const row of rows){const c=changed.find(x=>x.id===row.id);if(c){row.delivered_at=now;row.revision=c.revision;}}}
 await q.query("INSERT INTO chat_presence(match_id,user_id) VALUES($1,$2) ON CONFLICT(match_id,user_id) DO UPDATE SET seen_at=now() WHERE chat_presence.seen_at<now()-interval '20 seconds'",[mid,uid]);
 await q.query("UPDATE users SET last_seen=now() WHERE id=$1 AND last_seen<now()-interval '30 seconds'",[uid]);
 const sync=since!==null&&more?queriedRevision:await version(q,mid);
 // On paginated sync keep the original queried revision boundary, before receipt changes.
 return {messages:await serialize(q,rows,uid),has_more:since===null?more:false,has_newer:newer,before:cursor(rows[0]),after:cursor(rows.at(-1)),sync_version:sync,sync_more:since!==null&&more,...await state(q,m,uid),first_unread:since===null&&!before&&!after&&!around?(await one(q,`SELECT m.id FROM messages m WHERE m.match_id=$1 AND m.sender<>$2 AND m.read_at IS NULL AND ${visible} ORDER BY m.created_at,m.id LIMIT 1`,args))?.id:null};
 }));});
 app.post('/api/matches/:id/messages',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id,b=parse(z.object({kind:z.enum(['text','sticker']).default('text'),body:z.string().trim().max(2000).default(''),sticker_id:z.string().max(60).optional(),client_id:uuid,reply_to:uuid.nullable().optional()}).refine(x=>x.kind==='text'?x.body.length>0:stickers.stickers.some(s=>s.id===x.sticker_id)),req.body);await rate('message:'+uid,40);res.json(await db.tx(async q=>{const m=await access(q,mid,uid,true);const old=await one(q,'SELECT id,match_id FROM messages WHERE sender=$1 AND client_id=$2',[uid,b.client_id]);if(old){if(old.match_id!==mid)fail(409,'CLIENT_ID_CONFLICT');const row=await one(q,`SELECT ${fields} FROM messages m WHERE m.id=$1`,[old.id,uid]);return (await serialize(q,[row],uid))[0];}if(b.reply_to)await record(q,mid,b.reply_to,uid);
 const row=await one(q,'INSERT INTO messages(id,match_id,sender,body,original_body,client_id,reply_to,kind,sticker_id) VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8) RETURNING id',[randomUUID(),mid,uid,b.kind==='text'?b.body:'',b.client_id,b.reply_to||null,b.kind,b.kind==='sticker'?b.sticker_id:null]);await notify(q,m.other,'💬 Новое сообщение в VEYRA.');await q.query('UPDATE chat_presence SET typing_until=NULL WHERE match_id=$1 AND user_id=$2',[mid,uid]);return (await serialize(q,[await record(q,mid,row.id,uid)],uid))[0];}));});
 app.patch('/api/matches/:id/messages/:message',async(req,res)=>{const mid=parse(uuid,req.params.id),id=parse(uuid,req.params.message),uid=req.user.id,b=parse(z.object({body:z.string().trim().max(2000)}),req.body);await rate('chat-edit:'+uid,30);res.json(await db.tx(async q=>{await access(q,mid,uid,true);const row=await record(q,mid,id,uid);if(String(row.sender)!==String(uid))fail(403,'MESSAGE_NOT_YOURS');if(!['text','image'].includes(row.kind)||row.kind==='text'&&!b.body)fail(400,'MESSAGE_NOT_EDITABLE');if(row.body!==b.body){await q.query('INSERT INTO message_edits(message_id,body) VALUES($1,$2)',[id,row.body]);await q.query("UPDATE messages SET original_body=coalesce(original_body,body),body=$2,edited_at=now(),chat_revision=nextval('chat_revision_seq') WHERE id=$1",[id,b.body]);await q.query("UPDATE messages SET chat_revision=nextval('chat_revision_seq') WHERE reply_to=$1",[id]);}return (await serialize(q,[await record(q,mid,id,uid)],uid))[0];}));});
 app.delete('/api/matches/:id/messages/:message',async(req,res)=>{const mid=parse(uuid,req.params.id),id=parse(uuid,req.params.message),uid=req.user.id;const b=parse(z.object({scope:z.enum(['me','everyone'])}),req.body);res.json(await db.tx(async q=>{await access(q,mid,uid);const row=await one(q,'SELECT * FROM messages WHERE id=$1 AND match_id=$2',[id,mid]);if(!row)fail(404,'MESSAGE_NOT_FOUND');if(String(row.sender)!==String(uid))fail(403,'MESSAGE_NOT_YOURS');if(b.scope==='everyone')await q.query("UPDATE messages SET deleted_at=coalesce(deleted_at,now()),original_body=coalesce(original_body,body),chat_revision=nextval('chat_revision_seq') WHERE id=$1",[id]);else {await q.query('INSERT INTO message_hides(message_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,uid]);await q.query("UPDATE messages SET chat_revision=nextval('chat_revision_seq') WHERE id=$1",[id]);}
 // Replies to a hidden/deleted original must also refresh, without leaking its text.
 await q.query("UPDATE messages SET chat_revision=nextval('chat_revision_seq') WHERE reply_to=$1",[id]);return {ok:true};}));});
 app.put('/api/matches/:id/messages/:message/reaction',async(req,res)=>{const mid=parse(uuid,req.params.id),id=parse(uuid,req.params.message),uid=req.user.id,b=parse(z.object({emoji:emojiSchema.nullable()}),req.body);await rate('chat-reaction:'+uid,40);res.json(await db.tx(async q=>{await access(q,mid,uid,true);await record(q,mid,id,uid);if(b.emoji===null)await q.query('DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2',[id,uid]);else await q.query('INSERT INTO message_reactions(message_id,user_id,emoji) VALUES($1,$2,$3) ON CONFLICT(message_id,user_id) DO UPDATE SET emoji=$3',[id,uid,b.emoji]);await q.query("UPDATE messages SET chat_revision=nextval('chat_revision_seq') WHERE id=$1",[id]);return (await serialize(q,[await record(q,mid,id,uid)],uid))[0];}));});
 app.post('/api/matches/:id/read',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id,b=parse(z.object({ids:z.array(uuid).max(100).default([])}),req.body);res.json(await db.tx(async q=>{await access(q,mid,uid);if(b.ids.length)await q.query(`UPDATE messages m SET read_at=now(),delivered_at=coalesce(delivered_at,now()),chat_revision=nextval('chat_revision_seq') WHERE m.match_id=$1 AND m.sender<>$2 AND m.id=ANY($3::uuid[]) AND m.read_at IS NULL AND ${visible}`,[mid,uid,b.ids]);return {ok:true};}));});
 app.post('/api/matches/:id/typing',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id,b=parse(z.object({typing:z.boolean()}),req.body);await rate('chat-typing:'+uid,24);res.json(await db.tx(async q=>{await access(q,mid,uid,true);await q.query("INSERT INTO chat_presence(match_id,user_id,typing_until) VALUES($1,$2,CASE WHEN $3 THEN now()+interval '7 seconds' ELSE NULL END) ON CONFLICT(match_id,user_id) DO UPDATE SET seen_at=now(),typing_until=EXCLUDED.typing_until",[mid,uid,b.typing]);return {ok:true};}));});
 app.get('/api/matches/:id/search',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id,query=parse(short(120),req.query.q),before=req.query.before?decode(req.query.before):null;await rate('chat-search:'+uid,30);res.json(await db.tx(async q=>{await access(q,mid,uid);const args=[mid,uid,query];const rows=(await q.query(`SELECT m.id,m.sender,left(m.body,240) AS body,m.created_at::text AS created_at FROM messages m WHERE m.match_id=$1 AND ${visible} AND strpos(lower(m.body),lower($3))>0 ${before?'AND (m.created_at,m.id)<($4::timestamptz,$5::uuid)':''} ORDER BY m.created_at DESC,m.id DESC LIMIT 31`,before?[...args,...before]:args)).rows;return {results:rows.slice(0,30),has_more:rows.length>30,before:cursor(rows.slice(0,30).at(-1))};}));});
 app.post('/api/matches/:id/report',async(req,res)=>{const mid=parse(uuid,req.params.id),uid=req.user.id,b=parse(z.object({reason:z.enum(['spam','harassment','fraud','explicit','fake','other']),details:z.string().trim().max(2000).default(''),message_id:uuid.optional()}),req.body);await rate('report:'+uid,10,3600);res.json(await db.tx(async q=>{const m=await access(q,mid,uid);const reported=b.message_id?await record(q,mid,b.message_id,uid):null;if(reported&&String(reported.sender)===String(uid))fail(400,'INVALID_REPORT');if(reported)reported.media=await one(q,'SELECT * FROM message_media WHERE message_id=$1',[reported.id]);const context=(await q.query(`SELECT m.id,m.sender,m.kind,m.sticker_id,m.body,m.original_body,m.created_at,m.edited_at,(SELECT row_to_json(mm) FROM message_media mm WHERE mm.message_id=m.id) AS media FROM messages m WHERE m.match_id=$1 AND ${visible} ORDER BY m.created_at DESC,m.id DESC LIMIT 20`,[mid,uid])).rows;await q.query('INSERT INTO reports(id,reporter,target,reason,details,chat_context) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),uid,m.other,b.reason,b.details,JSON.stringify({match_id:mid,message_id:b.message_id||null,reported,messages:context})]);await notify(q,env.OWNER_TELEGRAM_ID,'Новая жалоба на переписку VEYRA. /queue','admin');return {ok:true};}));});
}
