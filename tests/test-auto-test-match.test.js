import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testDB,user} from './helpers.js';
import {seedTestProfiles} from '../server/test-profiles.js';
import {TEST_PROFILE_IDS} from '../server/test-profile-ids.js';
import {react} from '../server/domain.js';

test('synthetic test profile returns a like, creates a match and opens with a greeting',async()=>{
 const db=await testDB();
 try{
  await user(db,1);await db.query("UPDATE profiles SET gender='man',looking_for=ARRAY['woman'] WHERE user_id=1");
  const storage={put:async()=>{},remove:async()=>{}};
  await seedTestProfiles(db,storage,{APP_URL:'https://veyra-3806.onrender.com',RENDER_EXTERNAL_URL:'https://veyra-3806.onrender.com',OWNER_TELEGRAM_ID:'1'});
  const result=await db.tx(q=>react(q,'1',TEST_PROFILE_IDS[0],'like'));
  assert.equal(result.matched,true);assert.ok(result.match_id);
  const reaction=await db.query('SELECT kind FROM reactions WHERE actor=$1 AND target=$2',[TEST_PROFILE_IDS[0],'1']);assert.equal(reaction.rows[0].kind,'like');
  const message=await db.query('SELECT sender,body FROM messages WHERE match_id=$1',[result.match_id]);assert.equal(message.rows.length,1);assert.equal(String(message.rows[0].sender),TEST_PROFILE_IDS[0]);assert.match(message.rows[0].body,/Давай знакомиться/);
 }finally{await db.close();}
});
