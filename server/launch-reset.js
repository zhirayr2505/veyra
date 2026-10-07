import {one} from './db.js';
import {audit} from './domain.js';
import {token} from './core.js';

// Owner explicitly requested deletion of ALL test registrations on 2026-10-07.
// Scoped to the existing test service; no HTTP reset endpoint or recurring reset.
export const RESET_ID='registration-v2-2026-10-07';
const TARGET='https://veyra-3806.onrender.com';
export async function applyRegistrationReset(db,env){
 if(env.APP_URL!==TARGET||env.RENDER_EXTERNAL_URL!==TARGET)return {status:'not_applicable'};
 return db.tx(async q=>{
  await q.query("SELECT key FROM feature_flags WHERE key='registrations' FOR UPDATE");
  const previous=await one(q,"SELECT created_at FROM audit_log WHERE action='registration.reset' AND subject=$1",[RESET_ID]);
  if(previous)return {id:RESET_ID,status:'completed',completed_at:previous.created_at};
  // Taking exclusive locks also waits for in-flight old-version writes/outbox sends.
  const tables=['messages','matches','reactions','impressions','daily_usage','blocks','reports','today','orders','tickets','promo_redemptions','sessions','registration_drafts','photos','profiles','outbox','users'];
  await q.query(`LOCK TABLE ${tables.join(',')} IN ACCESS EXCLUSIVE MODE`);
  const counts=await one(q,'SELECT (SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM photos) AS photos,(SELECT count(*)::int FROM messages) AS messages');
  await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos ON CONFLICT DO NOTHING');
  for(const table of tables.filter(t=>!['users','orders'].includes(t)))await q.query(`DELETE FROM ${table}`);
  // Unused invoices can be cancelled. Keep paid/refunded orders and checkouts
  // already accepted by Telegram so late settlement/refunds remain valid.
  await q.query("DELETE FROM orders WHERE status='pending' AND telegram_charge IS NULL AND precheckout_id IS NULL");
  await q.query('UPDATE users SET referrer_id=NULL');
  await q.query('DELETE FROM users WHERE NOT EXISTS(SELECT 1 FROM orders WHERE user_id=users.id)');
  const retained=(await q.query('SELECT id FROM users')).rows;
  for(const u of retained)await q.query(`UPDATE users SET username=NULL,first_name='',status='active',
   created_at=now(),last_seen=now(),referral_code=$2,referral_rewarded=false,invisible=false,paused=false
   WHERE id=$1`,[u.id,token().slice(0,12)]);
  await q.query('UPDATE promos SET uses=0');
  await audit(q,env.OWNER_TELEGRAM_ID,'registration.reset',RESET_ID,{...counts,reason:'Owner requested clean registration for five-step onboarding',remaining_profiles:0,retained_payment_accounts:retained.length});
  const result=await one(q,"SELECT created_at FROM audit_log WHERE action='registration.reset' AND subject=$1",[RESET_ID]);
  return {id:RESET_ID,status:'completed',completed_at:result.created_at};
 });
}
