import {audit} from './domain.js';
import {TEST_PROFILE_IDS} from './test-profile-ids.js';

/** Restart only the authenticated owner's interactions with VEYRA's reserved
 * fictional identities. Does not touch real matches, balances or purchases. */
export async function resetDemoInteractions(db,ownerId){
 const fixtures=TEST_PROFILE_IDS.map(String),owner=String(ownerId);
 return db.tx(async q=>{
  // Use the same ascending lock order as dating reactions to avoid races.
  await q.query('SELECT id FROM users WHERE id=$1 OR id=ANY($2::bigint[]) ORDER BY id FOR UPDATE',[owner,fixtures]);
  const matches=(await q.query(
   'SELECT id FROM matches WHERE (a=$1 AND b=ANY($2::bigint[])) OR (b=$1 AND a=ANY($2::bigint[])) FOR UPDATE',
   [owner,fixtures])).rows.map(r=>r.id);
  if(matches.length){
   // Chat media must enter the ordinary storage-GC queue before deleting messages.
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
  // Owner reports about fictional people also hide them from all discovery tabs.
  await q.query('DELETE FROM reports WHERE (reporter=$1 AND target=ANY($2::bigint[])) OR (target=$1 AND reporter=ANY($2::bigint[]))',[owner,fixtures]);
  await audit(q,owner,'owner.demo.reset',owner,{profiles:fixtures.length,matches:matches.length,reactions:reactions.rowCount});
  return {ok:true,profiles:fixtures.length,reset_matches:matches.length,reset_reactions:reactions.rowCount};
 });
}
