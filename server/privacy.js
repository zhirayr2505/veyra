import {one} from './db.js';
import {audit,notify} from './domain.js';
/* Safe to run on every instance: row locks make each finalization exactly once. */
export async function finalizeDueDeletions({db}){
 let processed=0;
 for(let i=0;i<12;i++){
  const done=await db.tx(async q=>{
   const u=await one(q,"SELECT id FROM users WHERE status='deleting' AND deletion_due_at<=now() ORDER BY deletion_due_at FOR UPDATE SKIP LOCKED LIMIT 1");
   if(!u)return false;
   const id=u.id;
   // Keep only conversation text and match identities for former partners.
   // Private user photos and authored media objects are scheduled for secure cleanup.
   await q.query('INSERT INTO storage_gc(object_key) SELECT object_key FROM photos WHERE user_id=$1 ON CONFLICT DO NOTHING',[id]);
   await q.query('INSERT INTO storage_gc(object_key) SELECT mm.object_key FROM message_media mm JOIN messages m ON m.id=mm.message_id WHERE m.sender=$1 ON CONFLICT DO NOTHING',[id]);
   await q.query('DELETE FROM message_media WHERE message_id IN (SELECT id FROM messages WHERE sender=$1)',[id]);
   await q.query('DELETE FROM photos WHERE user_id=$1',[id]);
   await q.query('DELETE FROM profiles WHERE user_id=$1',[id]);
   await q.query('DELETE FROM registration_drafts WHERE user_id=$1',[id]);
   await q.query('DELETE FROM sessions WHERE user_id=$1',[id]);
   await q.query('DELETE FROM today WHERE user_id=$1',[id]);
   await q.query('DELETE FROM impressions WHERE viewer=$1 OR target=$1',[id]);
   await q.query('DELETE FROM reactions WHERE actor=$1 OR target=$1',[id]);
   await q.query('DELETE FROM message_reactions WHERE user_id=$1',[id]);
   await q.query('DELETE FROM blocks WHERE actor=$1 OR target=$1',[id]);
   await q.query('DELETE FROM reports WHERE reporter=$1 OR target=$1',[id]);
   await q.query('DELETE FROM profile_hides WHERE actor=$1 OR target=$1',[id]);
   await q.query('DELETE FROM daily_usage WHERE user_id=$1',[id]);
   await q.query('DELETE FROM chat_presence WHERE user_id=$1',[id]);
   await q.query('DELETE FROM chat_pins WHERE user_id=$1',[id]);
   await q.query("UPDATE matches SET a_exchange=false,b_exchange=false,a_erased_at=CASE WHEN a=$1 THEN now() ELSE a_erased_at END,b_erased_at=CASE WHEN b=$1 THEN now() ELSE b_erased_at END WHERE a=$1 OR b=$1",[id]);
   await q.query("UPDATE users SET status='deleted',username=NULL,first_name='',notifications=false,paused=true,invisible=true,deletion_snapshot=NULL,premium_until=NULL,boost_until=NULL,superlikes=0,prematches=0,boosts=0 WHERE id=$1",[id]);
   await audit(q,id,'privacy.deletion_finalized',id,{retained:'conversation_text_for_participants'});
   await notify(q,id,'💔 Аккаунт VEYRA удалён. Твои фотографии и анкета удалены. Спасибо, что был частью нашей истории.');
   return true;
  });
  if(!done)break;processed++;
 }
 return processed;
}
