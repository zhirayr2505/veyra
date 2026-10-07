import {one} from './db.js';
import {audit} from './domain.js';

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
  const payments=await one(q,"SELECT enabled FROM feature_flags WHERE key='payments'");
  const money=await one(q,"SELECT 1 FROM orders WHERE status<>'pending' OR telegram_charge IS NOT NULL OR precheckout_id IS NOT NULL LIMIT 1");
  if(payments?.enabled||money)return {id:RESET_ID,status:'blocked_payment_history'};
  const counts=await one(q,'SELECT (SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM photos) AS photos,(SELECT count(*)::int FROM messages) AS messages');
  await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos ON CONFLICT DO NOTHING');
  for(const table of tables)await q.query(`DELETE FROM ${table}`);
  await q.query('UPDATE promos SET uses=0');
  await audit(q,env.OWNER_TELEGRAM_ID,'registration.reset',RESET_ID,{...counts,reason:'Owner requested clean registration for five-step onboarding',remaining_users:0});
  const result=await one(q,"SELECT created_at FROM audit_log WHERE action='registration.reset' AND subject=$1",[RESET_ID]);
  return {id:RESET_ID,status:'completed',completed_at:result.created_at};
 });
}
