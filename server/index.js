import {database,migrate} from './db.js';
import {createClient} from 'redis';
import {normalizeRedis} from './core.js';
import {createApp} from './app.js';
import {storage as makeStorage,telegram,geo} from './integrations.js';
import {drainOutbox} from './bots.js';
import {finalizeDueDeletions} from './privacy.js';
import {setupBots} from '../scripts/setup-bots.js';
import {scheduleBotSetup} from './boot-bots.js';
/** @type {Record<string,string>} */
const env={USER_BOT_USERNAME:'VeyraAppBot',ADMIN_BOT_USERNAME:'VeyraAdminBot',OFFICIAL_CHANNEL_USERNAME:'VeyraDating',...process.env};
for(const k of ['USER_BOT_TOKEN','ADMIN_BOT_TOKEN','OWNER_TELEGRAM_ID','DATABASE_URL','REDIS_URL','GEOAPIFY_API_KEY','SUPABASE_URL','SUPABASE_SECRET_KEY'])if(!env[k])throw Error('Missing environment variable: '+k);
env.APP_URL=(env.APP_URL||env.RENDER_EXTERNAL_URL||'http://localhost:3000').replace(/\/$/,'');
const db=database(env.DATABASE_URL);const redis=createClient({url:normalizeRedis(env.REDIS_URL),socket:{connectTimeout:10000}});redis.on('error',()=>console.error('Redis unavailable'));
await redis.connect();await migrate(db);const storage=makeStorage(env);await storage.ensure();
const tg=(bot,method,body)=>telegram(bot==='admin'?env.ADMIN_BOT_TOKEN:env.USER_BOT_TOKEN,method,body);
// The explicitly requested launch reset was a one-time operation. Never replay on deploy.
const registrationReset={status:'retired'};
console.log(JSON.stringify({event:'registration_v2',reset:registrationReset.status}));
const testProfiles={status:'disabled_for_production'};
const deps={db,env,redis,storage,tg,geo:p=>geo(env,p),registrationReset,testProfiles};
// Bot configuration is asynchronous: Telegram API failures must not prevent Render from going live.
await finalizeDueDeletions({db});
const app=createApp(deps);const server=app.listen(Number(env.PORT||3000),'0.0.0.0',()=>console.log('VEYRA listening'));
const stopBotSetup=env.AUTO_SETUP_BOTS==='true'?scheduleBotSetup(()=>setupBots(env)):()=>{};
let draining=false;const timer=setInterval(async()=>{if(draining)return;draining=true;try{await drainOutbox(deps);}catch{console.error('Outbox retry scheduled');}finally{draining=false;}},5000);timer.unref();
setInterval(()=>db.query('DELETE FROM sessions WHERE expires_at<now()').catch(()=>{}),3600000).unref();
setInterval(()=>finalizeDueDeletions({db}).catch(e=>console.error('Privacy finalization retry scheduled',e?.code||'error')),60000).unref();
async function shutdown(){stopBotSetup();clearInterval(timer);server.close(async()=>{await redis.quit();await db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

