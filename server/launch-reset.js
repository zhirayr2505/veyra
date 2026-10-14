import {one} from './db.js';
import {audit} from './domain.js';

// Only the separately queued, privileged Stage 0 worker can invoke this.
// A verified private logical/Storage snapshot is a hard production prerequisite.
export const RESET_ID='registration-clean-2026-10-14-v1';
export const RESET_TARGET='https://veyra-3806.onrender.com';
const SHA256=/^[0-9a-f]{64}$/i;
const cleanArtifact=a=>a&&typeof a.id==='string'&&a.id.length>4&&
 SHA256.test(a.sha256||'')&&Number.isSafeInteger(a.bytes)&&a.bytes>0&&a.restore_tested===true;
export function verifiedBackupManifest(manifest){
 return !!(manifest&&cleanArtifact(manifest.postgres)&&cleanArtifact(manifest.storage)&&
  Number.isSafeInteger(manifest.storage.objects)&&manifest.storage.objects>0&&
  manifest.storage.objects_verified===manifest.storage.objects);
}
export const datingTables=[
 'message_edits','message_hides','message_reactions','message_media',
 'chat_pins','chat_presence','match_views','courtships','messages','matches',
 'reactions','impressions','profile_hides','blocks','reports','daily_usage',
 'today','content_interests','review_bot_messages','registration_drafts',
 'sessions','photos','profiles'
];
// Only tables in the dating lifecycle. Do not touch orders, Telegram checkout
// confirmations, product catalogs, promotions, payment rights, gifts paid for,
// VEYS wallets/ledger/purchases, support tickets, feature flags or audit history.
/** @param {any} db
 * @param {Record<string,string>} env
 * @param {{backupManifest?: any, expectedDating?: any, expectedFinance?: any}} [options]
 */
export async function applyRegistrationReset(db,env,{backupManifest,expectedDating,expectedFinance}={}){
 if(env.APP_URL!==RESET_TARGET||env.RENDER_EXTERNAL_URL!==RESET_TARGET)
  return {id:RESET_ID,status:'not_applicable'};
 if(!verifiedBackupManifest(backupManifest))
  return {id:RESET_ID,status:'blocked_backup_required'};
 if(env.NODE_ENV==='production'&&(!backupManifest?.verified_internally||!expectedDating||!expectedFinance))
  return {id:RESET_ID,status:'blocked_private_snapshot_required'};
 return db.tx(async q=>{
  // Serializes simultaneous maintenance invocations, independent of Render restarts.
  await q.query('SELECT pg_advisory_xact_lock(20261014)');
  const previous=await one(q,"SELECT created_at,metadata FROM audit_log WHERE action='registration.reset' AND subject=$1 ORDER BY id DESC LIMIT 1",[RESET_ID]);
  if(previous)return {id:RESET_ID,status:'completed',already_completed:true,completed_at:previous.created_at,deleted:previous.metadata?.deleted||{}};
  await q.query(`LOCK TABLE ${[...datingTables,'users','outbox','audit_log','storage_gc'].join(',')} IN ACCESS EXCLUSIVE MODE`);
  if(expectedDating&&expectedFinance){
   const {currentDigests,assertFinancialCheckpoint,FINANCIAL_TABLES}=await import('./stage0-snapshot.js');
   await q.query('LOCK TABLE '+FINANCIAL_TABLES.join(',')+' IN SHARE MODE');
   const current=await currentDigests(q,datingTables);
   for(const table of datingTables)if(JSON.stringify(current[table])!==JSON.stringify(expectedDating[table]))throw Error('STAGE0_DATING_DATA_CHANGED_'+table);
   await assertFinancialCheckpoint(q,expectedFinance);
  }
  // Paid courtships depend on deleted match rows; never silently destroy them.
  if((await one(q,"SELECT count(*)::int AS n FROM courtships WHERE order_id IS NOT NULL OR veys_cost>0 OR status IN ('active','payment_pending')")).n>0)
   throw Error('RESET_BLOCKED_FINANCIAL_COURTSHIP');
  // Deferred account deletion must complete without losing the 72h restore state.
  if((await one(q,"SELECT count(*)::int AS n FROM users WHERE status='deleting'")).n>0)
   throw Error('RESET_BLOCKED_PENDING_ACCOUNT_DELETION');
  const deleted={};
  for(const table of datingTables)
   deleted[table]=(await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n;
  const retained={};
  for(const table of ['orders','veys_ledger','veys_wallets','veys_purchases','gifts','products','feature_flags','webhook_updates','promo_redemptions','audit_log'])
   retained[table]=(await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n;
  const photoQueue=await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos ON CONFLICT DO NOTHING');
  const chatQueue=await q.query('INSERT INTO storage_gc(object_key) SELECT DISTINCT object_key FROM message_media ON CONFLICT DO NOTHING');
  for(const table of datingTables)await q.query(`DELETE FROM ${table}`);
  // No outbox or users UPDATE/DELETE: checkout events and financial identity
  // remain untouched; removing profiles/drafts is enough to restart onboarding.
  for(const table of ['profiles','photos','registration_drafts','sessions','matches','messages']){
   if((await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n!==0)
    throw Error('RESET_POSTCONDITION_FAILED_'+table);
  }
  for(const [table,n] of Object.entries(retained)){
   if((await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n!==n)
    throw Error('RESET_FINANCIAL_INVARIANT_'+table);
  }
  if(expectedFinance){const {assertFinancialCheckpoint}=await import('./stage0-snapshot.js');await assertFinancialCheckpoint(q,expectedFinance);}
  const queued=(photoQueue.rowCount||0)+(chatQueue.rowCount||0);
  await audit(q,env.OWNER_TELEGRAM_ID,'registration.reset',RESET_ID,{
   deleted,retained,storage_queued:queued,
   postgres_backup_id:backupManifest.postgres.id,
   storage_backup_id:backupManifest.storage.id,
   snapshot_manifest_sha256:backupManifest.storage.sha256,
   reason:'Owner approved one-time clean re-registration on 2026-10-14'
  });
  const result=await one(q,"SELECT created_at FROM audit_log WHERE action='registration.reset' AND subject=$1 ORDER BY id DESC LIMIT 1",[RESET_ID]);
  return {id:RESET_ID,status:'completed',completed_at:result.created_at,deleted,storage_queued:queued};
 });
}
