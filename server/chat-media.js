import multer from 'multer';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';





import {one} from './db.js';
import {fail} from './core.js';
import {z,parse,uuid} from './validation.js';
import {notify,audit} from './domain.js';

const MAX_FILE=12*1024*1024;
const receive=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_FILE,files:1,fields:5,fieldSize:10000}}).single('file');

export async function prepareMedia(buffer,kind){
 if(!buffer?.length||buffer.length>MAX_FILE)fail(413,'MEDIA_TOO_LARGE');
 if(kind==='image'){
  try{const metadata=await sharp(buffer,{limitInputPixels:40000000}).metadata();if(!['jpeg','png','webp','heif'].includes(metadata.format)||(metadata.pages||1)>1)fail(415,'IMAGE_TYPE');
   const {data,info}=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize(2048,2048,{fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer({resolveWithObject:true});
   if(data.length>MAX_FILE)fail(413,'MEDIA_TOO_LARGE');return {data,mime:'image/webp',extension:'webp',width:info.width,height:info.height};
  }catch(e){if(e.status)throw e;fail(415,'IMAGE_TYPE');}
 }
 fail(415,'IMAGE_TYPE');
}
export function chatMediaRoutes(app,{db,storage,rate,env,access,serialize,record,fields}){
 const known=async(q,mid,uid,client)=>{const old=await one(q,'SELECT id,match_id FROM messages WHERE sender=$1 AND client_id=$2',[uid,client]);if(!old)return null;if(old.match_id!==mid)fail(409,'CLIENT_ID_CONFLICT');return (await serialize(q,[(await one(q,`SELECT ${fields} FROM messages m WHERE m.id=$1`,[old.id,uid]))],uid))[0];};
 app.post('/api/matches/:id/media',async(req,res,next)=>{const mid=parse(uuid,req.params.id);await rate('chat-media:'+req.user.id,30,3600);await db.tx(q=>access(q,mid,req.user.id,true));next();},receive,async(req,res)=>{
  const mid=parse(uuid,req.params.id),uid=req.user.id,b=parse(z.object({kind:z.literal('image'),client_id:uuid,body:z.string().trim().max(2000).default(''),reply_to:uuid.optional()}),req.body);
  const existing=await db.tx(async q=>{await access(q,mid,uid,true);return known(q,mid,uid,b.client_id);});if(existing)return res.json(existing);
  if(!req.file)fail(400,'MEDIA_REQUIRED');const clean=await prepareMedia(req.file.buffer,b.kind);const key='chat/'+mid+'/'+randomUUID()+'.'+clean.extension;
  await db.query("INSERT INTO storage_gc(object_key,available_at) VALUES($1,now()+interval '24 hours')",[key]);
  try{await storage.putMedia(key,clean.data,clean.mime);
   const row=await db.tx(async q=>{const m=await access(q,mid,uid,true);const existing=await known(q,mid,uid,b.client_id);if(existing){await q.query('UPDATE storage_gc SET available_at=now() WHERE object_key=$1',[key]);return existing;}
    if(b.reply_to)await record(q,mid,b.reply_to,uid);const id=randomUUID();
    await q.query('INSERT INTO messages(id,match_id,sender,body,original_body,client_id,reply_to,kind) VALUES($1,$2,$3,$4,$4,$5,$6,$7)',[id,mid,uid,b.kind==='image'?b.body:'',b.client_id,b.reply_to||null,b.kind]);
    await q.query('INSERT INTO message_media(message_id,object_key,mime,size_bytes,width,height,duration,waveform) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,key,clean.mime,clean.data.length,clean.width||null,clean.height||null,clean.duration||null,clean.waveform?JSON.stringify(clean.waveform):null]);
    await q.query('DELETE FROM storage_gc WHERE object_key=$1',[key]);await notify(q,m.other,'💬 Новое фото в VEYRA.');
    return (await serialize(q,[await record(q,mid,id,uid)],uid))[0];});res.json(row);
  }catch(e){await db.query('UPDATE storage_gc SET available_at=now() WHERE object_key=$1',[key]).catch(()=>{});throw e;}
 });
 app.get('/api/matches/:id/messages/:message/media',async(req,res)=>{
  const mid=parse(uuid,req.params.id),id=parse(uuid,req.params.message),uid=req.user.id;
  const owner=req.user.scope==='admin'&&String(uid)===String(env.OWNER_TELEGRAM_ID);
  const media=await db.tx(async q=>{if(!owner){const m=await access(q,mid,uid);if(m.unavailable)fail(403,'CHAT_UNAVAILABLE');await record(q,mid,id,uid);}const file=await one(q,'SELECT mm.* FROM message_media mm JOIN messages m ON m.id=mm.message_id WHERE mm.message_id=$1 AND m.match_id=$2',[id,mid]);if(!file)fail(404,'MEDIA_NOT_FOUND');if(owner)await audit(q,uid,'admin.chat.media',id);return file;});
  const buffer=await storage.get(media.object_key);res.set({'Content-Type':media.mime,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline'});
  const range=req.get('range');if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start,end;if(match&&match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),buffer.length-1):buffer.length-1;}else if(match&&match[2]){start=Math.max(0,buffer.length-Number(match[2]));end=buffer.length-1;}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=buffer.length||end<start){res.set('Content-Range','bytes */'+buffer.length);return res.sendStatus(416);}res.status(206).set('Content-Range',`bytes ${start}-${end}/${buffer.length}`).send(buffer.subarray(start,end+1));}else res.send(buffer);
 });
}
