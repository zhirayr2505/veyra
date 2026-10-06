import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {testDB,user,env,deps} from './helpers.js';
import {notifyReview} from '../server/domain.js';
import {drainOutbox} from '../server/bots.js';
import {telegram} from '../server/integrations.js';
let db;
before(async()=>{db=await testDB();await user(db,51,{moderation:'pending'});});
after(()=>db.close());
test('moderation card delivers private photo as binary to owner, with revision-bound action',async()=>{
 await db.tx(q=>notifyReview(q,env,'51'));
 const calls=[];await drainOutbox({...deps(db),tg:async(...args)=>calls.push(args)});
 assert.equal(calls.length,1);const[bot,method,body]=calls[0];
 assert.equal(bot,'admin');assert.equal(method,'sendPhoto');assert.equal(String(body.chat_id),env.OWNER_TELEGRAM_ID);
 assert.ok(Buffer.isBuffer(body.photo));assert.match(body.caption,/User 51/);
 assert.equal(body.reply_markup.inline_keyboard[1][0].callback_data,'approve:51:1');
 assert.equal(body.photo_id,undefined);
});
test('Telegram photo upload uses multipart data without publishing a storage URL',async(t)=>{
 let options;
 t.mock.method(globalThis,'fetch',async(url,o)=>{options=o;return Response.json({ok:true,result:{message_id:1}});});
 await telegram('local-test','sendPhoto',{chat_id:1,photo:Buffer.from('private image'),caption:'Profile',reply_markup:{inline_keyboard:[]}});
 assert.ok(options.body instanceof FormData);assert.equal(options.headers['content-type'],undefined);
 assert.equal(await options.body.get('photo').text(),'private image');
 assert.deepEqual(JSON.parse(options.body.get('reply_markup')),{inline_keyboard:[]});
});
