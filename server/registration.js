import {randomUUID} from 'node:crypto';
import {one} from './db.js';
import {fail,validBirth} from './core.js';
import {z,parse,profileFields,uuid} from './validation.js';

export async function saveProfile(q,userId,p,consent=false){
 p={...p,lat:Math.round(p.lat*100)/100,lon:Math.round(p.lon*100)/100};
 const fields=Object.keys(profileFields.shape);
 await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
 await q.query(`INSERT INTO profiles(user_id,${fields.join(',')},accepted_terms_at)
 VALUES($1,${fields.map((_,i)=>'$'+(i+2)).join(',')},${consent?'now()':'NULL'})
 ON CONFLICT(user_id) DO UPDATE SET ${fields.map(f=>`${f}=EXCLUDED.${f}`).join(',')},
 moderation='draft',moderation_reason=NULL,revision=profiles.revision+1,updated_at=now()`,[userId,...fields.map(f=>f==='prompts'?JSON.stringify(p[f]):p[f])]);
 await q.query('UPDATE profiles SET location_updated_at=now(),location_consent_at=coalesce(location_consent_at,now()) WHERE user_id=$1',[userId]);
}

const draftData=profileFields.partial().extend({name:z.string().max(50).regex(/^[\p{L}\p{M} ]*$/u),birth_date:z.string().max(10),gender:z.enum(['','man','woman']),looking_for:z.array(z.enum(['man','woman'])).max(2),city:z.string().max(100),country:z.string().max(100),lat:z.number().min(-90).max(90).nullable(),lon:z.number().min(-180).max(180).nullable(),registration_ui_version:z.literal(2).optional(),consent_to_terms:z.boolean().optional()});
export function registrationRoutes(app,{db,storage,upload,rate}){
 app.put('/api/registration',async(req,res)=>{
  const {step,data}=parse(z.object({step:z.number().int().min(1).max(7),data:draftData}),req.body);
  if(data.registration_ui_version===2){
   if(step>1&&(!data.name?.trim()||!data.consent_to_terms))fail(400,'CONSENT_REQUIRED');
   if(step>2&&(!validBirth(data.birth_date)||!data.gender))fail(400,'AGE_18_REQUIRED');
   if(step>3&&(!data.city?.trim()||!data.country?.trim()||data.lat==null||data.lon==null))fail(400,'LOCATION_REQUIRED');
   if(step>4&&(!data.looking_for?.length||data.max_age<data.min_age))fail(400,'SEARCH_PREFERENCES_REQUIRED');
   if(step>6)parse(profileFields,data);
  }else{
   if(step>1&&(!data.name.trim()||!validBirth(data.birth_date)||!data.gender))fail(400,'AGE_18_REQUIRED');
   if(step>2&&(!data.city.trim()||!data.country.trim()||data.lat===null||data.lon===null))fail(400,'LOCATION_REQUIRED');
   if(step>4)parse(profileFields,data);
  }
  await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const p=await one(q,'SELECT moderation FROM profiles WHERE user_id=$1',[req.user.id]);
   if(p&&['approved','pending'].includes(p.moderation))fail(409,'ALREADY_SUBMITTED');
   await q.query('INSERT INTO registration_drafts(user_id,step,data) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET step=$2,data=$3,updated_at=now()',[req.user.id,step,JSON.stringify(data)]);
  });res.json({ok:true});
 });
 app.put('/api/registration/profile',async(req,res)=>{
  const p=parse(profileFields.refine(p=>p.max_age>=p.min_age),req.body);
  const finalStep=req.body?.registration_ui_version===2?7:6;
  await db.tx(async q=>{await saveProfile(q,req.user.id,p);await q.query(`INSERT INTO registration_drafts(user_id,step,data) VALUES($1,${finalStep},$2) ON CONFLICT(user_id) DO UPDATE SET step=${finalStep},data=$2,updated_at=now()`,[req.user.id,JSON.stringify(p)]);});res.json({ok:true});
 });
 app.put('/api/photos/order',async(req,res)=>{
  const {ids}=parse(z.object({ids:z.array(uuid).min(1).max(7)}),req.body);
  await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const owned=(await q.query('SELECT id FROM photos WHERE user_id=$1',[req.user.id])).rows.map(p=>p.id);
   if(ids.length!==owned.length||new Set(ids).size!==owned.length||ids.some(id=>!owned.includes(id)))fail(409,'PHOTO_ORDER_CHANGED');
   for(const [position,id] of ids.entries())await q.query('UPDATE photos SET position=$2 WHERE id=$1 AND user_id=$3',[id,position,req.user.id]);
   await q.query("UPDATE profiles SET moderation='draft',revision=revision+1 WHERE user_id=$1",[req.user.id]);
  });res.json({ok:true});
 });
 app.put('/api/photos/:id',upload.single('photo'),async(req,res)=>{
  const oldId=parse(uuid,req.params.id);
  if(!req.file)fail(400,'PHOTO_REQUIRED');
  if(!['image/jpeg','image/png','image/webp'].includes(req.file.mimetype))fail(400,'IMAGE_TYPE');
  await rate('upload:'+req.user.id,30,3600);
  const id=randomUUID(),key=req.user.id+'/'+id+'.webp';let uploaded=false;
  try{await db.tx(async q=>{
   await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const old=await one(q,'SELECT * FROM photos WHERE id=$1 AND user_id=$2',[oldId,req.user.id]);
   if(!old)fail(404,'PHOTO_NOT_FOUND');
   await storage.put(key,req.file.buffer);uploaded=true;
   await q.query('UPDATE photos SET id=$3,object_key=$4 WHERE id=$1 AND user_id=$2',[oldId,req.user.id,id,key]);
   await q.query('INSERT INTO storage_gc(object_key) VALUES($1) ON CONFLICT DO NOTHING',[old.object_key]);
   await q.query("UPDATE profiles SET moderation='draft',revision=revision+1 WHERE user_id=$1",[req.user.id]);
  });}catch(e){if(uploaded)await db.query('INSERT INTO storage_gc(object_key) VALUES($1) ON CONFLICT DO NOTHING',[key]);throw e;}
  res.json({id});
 });
 // Gifts are deliberately unavailable, including direct API attempts.
 app.get('/api/gifts',(req,res)=>res.json({enabled:false,status:'coming_soon',gifts:[]}));
 app.post('/api/gifts',(req,res)=>fail(409,'GIFTS_COMING_SOON'));
}
