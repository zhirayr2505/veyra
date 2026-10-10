// Privacy erasure is transactional. Only non-sensitive payment receipts are retained
// for reconciliation and refunds, attached to an anonymized deleted-account tombstone.
import {one} from './db.js';
import {randomUUID} from 'node:crypto';
import {notify} from './domain.js';

export async function eraseAccount(q,uid){
 await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid]);
 // All participants lose the deleted match's messages and media.
 await q.query(`INSERT INTO storage_gc(object_key)
   SELECT mm.object_key FROM message_media mm JOIN messages m ON m.id=mm.message_id
   JOIN matches mt ON mt.id=m.match_id WHERE mt.a=$1 OR mt.b=$1
   ON CONFLICT DO NOTHING`,[uid]);
 await q.query('DELETE FROM messages WHERE match_id IN (SELECT id FROM matches WHERE a=$1 OR b=$1)',[uid]);
 await q.query('DELETE FROM chat_presence WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM courtships WHERE sender=$1 OR recipient=$1',[uid]);
 await q.query('DELETE FROM gifts WHERE sender=$1 OR recipient=$1',[uid]);
 await q.query('DELETE FROM matches WHERE a=$1 OR b=$1',[uid]);
 await q.query('DELETE FROM message_hides WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM message_reactions WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM support_messages WHERE sender=$1',[uid]);
 await q.query('DELETE FROM tickets WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM blocks WHERE actor=$1 OR target=$1',[uid]);
 await q.query('DELETE FROM reports WHERE reporter=$1 OR target=$1',[uid]);
 await q.query('DELETE FROM reactions WHERE actor=$1 OR target=$1',[uid]);
 await q.query('DELETE FROM impressions WHERE viewer=$1 OR target=$1',[uid]);
 await q.query('DELETE FROM profile_hides WHERE actor=$1 OR target=$1',[uid]);
 await q.query('DELETE FROM content_interests WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM daily_usage WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM boost_runs WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM promo_redemptions WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM today WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM registration_drafts WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM sessions WHERE user_id=$1',[uid]);
 await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos WHERE user_id=$1 ON CONFLICT DO NOTHING',[uid]);
 await q.query('DELETE FROM photos WHERE user_id=$1',[uid]);
 await q.query('DELETE FROM profiles WHERE user_id=$1',[uid]);
 await q.query("DELETE FROM orders WHERE user_id=$1 AND status<>'paid'",[uid]);
 await q.query('UPDATE broadcasts SET created_by=NULL WHERE created_by=$1',[uid]);
 await q.query('UPDATE users SET referrer_id=NULL WHERE referrer_id=$1',[uid]);
 await q.query('DELETE FROM outbox WHERE recipient=$1',[uid]);
 await q.query('DELETE FROM audit_log WHERE actor=$1',[uid]);
 await q.query(`UPDATE users SET status='deleted',username=NULL,first_name='',language='ru',
   notifications=false,invisible=false,paused=false,referrer_id=NULL,referral_rewarded=false,
   premium_until=NULL,boost_until=NULL,weekly_boost_at=NULL,superlikes=0,prematches=0,boosts=0,
   admin_role=NULL WHERE id=$1`,[uid]);
 await q.query("INSERT INTO audit_log(actor,action,subject) VALUES(NULL,'privacy.delete','account')");
 await notify(q,uid,'💔 Твой аккаунт VEYRA удалён. Все фото, анкета и переписки удалены. Если захочешь вернуться — открой приложение и зарегистрируйся заново.');
}

export async function reactivateDeleted(q,uid,user,owner){
 const changed=await one(q,`UPDATE users SET status='active',username=$2,first_name=$3,
   language=$4,created_at=now(),last_seen=now(),notifications=true,invisible=false,
   paused=false,referral_code=$5,referrer_id=NULL,referral_rewarded=false,
   premium_until=NULL,boost_until=NULL,weekly_boost_at=NULL,superlikes=0,prematches=0,boosts=0,
   admin_role=CASE WHEN $6 THEN 'owner' ELSE NULL END WHERE id=$1 AND status='deleted' RETURNING id`,
   [uid,user.username||null,user.first_name||'',user.language_code?.startsWith('ru')?'ru':'en',randomUUID().slice(0,12),owner]);
 return !!changed;
}
