import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testDB,user} from './helpers.js';
import {one} from '../server/db.js';
import {stage0Snapshot,verifyStage0Backup,requireVerifiedStage0Backup,BACKUP_BUCKET,BACKUP_PREFIX} from '../server/stage0-snapshot.js';
import {RESET_ID,RESET_TARGET} from '../server/launch-reset.js';

test('private Stage 0 snapshot stores and restores exact rows and all original media without deleting production',async()=>{
 const db=await testDB();
 const originalFetch=globalThis.fetch;
 const stored=new Map(),buckets=new Map([['veyra-media',{id:'veyra-media',public:false}]]);
 const env={
  APP_URL:RESET_TARGET,RENDER_EXTERNAL_URL:RESET_TARGET,RENDER_GIT_COMMIT:'a'.repeat(40),
  OWNER_TELEGRAM_ID:'1',SUPABASE_URL:'https://supabase.test',SUPABASE_SECRET_KEY:'sb_secret_local_only'
 };
 const response=(buffer,status=200,headers={})=>new Response(buffer,{status,headers});
 globalThis.fetch=async(url,opts={})=>{
  const path=new URL(url).pathname.replace(/^\/storage\/v1/,'');
  const parts=path.split('/').slice(1).map(decodeURIComponent);
  if(parts[0]==='bucket'){
   if(parts.length===2)return buckets.has(parts[1])?Response.json(buckets.get(parts[1])):response('missing',404);
   if(opts.method==='POST'){const body=JSON.parse(opts.body);if(buckets.has(body.id))return response('exists',409);buckets.set(body.id,body);return Response.json({id:body.id})}
  }
  if(parts[0]==='object'&&parts[1]==='authenticated'){
   const key=parts.slice(2).join('/');
   return stored.has(key)?response(stored.get(key)):Response.json({code:'NoSuchKey',message:'The resource was not found'},{status:400});
  }
  if(parts[0]==='object'&&opts.method==='POST'){
   const key=parts.slice(1).join('/');
   if(stored.has(key))return response('exists',409);
   stored.set(key,Buffer.from(opts.body));
   return Response.json({Key:key});
  }
  if(parts[0]==='object'&&opts.method==='DELETE')return Response.json({});
  return response('unhandled',500);
 };
 try{
  await db.query('CREATE SCHEMA storage');
  await db.query('CREATE TABLE storage.objects (bucket_id text,name text,metadata jsonb)');
  await user(db,1);await user(db,2);
  const keys=(await db.query('SELECT object_key FROM photos ORDER BY object_key')).rows.map(x=>x.object_key);
  for(const [i,key] of keys.entries()){
   const buf=Buffer.from('unmodified-original-photo-'+i);
   stored.set('veyra-media/'+key,buf);
   await db.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3::jsonb)',['veyra-media',key,JSON.stringify({size:buf.length,mimetype:'image/webp'})]);
  }
  const before=(await one(db,'SELECT count(*)::int n FROM profiles')).n;
  const snapshot=await stage0Snapshot(db,env);
  assert.equal(snapshot.status,'completed');
  assert.equal(snapshot.media_files,6);
  assert.equal(snapshot.id,RESET_ID);
  assert.equal((await one(db,'SELECT count(*)::int n FROM profiles')).n,before);
  assert.equal((await one(db,'SELECT count(*)::int n FROM photos')).n,6);
  const r=await requireVerifiedStage0Backup(db,env);
  assert.equal(r.manifest.media.files.length,6);
  assert.ok(stored.has(BACKUP_BUCKET+'/'+BACKUP_PREFIX+'manifest.json'));
  assert.ok(stored.has(BACKUP_BUCKET+'/'+BACKUP_PREFIX+'validated.json'));
  assert.ok(stored.has(BACKUP_BUCKET+'/'+BACKUP_PREFIX+'database.json.gz'));
  assert.equal((await one(db,"SELECT count(*)::int n FROM audit_log WHERE action='stage0.snapshot.verified'")).n,1);
  await assert.rejects(()=>stage0Snapshot(db,env),/STAGE0_SNAPSHOT_ALREADY_EXISTS/);
  const mediaPath=r.manifest.media.files[0].backup_key;
  stored.set(BACKUP_BUCKET+'/'+mediaPath,Buffer.from('corrupt'));
  await assert.rejects(()=>verifyStage0Backup(db,env),/STAGE0_FILE_BACKUP_INVALID/);
  globalThis.fetch=async()=>Response.json({code:'InvalidJWT',message:'invalid authentication'},{status:400});
  await assert.rejects(()=>verifyStage0Backup(db,env),/BACKUP_STORAGE_READ_FAILED_400/);
 }finally{globalThis.fetch=originalFetch;await db.close()}
});
