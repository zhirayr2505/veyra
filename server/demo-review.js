import {audit} from './domain.js';
import {TEST_PROFILE_IDS} from './test-profile-ids.js';

/** Only the owner's interactions with reserved synthetic identities are reset.
 * This never edits genuine likes, matches, photos, VEYS or purchases.
 * The in-transaction form lets the one-time gallery upgrade also reset safely.
 */
export async function resetDemoInteractionsInTransaction(q,ownerId,{source='manual'}={}){
 const fixtures=TEST_PROFILE_IDS.map(String),owner=String(ownerId);
 // Stable ascending lock order shared with dating reactions.
 await q.query('SELECT id FROM users WHERE id=$1 OR id=ANY($2::bigint[]) ORDER BY id FOR UPDATE',[owner,fixtures]);
 const matches=(await q.query(
  'SELECT id FROM matches WHERE (a=$1 AND b=ANY($2::bigint[])) OR (b=$1 AND a=ANY($2::bigint[])) FOR UPDATE',
  [owner,fixtures])).rows.map(r=>r.id);
 if(matches.length){
  await q.query(`INSERT INTO storage_gc(object_key)
   SELECT DISTINCT mm.object_key FROM message_media mm
   JOIN messages m ON m.id=mm.message_id
   WHERE m.match_id=ANY($1::uuid[]) ON CONFLICT DO NOTHING`,[matches]);
  await q.query('DELETE FROM courtships WHERE match_id=ANY($1::uuid[])',[matches]);
  await q.query('DELETE FROM messages WHERE match_id=ANY($1::uuid[])',[matches]);
  await q.query('DELETE FROM matches WHERE id=ANY($1::uuid[])',[matches]);
 }
 const reactions=await q.query(
  'DELETE FROM reactions WHERE (actor=$1 AND target=ANY($2::bigint[])) OR (target=$1 AND actor=ANY($2::bigint[]))',
  [owner,fixtures]);
 await q.query('DELETE FROM impressions WHERE viewer=$1 AND target=ANY($2::bigint[])',[owner,fixtures]);
 await q.query('DELETE FROM profile_hides WHERE actor=$1 AND target=ANY($2::bigint[])',[owner,fixtures]);
 await q.query('DELETE FROM blocks WHERE (actor=$1 AND target=ANY($2::bigint[])) OR (target=$1 AND actor=ANY($2::bigint[]))',[owner,fixtures]);
 await q.query('DELETE FROM reports WHERE (reporter=$1 AND target=ANY($2::bigint[])) OR (target=$1 AND reporter=ANY($2::bigint[]))',[owner,fixtures]);
 await audit(q,owner,source==='seed'?'owner.demo.auto_reset':'owner.demo.reset',owner,
  {profiles:fixtures.length,matches:matches.length,reactions:reactions.rowCount,source});
 return {ok:true,profiles:fixtures.length,reset_matches:matches.length,reset_reactions:reactions.rowCount};
}
export const resetDemoInteractions=(db,ownerId)=>
 db.tx(q=>resetDemoInteractionsInTransaction(q,ownerId));
