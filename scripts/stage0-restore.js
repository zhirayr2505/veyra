// MANUAL DISASTER RECOVERY ONLY. NEVER INVOKED BY WEB STARTUP OR CI.
// Restore exact JSON values and original identifiers to a separate schema.
// Requires deliberate operator action and a non-production database URL.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const ID='registration-clean-2026-10-14-v1';
const BUCKET='veyra-stage0-backups';
const PREFIX='stage0-backups/'+ID+'/';
const sha=x=>createHash('sha256').update(x).digest('hex');
const required=['SUPABASE_URL','SUPABASE_SECRET_KEY','RESTORE_DATABASE_URL','STAGE0_RESTORE_CONFIRM'];
for(const name of required)if(!process.env[name])throw Error('Missing restore prerequisite: '+name);
if(process.env.STAGE0_RESTORE_CONFIRM!=='ISOLATED-RESTORE-'+ID)throw Error('Explicit isolated restore confirmation required');
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===process.env.RESTORE_DATABASE_URL)throw Error('Production database URL forbidden');
if(process.env.APP_URL==='https://veyra-3806.onrender.com'||process.env.RENDER_EXTERNAL_URL==='https://veyra-3806.onrender.com')throw Error('Cannot restore from production app environment');
const base=process.env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1';
const key=process.env.SUPABASE_SECRET_KEY;
const headers={apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key})};
const fetchBackup=async name=>{
 const parts=(BUCKET+'/'+name).split('/').map(encodeURIComponent).join('/');
 const response=await fetch(base+'/object/authenticated/'+parts,{headers,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Private backup read failed '+response.status);
 return Buffer.from(await response.arrayBuffer());
};
const manifestBytes=await fetchBackup(PREFIX+'manifest.json');
const checksums=await fetchBackup(PREFIX+'manifest.sha256');
if(checksums.toString('utf8').split(' ')[0]!==sha(manifestBytes))throw Error('Manifest mismatch');
const manifest=JSON.parse(manifestBytes);
if(manifest.id!==ID)throw Error('Wrong snapshot identifier');
const archiveBytes=await fetchBackup(manifest.database.key);
if(sha(archiveBytes)!==manifest.database.sha256)throw Error('Archive checksum mismatch');
const archive=JSON.parse(gunzipSync(archiveBytes).toString('utf8'));
if(archive.snapshot_id!==ID)throw Error('Wrong archive identifier');
for(const file of manifest.media.files){
 const bytes=await fetchBackup(file.backup_key);
 if(bytes.length!==file.bytes||sha(bytes)!==file.sha256)throw Error('Photo checksum mismatch');
}
const restoreSchema='stage0_restore_20261014';
const db=new pg.Client({connectionString:process.env.RESTORE_DATABASE_URL,ssl:{rejectUnauthorized:true}});
await db.connect();
try{
 await db.query('BEGIN');
 await db.query('CREATE SCHEMA IF NOT EXISTS '+restoreSchema);
 for(const [table,rows] of Object.entries(archive.data)){
  if(!/^[a-z_]+$/.test(table)||!archive.schema[table])throw Error('Untrusted table in backup');
  await db.query('CREATE TABLE IF NOT EXISTS '+restoreSchema+'."'+table+'" (LIKE veyra."'+table+'" INCLUDING DEFAULTS)');
  const before=await db.query('SELECT count(*)::int AS n FROM '+restoreSchema+'."'+table+'"');
  if(before.rows[0].n!==0)throw Error('Restore destination not empty: '+table);
  const raw='['+rows.join(',')+']';
  await db.query('INSERT INTO '+restoreSchema+'."'+table+'" SELECT * FROM jsonb_populate_recordset(NULL::veyra."'+table+'",$1::jsonb)',[raw]);
  const verified=(await db.query('SELECT to_jsonb(t)::text AS row FROM '+restoreSchema+'."'+table+'" t ORDER BY 1')).rows;
  const checksum=sha(Buffer.from(verified.map(x=>x.row).join('\n')+(verified.length?'\n':'')));
  if(checksum!==manifest.database.digests[table].sha256||verified.length!==manifest.database.digests[table].rows)throw Error('Restore rows mismatch: '+table);
 }
 await db.query('COMMIT');
 console.log(JSON.stringify({restored:true,id:ID,schema:restoreSchema,tables:Object.keys(archive.data).length,rows:manifest.database.rows,verified_media:manifest.media.files.length}));
}catch(e){
 await db.query('ROLLBACK');
 console.error('Isolated restore failed');
 process.exitCode=1;
}finally{await db.end();}
