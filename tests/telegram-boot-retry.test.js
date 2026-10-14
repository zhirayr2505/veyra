import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scheduleBotSetup} from '../server/boot-bots.js';

test('failed Telegram webhook setup retries without exiting or blocking HTTP startup',async()=>{
 const pending=[],warnings=[];
 const clock=(fn,ms)=>{const task={fn,ms,cancelled:false};pending.push(task);return task};
 let attempts=0;
 const stop=scheduleBotSetup(async()=>{
  attempts++;if(attempts===1)throw Object.assign(new Error('TELEGRAM_setWebhook_FAILED'),{code:'429'});
 },{setTimer:clock,clearTimer:x=>{x.cancelled=true},logger:{info(){},error(...x){warnings.push(x)}},initialDelayMs:0});
 assert.equal(attempts,0,'API server startup is not blocked');
 pending.shift().fn();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(attempts,1);assert.equal(warnings.length,1);
 assert.match(warnings[0][0],/web server remains available/);
 const retry=pending.shift();assert.equal(retry.ms,15000);
 retry.fn();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(attempts,2,'second attempt succeeds');assert.equal(pending.length,0);
 stop();
});

test('shutdown cancels a scheduled retry and never leaks Telegram tokens to logs',async()=>{
 const pending=[],errors=[];
 const stop=scheduleBotSetup(async()=>{throw new Error('setWebhook failed: secret telegram token');},
 {setTimer:(fn,ms)=>{const t={fn,ms,cancelled:false};pending.push(t);return t},clearTimer:t=>{t.cancelled=true},logger:{error:(...x)=>errors.push(x)}});
 pending.shift().fn();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(errors.length,1);
 assert.doesNotMatch(JSON.stringify(errors),/secret telegram token/);
 const retry=pending.shift();stop();assert.equal(retry.cancelled,true);
});

test('live app listens before bot setup; bot errors cannot fail Render boot',()=>{
 const index=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
 const listen=index.indexOf('const server=app.listen(');
 const config=index.indexOf('scheduleBotSetup(()=>setupBots(env))');
 assert.ok(listen>0&&config>listen);
 assert.doesNotMatch(index,/await setupBots\(env\)/);
 assert.match(index,/stopBotSetup\(\);clearInterval\(timer\)/);
});
