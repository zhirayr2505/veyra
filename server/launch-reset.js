import {one} from './db.js';
import {audit} from './domain.js';

// No startup hook or HTTP route invokes this function. The operator must first
// create and restore-test independent Postgres AND Storage backups.
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
const datingTables=[
 'message_edits','message_hides','message_reactions','message_media',
 'chat_pins','chat_presence','match_views','courtships','messages','matches',
 'reactions','impressions','profile_hides','blocks','reports','daily_usage',
 'today','content_interests','review_bot_messages','registration_drafts',
 'sessions','photos','profiles'
];
// Only tables in the dating lifecycle. Do not touch orders, Telegram checkout
// confirmations, product catalogs, promotions, payment rights, gifts paid for,
// VEYS wallets/ledger/purchases, support tickets, feature flags or audit history.
/** @param {any} db @param {any} env @param {{backupManifest?: any}} [options] */
export async function applyRegistrationReset(db,env,{backupManifest}={}){
 if(env.APP_URL!==RESET_TARGET||env.RENDER_EXTERNAL_URL!==RESET_TARGET)
  return {id:RESET_ID,status:'not_applicable'};
 if(!verifiedBackupManifest(backupManifest))
  return {id:RESET_ID,status:'blocked_backup_required'};
 return db.tx(async q=>{
  // Serializes simultaneous maintenance invocations, independent of Render restarts.
  await q.query('SELECT pg_advisory_xact_lock(20261014)');
  const previous=await one(q,"SELECT created_at,metadata FROM audit_log WHERE action='registration.reset' AND subject=$1 ORDER BY id DESC LIMIT 1",[RESET_ID]);
  if(previous)return {id:RESET_ID,status:'completed',already_completed:true,completed_at:previous.created_at,deleted:previous.metadata?.deleted||{}};
  await q.query(`LOCK TABLE ${[...datingTables,'users','outbox','audit_log','storage_gc'].join(',')} IN ACCESS EXCLUSIVE MODE`);
  const deleted={};
  for(const table of datingTables)
   deleted[table]=(await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n;
  const retained={};
  for(const table of ['orders','veys_ledger','veys_wallets','veys_purchases','gifts','products','feature_flags','webhook_updates','promo_redemptions','audit_log'])
   retained[table]=(await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n;
  const photoQueue=await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos ON CONFLICT DO NOTHING');
  const chatQueue=await q.query('INSERT INTO storage_gc(object_key) SELECT DISTINCT object_key FROM message_media ON CONFLICT DO NOTHING');
  for(const table of datingTables)await q.query(`DELETE FROM ${table}`);
  // Only remove obsolete pending profile-review notifications. Financial outbox
  // events remain available for reconciliation and refunds.
  await q.query("DELETE FROM outbox WHERE payload ? 'review_user_id'");
  // Preserve user IDs and existing Premium/VEYS entitlements, purchases, refunds
  // and referrals already credited. Reauthentication will refresh Telegram data.
  await q.query(`UPDATE users SET username=NULL,first_name='',referrer_id=NULL,
   referral_rewarded=false,invisible=false,paused=false,deletion_snapshot=NULL`);
  for(const table of ['profiles','photos','registration_drafts','sessions','matches','messages']){
   if((await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n!==0)
    throw Error('RESET_POSTCONDITION_FAILED_'+table);
  }
  for(const [table,n] of Object.entries(retained)){
   if((await one(q,`SELECT count(*)::int AS n FROM ${table}`)).n!==n)
    throw Error('RESET_FINANCIAL_INVARIANT_'+table);
  }
  const queued=(photoQueue.rowCount||0)+(chatQueue.rowCount||0);
  await audit(q,env.OWNER_TELEGRAM_ID,'registration.reset',RESET_ID,{
   deleted,retained,storage_queued:queued,
   postgres_backup_id:backupManifest.postgres.id,
   storage_backup_id:backupManifest.storage.id,
   reason:'Owner approved one-time clean re-registration on 2026-10-14'
  });
  const result=await one(q,"SELECT created_at FROM audit_log WHERE action='registration.reset' AND subject=$1 ORDER BY id DESC LIMIT 1",[RESET_ID]);
  return {id:RESET_ID,status:'completed',completed_at:result.created_at,deleted,storage_queued:queued};
 });
}
