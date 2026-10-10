import {database,migrate} from './db.js';
import {createClient} from 'redis';
import {normalizeRedis} from './core.js';
import {createApp} from './app.js';
import {storage as makeStorage,telegram,geo} from './integrations.js';
import {drainOutbox} from './bots.js';
import {setupBots} from '../scripts/setup-bots.js';
import {seedTestProfiles} from './test-profiles.js';
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
if(env.AUTO_SETUP_BOTS==='true')await setupBots(env);
const app=createApp(deps);
// Owner-only synthetic QA fixtures are explicitly labelled and never served to real users.
// Do not block HTTP startup on uploads or reseed when the audit marker is present.
if(env.NODE_ENV==='production')seedTestProfiles(db,storage,env).then(x=>console.log(JSON.stringify({event:'owner_test_seed',status:x.status,count:x.count}))).catch(()=>console.error('Owner test fixture generation failed'));
const server=app.listen(Number(env.PORT||3000),'0.0.0.0',()=>console.log('VEYRA listening'));
let draining=false;const timer=setInterval(async()=>{if(draining)return;draining=true;try{await drainOutbox(deps);}catch{console.error('Outbox retry scheduled');}finally{draining=false;}},5000);timer.unref();
setInterval(()=>db.query('DELETE FROM sessions WHERE expires_at<now()').catch(()=>{}),3600000).unref();
async function shutdown(){clearInterval(timer);server.close(async()=>{await redis.quit();await db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

