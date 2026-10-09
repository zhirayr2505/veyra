import archiver from 'archiver';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
import {one} from './db.js';
import {safeCSV,fail} from './core.js';
import {audit} from './domain.js';

const columns=['id','username','first_name','name','status','created_at','last_seen','language','city','country','moderation','premium_until','superlikes','boosts','prematches','referrer_id','referrals','paid_stars'];
const userSQL=`SELECT u.id,u.username,u.first_name,p.name,u.status,u.created_at,u.last_seen,u.language,p.city,p.country,p.moderation,u.premium_until,u.superlikes,u.boosts,u.prematches,u.referrer_id,
 (SELECT count(*) FROM users r WHERE r.referrer_id=u.id) AS referrals,
 (SELECT coalesce(sum(total),0) FROM orders o WHERE o.user_id=u.id AND o.status='paid') AS paid_stars
 FROM users u LEFT JOIN profiles p ON p.user_id=u.id`;

async function* users(db,userId){
 if(userId){const row=await one(db,userSQL+' WHERE u.id=$1',[userId]);if(row)yield row;return;}
 let cursor='0';
 while(true){
  const rows=(await db.query(userSQL+' WHERE u.id>$1 ORDER BY u.id LIMIT 100',[cursor])).rows;
  for(const row of rows)yield row;
  if(rows.length<100)return;
  cursor=String(rows.at(-1).id);
 }
}

export async function* usersCSV(db,userId){
 yield '\ufeff'+columns.join(',')+'\r\n';
 for await(const row of users(db,userId))yield columns.map(c=>safeCSV(row[c])).join(',')+'\r\n';
}

export async function userDetail(db,userId){
 const user=await one(db,'SELECT * FROM users WHERE id=$1',[userId]);
 if(!user)fail(404,'USER_NOT_FOUND');
 const profile=await one(db,'SELECT * FROM profiles WHERE user_id=$1',[userId]);
 const photos=(await db.query('SELECT id,position,created_at FROM photos WHERE user_id=$1 ORDER BY position,created_at',[userId])).rows;
 const chats=(await db.query(`SELECT m.id,m.a,m.b,m.active,m.created_at,
  CASE WHEN m.a=$1 THEN m.b ELSE m.a END AS other_id,
  p.name AS other_name,(SELECT count(*) FROM messages msg WHERE msg.match_id=m.id) AS message_count
  FROM matches m LEFT JOIN profiles p ON p.user_id=CASE WHEN m.a=$1 THEN m.b ELSE m.a END
  WHERE m.a=$1 OR m.b=$1 ORDER BY m.created_at DESC`,[userId])).rows;
 return {user,profile:profile||null,photos,chats};
}

async function* transcript(db,matchId){
 let cursorTime='1970-01-01T00:00:00Z',cursorId='00000000-0000-0000-0000-000000000000';
 while(true){
  // Return a PostgreSQL timestamp string: JS Date would discard microseconds.
  const rows=(await db.query(`SELECT id,sender,body,kind,sticker_id,original_body,reply_to,edited_at,deleted_at,delivered_at,
   (SELECT row_to_json(mm) FROM message_media mm WHERE mm.message_id=messages.id) AS media,created_at::text AS created_at,read_at::text AS read_at,
   (SELECT json_agg(e ORDER BY e.id) FROM message_edits e WHERE e.message_id=messages.id) AS edit_history
   FROM messages WHERE match_id=$1 AND (created_at,id)>($2::timestamptz,$3::uuid)
   ORDER BY created_at,id LIMIT 500`,[matchId,cursorTime,cursorId])).rows;
  for(const row of rows)yield JSON.stringify(row)+'\n';
  if(rows.length<500)return;
  cursorTime=rows.at(-1).created_at;cursorId=rows.at(-1).id;
 }
}

// Entries are awaited one at a time; photos and transcripts are never accumulated
// for the whole database in the memory of the small test server.
export async function streamArchive({db,storage,actor,userId=null,res}){
 if(userId&&!await one(db,'SELECT 1 FROM users WHERE id=$1',[userId]))fail(404,'USER_NOT_FOUND');
 await audit(db,actor,'admin.export.started',userId||'all',{format:'zip'});
 const zip=archiver('zip',{zlib:{level:3}});
 let streamError;
 zip.on('warning',error=>zip.destroy(error));
 res.set('Content-Disposition',`attachment; filename="veyra-${userId?'user-'+userId:'archive'}.zip"`).type('application/zip');
 const piped=pipeline(zip,res).catch(error=>{streamError=error;});
 const append=async(source,name)=>{
  if(streamError||res.destroyed)throw Error('EXPORT_INTERRUPTED');
  const done=once(zip,'entry');
  zip.append(source,{name});
  await done;
 };
 try{
  await append(JSON.stringify({brand:'VEYRA',version:1,exported_at:new Date().toISOString(),scope:userId||'all',
   layout:'users.csv; users/{telegram_id}/profile.json, photos/*.webp, chats/index.json and chats/{match_id}.jsonl. Each chat is attached to both participants. Session tokens and service secrets are never exported.'},null,2),'manifest.json');
  await append(Readable.from(usersCSV(db,userId)),'users.csv');
  let count=0;
  for await(const row of users(db,userId)){
   const detail=await userDetail(db,row.id),root='users/'+row.id+'/';
   await append(JSON.stringify({user:detail.user,profile:detail.profile},null,2),root+'profile.json');
   const photos=(await db.query('SELECT id,object_key FROM photos WHERE user_id=$1 ORDER BY position,created_at',[row.id])).rows;
   for(const photo of photos)await append(await storage.get(photo.object_key),root+'photos/'+photo.id+'.webp');
   await append(JSON.stringify(detail.chats,null,2),root+'chats/index.json');
   for(const chat of detail.chats){await append(Readable.from(transcript(db,chat.id)),root+'chats/'+chat.id+'.jsonl');let mediaCursor='00000000-0000-0000-0000-000000000000';while(true){const media=(await db.query('SELECT mm.* FROM message_media mm JOIN messages m ON m.id=mm.message_id WHERE m.match_id=$1 AND mm.message_id>$2::uuid ORDER BY mm.message_id LIMIT 50',[chat.id,mediaCursor])).rows;for(const file of media)await append(await storage.get(file.object_key),root+'chats/'+chat.id+'/'+file.message_id+(file.mime==='audio/mp4'?'.m4a':'.webp'));if(media.length<50)break;mediaCursor=media.at(-1).message_id;}}
   count++;
  }
  await zip.finalize();await piped;
  if(streamError)throw streamError;
  await audit(db,actor,'admin.export.completed',userId||'all',{format:'zip',users:count,bytes:zip.pointer()});
 }catch(error){
  zip.destroy(error);await piped;
  await audit(db,actor,'admin.export.failed',userId||'all',{format:'zip'});
  throw error;
 }
}
