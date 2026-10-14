import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {one} from './db.js';
import {audit} from './domain.js';
import {datingTables,RESET_ID,RESET_TARGET} from './launch-reset.js';

export const BACKUP_BUCKET='veyra-stage0-backups';
export const BACKUP_PREFIX='stage0-backups/'+RESET_ID+'/';
export const FINANCIAL_TABLES=Object.freeze([
 'orders','gifts','veys_wallets','veys_ledger','veys_purchases','products',
 'promos','promo_redemptions','feature_flags','webhook_updates','content_items',
 'tickets','support_messages','boost_runs'
]);
const OWNER_RIGHTS="SELECT to_jsonb(u)::text AS row FROM (SELECT id,referral_code,referrer_id,referral_rewarded,premium_until,boost_until,weekly_boost_at,superlikes,prematches,boosts FROM users ORDER BY id) u ORDER BY 1";
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rowBytes=rows=>Buffer.from(rows.map(x=>x.row).join('\n')+(rows.length?'\n':''));
const DIGEST_LIMIT=40*1024*1024;
const safeTable=name=>{if(![...datingTables,...FINANCIAL_TABLES].includes(name))throw Error('UNLISTED_TABLE');return '"'+name+'"';};
const digestRows=rows=>({rows:rows.length,sha256:sha(rowBytes(rows))});
const uniqueFiles=files=>{const x=new Set();for(const f of files){if(x.has(f.name))throw Error('STORAGE_DUPLICATE');x.add(f.name)}return x};

export async function currentDigests(q,items){
 const o={};
 for(const name of items){const rows=(await q.query('SELECT to_jsonb(t)::text AS row FROM '+safeTable(name)+' t ORDER BY 1')).rows;o[name]=digestRows(rows);}
 return o;
}
export async function financialCheckpoint(q){
 const tables=await currentDigests(q,FINANCIAL_TABLES);
 const rights=digestRows((await q.query(OWNER_RIGHTS)).rows);
 const max=(await one(q,'SELECT coalesce(max(id),0)::text AS id FROM audit_log')).id;
 const auditOld=digestRows((await q.query('SELECT to_jsonb(a)::text AS row FROM audit_log a WHERE a.id<=$1 ORDER BY 1',[max])).rows);
 return {tables,rights,audit_prefix:{max_id:max,...auditOld}};
}
export async function assertFinancialCheckpoint(q,before){
 const now=await financialCheckpoint(q);
 for(const name of FINANCIAL_TABLES)if(JSON.stringify(now.tables[name])!==JSON.stringify(before.tables[name]))throw Error('FINANCIAL_DRIFT_'+name);
 if(JSON.stringify(now.rights)!==JSON.stringify(before.rights))throw Error('ENTITLEMENT_DRIFT');
 const old=digestRows((await q.query('SELECT to_jsonb(a)::text AS row FROM audit_log a WHERE a.id<=$1 ORDER BY 1',[before.audit_prefix.max_id])).rows);
 if(JSON.stringify(old)!==JSON.stringify({rows:before.audit_prefix.rows,sha256:before.audit_prefix.sha256}))throw Error('AUDIT_HISTORY_CHANGED');
}

function remoteStore(env){
 const base=env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1';
 const key=env.SUPABASE_SECRET_KEY;
 const headers={apikey:key};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const path=s=>s.split('/').map(encodeURIComponent).join('/');
 const req=async(url,options={})=>fetch(base+url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});
 const get=async(bucket,name)=>{const r=await req('/object/authenticated/'+path(bucket)+'/'+path(name));if(r.status===404)return null;if(!r.ok)throw Error('BACKUP_STORAGE_READ_FAILED_'+r.status);return Buffer.from(await r.arrayBuffer())};
 const put=async(bucket,name,data,mime)=>{
  const existing=await get(bucket,name);
  if(existing){if(sha(existing)!==sha(data))throw Error('BACKUP_IMMUTABILITY_VIOLATION');return}
  const r=await req('/object/'+path(bucket)+'/'+path(name),{method:'POST',headers:{'content-type':mime},body:data});
  if(!r.ok)throw Error('BACKUP_STORAGE_WRITE_FAILED_'+r.status);
  const again=await get(bucket,name);if(!again||sha(again)!==sha(data))throw Error('BACKUP_STORAGE_VERIFY_FAILED');
 };
 const del=async(bucket,names)=>{const r=await req('/object/'+path(bucket),{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:names})});if(!r.ok)throw Error('BACKUP_VALIDATION_CLEANUP_FAILED')};
 const ensure=async()=>{
  const r=await req('/bucket/'+BACKUP_BUCKET);
  if(r.ok){const info=await r.json();if(info.public!==false)throw Error('BACKUP_BUCKET_MUST_BE_PRIVATE');return;}
  if(r.status!==404&&r.status!==400)throw Error('BACKUP_BUCKET_READ_FAILED');
  const c=await req('/bucket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:BACKUP_BUCKET,name:BACKUP_BUCKET,public:false,file_size_limit:52428800})});
  if(!c.ok&&c.status!==409)throw Error('BACKUP_BUCKET_CREATE_FAILED');
  const verify=await req('/bucket/'+BACKUP_BUCKET);
  if(!verify.ok||(await verify.json()).public!==false)throw Error('BACKUP_BUCKET_UNVERIFIED');
 };
 return {get,put,del,ensure};
}
function validateTarget(env){
 if(env.APP_URL!==RESET_TARGET||env.RENDER_EXTERNAL_URL!==RESET_TARGET)throw Error('STAGE0_NOT_PRODUCTION_URL');
 if(!/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT||''))throw Error('STAGE0_UNKNOWN_RENDER_SHA');
 if(!env.OWNER_TELEGRAM_ID)throw Error('STAGE0_OWNER_MISSING');
}
async function readLogicalSnapshot(db,env){
 return db.tx(async q=>{
  await q.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const known=new Set((await q.query("SELECT table_name FROM information_schema.tables WHERE table_schema='veyra' AND table_type='BASE TABLE'")).rows.map(x=>x.table_name));
  for(const name of datingTables)if(!known.has(name))throw Error('STAGE0_SCHEMA_MISMATCH_'+name);
  const schema={};
  const data={};
  const digests={};
  let total=0;
  for(const name of datingTables){
   const columns=(await q.query("SELECT column_name,udt_name,data_type,is_nullable,ordinal_position FROM information_schema.columns WHERE table_schema='veyra' AND table_name=$1 ORDER BY ordinal_position",[name])).rows;
   if(!columns.length)throw Error('STAGE0_MISSING_COLUMNS_'+name);
   schema[name]=columns;
   const rows=(await q.query('SELECT to_jsonb(t)::text AS row FROM '+safeTable(name)+' t ORDER BY 1')).rows;
   data[name]=rows.map(r=>r.row);
   digests[name]=digestRows(rows);total+=rows.length;
  }
  const storage=(await q.query("SELECT name,coalesce(metadata->>'mimetype','application/octet-stream') AS mime,coalesce((metadata->>'size')::bigint,0)::text AS reported_size FROM storage.objects WHERE bucket_id='veyra-media' ORDER BY name")).rows;
  const photoKeys=new Set((await q.query('SELECT object_key AS name FROM photos UNION SELECT object_key FROM message_media')).rows.map(x=>x.name));
  const found=uniqueFiles(storage);
  if(storage.length<photoKeys.size||[...photoKeys].some(x=>!found.has(x)))throw Error('STAGE0_MISSING_ORIGINAL_STORAGE_OBJECTS');
  if(!storage.length)throw Error('STAGE0_NO_STORAGE_OBJECTS');
  const finance=await financialCheckpoint(q);
  return {archive:{format:'veyra-stage0-logical-json-v1',snapshot_id:RESET_ID,code_sha:env.RENDER_GIT_COMMIT,created_at:new Date().toISOString(),schema,data,digests,rows:total},storage,finance};
 });
}
async function validationRestore(db,archive){
 return db.tx(async q=>{
  const restored={};
  for(const name of datingTables){
   if(!archive.schema[name]||!Array.isArray(archive.data[name]))throw Error('BACKUP_TABLE_SCHEMA_MISMATCH');
   const temporary='"stage0_validation_'+name+'"';
   await q.query('CREATE TEMP TABLE '+temporary+' AS SELECT * FROM '+safeTable(name)+' WHERE false');
   const raw='['+archive.data[name].join(',')+']';
   await q.query('INSERT INTO '+temporary+' SELECT * FROM jsonb_populate_recordset(NULL::'+safeTable(name)+',$1::jsonb)',[raw]);
   const rows=(await q.query('SELECT to_jsonb(t)::text AS row FROM '+temporary+' t ORDER BY 1')).rows;
   restored[name]=digestRows(rows);
   if(JSON.stringify(restored[name])!==JSON.stringify(archive.digests[name]))throw Error('BACKUP_TABLE_RESTORE_MISMATCH_'+name);
  }
  return restored;
 });
}
export async function stage0Snapshot(db,env){
 validateTarget(env);
 const store=remoteStore(env);await store.ensure();
 if(await store.get(BACKUP_BUCKET,BACKUP_PREFIX+'validated.json'))throw Error('STAGE0_SNAPSHOT_ALREADY_EXISTS');
 const {archive,storage,finance}=await readLogicalSnapshot(db,env);
 const compressed=gzipSync(Buffer.from(JSON.stringify(archive)),{level:9});
 if(!compressed.length||compressed.length>DIGEST_LIMIT)throw Error('STAGE0_BACKUP_TOO_LARGE');
 const archivePath=BACKUP_PREFIX+'database.json.gz';
 await store.put(BACKUP_BUCKET,archivePath,compressed,'application/octet-stream');
 const files=[];let totalBytes=0;
 for(const f of storage){
  const buf=await store.get('veyra-media',f.name);
  if(!buf||!buf.length)throw Error('STAGE0_ORIGINAL_FILE_MISSING');
  const expected=Number(f.reported_size);
  if(expected>0&&buf.length!==expected)throw Error('STAGE0_STORAGE_METADATA_SIZE_MISMATCH');
  const name=BACKUP_PREFIX+'media/'+f.name;
  await store.put(BACKUP_BUCKET,name,buf,f.mime);
  files.push({original_bucket:'veyra-media',original_key:f.name,backup_key:name,mime:f.mime,bytes:buf.length,sha256:sha(buf)});
  totalBytes+=buf.length;
 }
 const restore=await readFile(new URL('../scripts/stage0-restore.js',import.meta.url));
 await store.put(BACKUP_BUCKET,BACKUP_PREFIX+'restore.js',restore,'application/javascript');
 const manifest={
  format:'veyra-stage0-manifest-v1',id:RESET_ID,code_sha:env.RENDER_GIT_COMMIT,
  created_at:archive.created_at,
  database:{key:archivePath,bytes:compressed.length,sha256:sha(compressed),tables:datingTables.length,rows:archive.rows,digests:archive.digests},
  media:{bucket:BACKUP_BUCKET,files,total_bytes:totalBytes},
  financial_checkpoint:finance,
  restore:{key:BACKUP_PREFIX+'restore.js',sha256:sha(restore)}
 };
 const manifestBytes=Buffer.from(JSON.stringify(manifest));
 const manifestHash=sha(manifestBytes);
 await store.put(BACKUP_BUCKET,BACKUP_PREFIX+'manifest.json',manifestBytes,'application/json');
 await store.put(BACKUP_BUCKET,BACKUP_PREFIX+'manifest.sha256',Buffer.from(manifestHash+'  manifest.json\n'),'text/plain');
 await verifyStage0Backup(db,env,{validateRestore:true});
 const validation={format:'veyra-stage0-validation-v1',id:RESET_ID,sha256:manifestHash,validated_at:new Date().toISOString(),restored_tables:datingTables.length,restored_files:files.length};
 await store.put(BACKUP_BUCKET,BACKUP_PREFIX+'validated.json',Buffer.from(JSON.stringify(validation)),'application/json');
 await audit(db,env.OWNER_TELEGRAM_ID,'stage0.snapshot.verified',RESET_ID,{manifest_sha256:manifestHash,tables:datingTables.length,rows:archive.rows,files:files.length,bytes:totalBytes});
 return {status:'completed',id:RESET_ID,manifest_sha256:manifestHash,database_bytes:compressed.length,table_count:datingTables.length,row_count:archive.rows,media_files:files.length,media_bytes:totalBytes};
}
export async function verifyStage0Backup(db,env,{validateRestore=false}={}){
 validateTarget(env);
 const store=remoteStore(env);await store.ensure();
 const manifestBytes=await store.get(BACKUP_BUCKET,BACKUP_PREFIX+'manifest.json');
 const checkBytes=await store.get(BACKUP_BUCKET,BACKUP_PREFIX+'manifest.sha256');
 if(!manifestBytes||!checkBytes||checkBytes.toString('utf8').split(' ')[0]!==sha(manifestBytes))throw Error('STAGE0_MANIFEST_CHECKSUM_INVALID');
 const manifest=JSON.parse(manifestBytes.toString('utf8'));
 if(manifest.id!==RESET_ID||manifest.code_sha!==env.RENDER_GIT_COMMIT||manifest.format!=='veyra-stage0-manifest-v1')throw Error('STAGE0_MANIFEST_IDENTITY_INVALID');
 const archiveBytes=await store.get(BACKUP_BUCKET,manifest.database.key);
 if(!archiveBytes||archiveBytes.length!==manifest.database.bytes||sha(archiveBytes)!==manifest.database.sha256)throw Error('STAGE0_DATABASE_BACKUP_INVALID');
 const archive=JSON.parse(gunzipSync(archiveBytes).toString('utf8'));
 if(archive.snapshot_id!==RESET_ID||JSON.stringify(Object.keys(archive.data))!==JSON.stringify(datingTables))throw Error('STAGE0_DATABASE_TABLE_LIST_INVALID');
 for(const table of datingTables){
  const rows=archive.data[table].map(row=>({row}));
  if(JSON.stringify(digestRows(rows))!==JSON.stringify(manifest.database.digests[table]))throw Error('STAGE0_DATABASE_TABLE_HASH_MISMATCH');
 }
 const restore=await store.get(BACKUP_BUCKET,manifest.restore.key);
 if(!restore||sha(restore)!==manifest.restore.sha256)throw Error('STAGE0_RESTORE_SCRIPT_INVALID');
 let bytes=0;
 for(const f of manifest.media.files){
  if(f.original_bucket!=='veyra-media'||!f.backup_key.startsWith(BACKUP_PREFIX+'media/'))throw Error('STAGE0_BACKUP_KEY_INVALID');
  const saved=await store.get(BACKUP_BUCKET,f.backup_key);
  if(!saved||saved.length!==f.bytes||sha(saved)!==f.sha256)throw Error('STAGE0_FILE_BACKUP_INVALID');
  bytes+=saved.length;
  if(validateRestore){
   const original=await store.get(f.original_bucket,f.original_key);
   if(!original||sha(original)!==f.sha256||original.length!==f.bytes)throw Error('STAGE0_SOURCE_FILE_DRIFT');
   const validationKey=BACKUP_PREFIX+'validation/'+f.original_key;
   await store.put(BACKUP_BUCKET,validationKey,saved,f.mime);
   const restored=await store.get(BACKUP_BUCKET,validationKey);
   if(!restored||sha(restored)!==f.sha256)throw Error('STAGE0_FILE_RESTORE_MISMATCH');
  }
 }
 if(bytes!==manifest.media.total_bytes)throw Error('STAGE0_BACKUP_TOTAL_BYTES_MISMATCH');
 if(validateRestore)await validationRestore(db,archive);
 return {manifest,archive,manifest_sha256:sha(manifestBytes)};
}
export async function requireVerifiedStage0Backup(db,env){
 const store=remoteStore(env);
 const marker=await store.get(BACKUP_BUCKET,BACKUP_PREFIX+'validated.json');
 if(!marker)throw Error('STAGE0_VALIDATION_MARKER_MISSING');
 const {manifest,archive,manifest_sha256}=await verifyStage0Backup(db,env,{validateRestore:true});
 const record=JSON.parse(marker.toString('utf8'));
 if(record.id!==RESET_ID||record.sha256!==manifest_sha256||record.restored_files!==manifest.media.files.length)throw Error('STAGE0_VALIDATION_MARKER_MISMATCH');
 const auditRecord=await one(db,"SELECT 1 FROM audit_log WHERE action='stage0.snapshot.verified' AND subject=$1 AND metadata->>'manifest_sha256'=$2",[RESET_ID,manifest_sha256]);
 if(!auditRecord)throw Error('STAGE0_SNAPSHOT_AUDIT_MISSING');
 return {manifest,archive,manifest_sha256};
}
